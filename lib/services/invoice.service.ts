import { InvoiceRepository } from '@/lib/repositories/invoice.repository'
import { invoiceToDTO } from '@/lib/dto/mappers'
import { writeAuditLog } from '@/lib/audit'
import { sendEmail, sendNewBillingInvoiceEmail } from '@/lib/email'
import { generateInvoicePdfBuffer } from '@/lib/pdf/invoice-generator'
import { uploadToSupabaseStorage } from '@/lib/supabase/storage'
import { getAppBaseUrl } from '@/lib/utils/url'
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'

const STATE_CODE_MAP: Record<string, string> = {
  'JAMMU AND KASHMIR': '01',
  'HIMACHAL PRADESH': '02',
  'PUNJAB': '03',
  'CHANDIGARH': '04',
  'UTTARAKHAND': '05',
  'HARYANA': '06',
  'DELHI': '07',
  'RAJASTHAN': '08',
  'UTTAR PRADESH': '09',
  'BIHAR': '10',
  'SIKKIM': '11',
  'ARUNACHAL PRADESH': '12',
  'NAGALAND': '13',
  'MANIPUR': '14',
  'MIZORAM': '15',
  'TRIPURA': '16',
  'MEGHALAYA': '17',
  'ASSAM': '18',
  'WEST BENGAL': '19',
  'JHARKHAND': '20',
  'ODISHA': '21',
  'CHHATTISGARH': '22',
  'MADHYA PRADESH': '23',
  'GUJARAT': '24',
  'DADRA AND NAGAR HAVELI AND DAMAN AND DIU': '26',
  'MAHARASHTRA': '27',
  'ANDHRA PRADESH': '37',
  'KARNATAKA': '29',
  'GOA': '30',
  'LAKSHADWEEP': '31',
  'KERALA': '32',
  'TAMIL NADU': '33',
  'PUDUCHERRY': '34',
  'ANDAMAN AND NICOBAR ISLANDS': '35',
  'TELANGANA': '36',
  'LADAKH': '38',
}

