import { InvoiceRepository } from '@/infrastructure/database/repositories/invoice.repository'
import { invoiceToDTO } from '@/contracts/dto/dto-mappers'
import { writeAuditLog } from '@/lib/audit'
import { sendEmail } from '@/infrastructure/email'
import { getAppBaseUrl } from '@/shared/utilities/url'
import { ValidationError, NotFoundError, ConflictError } from '@/shared/errors/application-errors'
import { prisma } from '@/lib/prisma'

export class InvoiceService {
  static async getInvoicesList(params: { status?: string; clientId?: string }) {
    const where: any = {}
    if (params.status) where.status = params.status
    if (params.clientId) where.clientId = params.clientId

    const [invoices, totalCount, paidInvoices, pendingInvoices] = await Promise.all([
      InvoiceRepository.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, legalName: true, email: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      InvoiceRepository.count(),
      InvoiceRepository.findMany({ where: { status: 'PAID' } }),
      InvoiceRepository.findMany({ where: { status: { in: ['PENDING', 'DRAFT', 'OVERDUE'] } } }),
    ])

    const totalPaidAmount = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)
    const totalPendingAmount = pendingInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)

    return {
      invoices: invoices.map(invoiceToDTO),
      stats: {
        totalCount,
        totalPaidAmount,
        totalPendingAmount,
        paidCount: paidInvoices.length,
        pendingCount: pendingInvoices.length,
      },
    }
  }

  static async getInvoiceDetails(id: string) {
    const invoice = await InvoiceRepository.findById(id, {
      client: true,
      project: { select: { id: true, name: true } },
    })

    if (!invoice) {
      throw new NotFoundError('Invoice not found')
    }

    const settings = await InvoiceRepository.findAppSettings()

    return {
      invoice: invoiceToDTO(invoice),
      settings,
    }
  }

  static async createInvoice(
    body: {
      clientId: string
      projectId?: string
      issuedDate?: string
      dueDate?: string
      notes?: string
      taxRate?: number
      lineItems: Array<{ description: string; quantity: number; rate: number; amount: number }>
      currency?: string
    },
    actor: { id: string; email: string; role: string }
  ) {
    const { clientId, projectId, issuedDate, dueDate, notes, taxRate = 18, lineItems, currency = 'INR' } = body

    if (!clientId || !Array.isArray(lineItems) || lineItems.length === 0) {
      throw new ValidationError('clientId and at least one line item are required')
    }

    const subtotal = lineItems.reduce((acc, item) => acc + (Number(item.amount) || Number(item.quantity * item.rate) || 0), 0)
    const numericTaxRate = Number(taxRate)
    const taxAmount = (subtotal * numericTaxRate) / 100
    const amount = subtotal + taxAmount

    // Concurrency-safe unique sequence number generation inside transaction retry loop
    let invoiceNo = ''
    let createdInvoice = null
    let attempts = 0
    const maxAttempts = 3

    while (attempts < maxAttempts) {
      try {
        attempts++
        createdInvoice = await prisma.$transaction(async (tx) => {
          const settings = await tx.appSettings.findFirst()
          const prefix = settings?.invoicePrefix ?? 'INV'
          const count = await tx.invoice.count()
          const year = new Date().getFullYear()
          invoiceNo = `${prefix}-${year}-${String(count + attempts).padStart(3, '0')}`

          return tx.invoice.create({
            data: {
              invoiceNo,
              clientId,
              projectId: projectId || null,
              subtotal,
              taxRate: numericTaxRate,
              taxAmount,
              amount,
              currency,
              status: 'PENDING',
              issuedDate: issuedDate ? new Date(issuedDate) : new Date(),
              dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              notes: notes || null,
              lineItems: lineItems as any,
              createdById: actor.id,
            },
          })
        })
        break
      } catch (error: any) {
        if (error.code === 'P2002' && attempts < maxAttempts) {
          // Unique constraint violation (duplicate invoiceNo), loop and retry
          console.warn(`[InvoiceService] Sequence collision on attempt ${attempts}. Retrying...`)
          continue
        }
        throw error
      }
    }

    if (!createdInvoice) {
      throw new ConflictError('Could not generate a unique invoice sequence number. Please try again.')
    }

    await writeAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'CREATE',
      entityType: 'invoice',
      entityId: createdInvoice.id,
      entityLabel: createdInvoice.invoiceNo,
      newValue: { invoiceNo: createdInvoice.invoiceNo, amount: createdInvoice.amount },
    })

    return invoiceToDTO(createdInvoice)
  }

  static async updateInvoice(
    id: string,
    body: { status?: string; paidDate?: string; notes?: string },
    actor: { id: string; email: string; role: string }
  ) {
    const invoice = await InvoiceRepository.findById(id)
    if (!invoice) {
      throw new NotFoundError('Invoice not found')
    }

    const { status, paidDate, notes } = body
    const isPaid = status === 'PAID'

    const updated = await InvoiceRepository.update(id, {
      status: (status as any) ?? invoice.status,
      paidDate: isPaid ? (paidDate ? new Date(paidDate) : new Date()) : (status && status !== 'PAID' ? null : invoice.paidDate),
      notes: notes !== undefined ? notes : invoice.notes,
    })

    await writeAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: isPaid ? 'PAYMENT' : 'UPDATE',
      entityType: 'invoice',
      entityId: id,
      entityLabel: invoice.invoiceNo,
      oldValue: { status: invoice.status },
      newValue: { status: updated.status },
    })

    return invoiceToDTO(updated)
  }

  static async deleteInvoice(id: string, actor: { id: string; email: string; role: string }) {
    const invoice = await InvoiceRepository.findById(id)
    if (!invoice) {
      throw new NotFoundError('Invoice not found')
    }

    await InvoiceRepository.delete(id)

    await writeAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'DELETE',
      entityType: 'invoice',
      entityId: id,
      entityLabel: invoice.invoiceNo,
    })

    return { deleted: true }
  }

  static async sendInvoiceReminder(id: string, actor: { id: string; email: string; role: string }) {
    const invoice = await InvoiceRepository.findById(id, { client: true })
    if (!invoice || !invoice.client) {
      throw new NotFoundError('Invoice or client not found')
    }

    const recipientEmail = invoice.client.billingEmail || invoice.client.email
    if (!recipientEmail) {
      throw new ValidationError('Client has no valid email address configured')
    }

    const appUrl = getAppBaseUrl()
    const invoiceUrl = `${appUrl}/client/invoices/${invoice.id}`

    const html = `
      <h2>Invoice Payment Reminder: ${invoice.invoiceNo}</h2>
      <p>Dear ${invoice.client.contactPerson || invoice.client.name},</p>
      <p>This is a friendly reminder that invoice <strong>${invoice.invoiceNo}</strong> of <strong>${invoice.currency} ${Number(invoice.amount).toFixed(2)}</strong> is currently pending/due.</p>
      <p>Please click the link below to view the invoice details and complete your payment:</p>
      <p style="margin: 20px 0;">
        <a href="${invoiceUrl}" style="background-color: #6366f1; color: white; padding: 10px 16px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          View & Pay Invoice
        </a>
      </p>
      <p>Thank you for your business!</p>
      <p>Best regards,<br/>Tvita Digital Agency</p>
    `

    await sendEmail({
      to: recipientEmail,
      subject: `Payment Reminder: Invoice ${invoice.invoiceNo}`,
      html,
    })

    await writeAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'UPDATE',
      entityType: 'invoice',
      entityId: id,
      entityLabel: invoice.invoiceNo,
      newValue: { reminded: true, sentTo: recipientEmail },
    })

    return { reminded: true }
  }

  static async getClientInvoices(clientId: string) {
    const invoices = await InvoiceRepository.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
      },
    })
    return invoices.map(invoiceToDTO)
  }
}