function resolveStateCode(stateName?: string | null, gstin?: string | null): string {
  if (gstin && gstin.trim().length >= 2) {
    const code = gstin.trim().substring(0, 2)
    if (/^\d{2}$/.test(code)) return code
  }
  if (!stateName) return '27'
  const upper = stateName.trim().toUpperCase()
  return STATE_CODE_MAP[upper] || '27'
}

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
      poNumber?: string
      discountAmount?: number
      taxType?: 'INTRA_STATE' | 'INTER_STATE' | 'EXPORT'
      placeOfSupply?: string
      reverseCharge?: boolean
      status?: 'PENDING' | 'PAID' | 'DRAFT' | 'OVERDUE'
      lineItems: Array<{ description: string; sacCode?: string; quantity: number; rate: number; amount: number }>
      currency?: string
    },
    actor: { id: string; email: string; role: string }
  ) {
    const { clientId, projectId, issuedDate, dueDate, notes, lineItems, currency = 'INR', poNumber, reverseCharge = false, status: initialStatus = 'PENDING' } = body

    if (!clientId || !Array.isArray(lineItems) || lineItems.length === 0) {
      throw new ValidationError('clientId and at least one line item are required')
    }

    const settings = await prisma.appSettings.findFirst()
    const client = await prisma.client.findUnique({ where: { id: clientId } })

    const subtotal = lineItems.reduce((acc, item) => acc + (Number(item.amount) || Number(item.quantity * item.rate) || 0), 0)
    const discountAmount = Number(body.discountAmount || 0)
    const taxableAmount = Math.max(0, subtotal - discountAmount)

    const supplierStateCode = settings?.companyStateCode || resolveStateCode(settings?.companyState, settings?.companyGstin)
    const clientCountry = client?.billingCountry || client?.country || 'IN'
    const clientStateCode = resolveStateCode(client?.billingState || client?.stateProvince, client?.gstin)

    let taxType = body.taxType
    if (!taxType) {
      if (clientCountry.toUpperCase() !== 'IN') {
        taxType = 'EXPORT'
      } else if (clientStateCode === supplierStateCode) {
        taxType = 'INTRA_STATE'
      } else {
        taxType = 'INTER_STATE'
      }
    }

    const numericTaxRate = taxType === 'EXPORT' ? 0 : Number(body.taxRate ?? settings?.taxRate ?? 18)

    let cgstAmount = 0
    let sgstAmount = 0
    let igstAmount = 0
    let taxAmount = 0

    if (taxType === 'INTRA_STATE') {
      cgstAmount = (taxableAmount * (numericTaxRate / 2)) / 100
      sgstAmount = (taxableAmount * (numericTaxRate / 2)) / 100
      taxAmount = cgstAmount + sgstAmount
    } else if (taxType === 'INTER_STATE') {
      igstAmount = (taxableAmount * numericTaxRate) / 100
      taxAmount = igstAmount
    }

    const amount = taxableAmount + taxAmount
    const isPaidInitial = initialStatus === 'PAID'
    const amountPaid = isPaidInitial ? amount : 0
    const amountDue = isPaidInitial ? 0 : amount
    const paidDate = isPaidInitial ? new Date() : null

    const placeOfSupply = body.placeOfSupply || (taxType === 'EXPORT' ? 'International — Export' : `${client?.billingState || client?.stateProvince || 'Maharashtra'} — ${clientStateCode}`)

    // Concurrency-safe unique sequence number generation inside transaction retry loop
    let invoiceNo = ''
    let createdInvoice: any = null
    let attempts = 0
    const maxAttempts = 3

    while (attempts < maxAttempts) {
      try {
        attempts++
        createdInvoice = await prisma.$transaction(async (tx) => {
          const appSettings = await tx.appSettings.findFirst()
          const prefix = appSettings?.invoicePrefix ?? 'INV'
          const count = await tx.invoice.count()
          const year = new Date().getFullYear()
          invoiceNo = `${prefix}-${year}-${String(count + attempts).padStart(3, '0')}`

          return tx.invoice.create({
            data: {
              invoiceNo,
              clientId,
              projectId: projectId || null,
              subtotal,
              discountAmount,
              taxType,
              taxRate: numericTaxRate,
              cgstAmount,
              sgstAmount,
              igstAmount,
              taxAmount,
              amount,
              amountPaid,
              amountDue,
              currency,
              status: initialStatus as any,
              paidDate,
              issuedDate: issuedDate ? new Date(issuedDate) : new Date(),
              dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              notes: notes || null,
              poNumber: poNumber || null,
              placeOfSupply,
              reverseCharge,
              lineItems: lineItems as any,
              createdById: actor.id,
            },
          })
        })
        break
      } catch (error: any) {
        if (error.code === 'P2002' && attempts < maxAttempts) {
          console.warn(`[InvoiceService] Sequence collision on attempt ${attempts}. Retrying...`)
          continue
        }
        throw error
      }
    }

    if (!createdInvoice) {
      throw new ConflictError('Could not generate a unique invoice sequence number. Please try again.')
    }

    // Generate PDF & send automatic email with PDF attachment
    try {
      if (client) {
        const clientEmail = client.billingEmail || client.email
        const project = projectId ? await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, name: true } }) : null

        const pdfBuffer = await generateInvoicePdfBuffer({
          invoiceNumber: createdInvoice.invoiceNo,
          clientName: client.name,
          clientLegalName: client.legalName || undefined,
          clientEmail: clientEmail || '',
          clientAddress: client.registeredAddress || client.address || undefined,
          clientGstin: client.gstin || undefined,
          clientState: client.billingState || client.stateProvince || undefined,
          clientStateCode,
          date: createdInvoice.issuedDate ? new Date(createdInvoice.issuedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN'),
          dueDate: createdInvoice.dueDate ? new Date(createdInvoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined,
          status: createdInvoice.status,
          projectName: project?.name,
          projectId: project?.id,
          poNumber: createdInvoice.poNumber || undefined,
          lineItems: (createdInvoice.lineItems as any) || [],
          subtotal: Number(createdInvoice.subtotal),
          discountAmount: Number(createdInvoice.discountAmount),
          taxableAmount,
          taxType: createdInvoice.taxType,
          taxRate: Number(createdInvoice.taxRate),
          cgstAmount: Number(createdInvoice.cgstAmount),
          sgstAmount: Number(createdInvoice.sgstAmount),
          igstAmount: Number(createdInvoice.igstAmount),
          taxAmount: Number(createdInvoice.taxAmount),
          totalAmount: Number(createdInvoice.amount),
          amountPaid: Number(createdInvoice.amountPaid),
          amountDue: Number(createdInvoice.amountDue),
          currency: createdInvoice.currency || 'INR',
          placeOfSupply: createdInvoice.placeOfSupply || undefined,
          reverseCharge: createdInvoice.reverseCharge,
          notes: createdInvoice.notes || undefined,
          // Supplier details from settings
          companyName: settings?.companyName || 'Tvita',
          companyEmail: settings?.companyEmail || 'billing@tvita.dev',
          companyPhone: settings?.companyPhone || undefined,
          companyAddress: settings?.companyAddress || undefined,
          companyGstin: settings?.companyGstin || undefined,
          companyPan: settings?.companyPan || undefined,
          companyState: settings?.companyState || undefined,
          companyStateCode: supplierStateCode,
          bankName: settings?.bankName || undefined,
          bankAccount: settings?.bankAccount || undefined,
          bankIfsc: settings?.bankIfsc || undefined,
          bankBranch: settings?.bankBranch || undefined,
          bankUpiId: settings?.bankUpiId || undefined,
        })

        let pdfPath: string | null = null
        try {
          pdfPath = await uploadToSupabaseStorage({
            filePath: `invoices/invoice-${createdInvoice.id}.pdf`,
            fileBuffer: pdfBuffer,
            contentType: 'application/pdf',
          })
          if (pdfPath) {
            await prisma.invoice.update({
              where: { id: createdInvoice.id },
              data: { pdfUrl: pdfPath },
            })
            createdInvoice.pdfUrl = pdfPath
          }
        } catch (storageErr) {
          console.warn('[InvoiceService] Supabase PDF upload skipped/failed:', storageErr)
        }

        if (clientEmail) {
          const appUrl = getAppBaseUrl()
          await sendNewBillingInvoiceEmail({
            to: clientEmail,
            clientName: client.name,
            invoiceNumber: createdInvoice.invoiceNo,
            amount: `${createdInvoice.currency || 'INR'} ${Number(createdInvoice.amount).toLocaleString('en-IN')}`,
            dueDate: createdInvoice.dueDate ? new Date(createdInvoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined,
            pdfBuffer,
            pdfFilename: `${createdInvoice.invoiceNo}.pdf`,
            portalUrl: `${appUrl}/client/invoices/${createdInvoice.id}`,
          })
        }
      }
    } catch (pdfEmailErr) {
      console.error('[InvoiceService] Auto PDF generation or email dispatch failed:', pdfEmailErr)
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

    const amountPaid = isPaid ? invoice.amount : 0
    const amountDue = isPaid ? 0 : invoice.amount

    const updated = await InvoiceRepository.update(id, {
      status: (status as any) ?? invoice.status,
      paidDate: isPaid ? (paidDate ? new Date(paidDate) : new Date()) : (status && status !== 'PAID' ? null : invoice.paidDate),
      notes: notes !== undefined ? notes : invoice.notes,
      amountPaid,
      amountDue,
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
      <p>Best regards,<br/>Tvita</p>
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
