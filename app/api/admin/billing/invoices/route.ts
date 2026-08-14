import { apiSuccess, Errors } from '@/lib/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || ''
  const clientId = searchParams.get('clientId') || ''

  try {
    const where: any = {}
    if (status) where.status = status
    if (clientId) where.clientId = clientId

    const [invoices, totalCount, paidInvoices, pendingInvoices] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, legalName: true, email: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.invoice.count(),
      prisma.invoice.findMany({ where: { status: 'PAID' } }),
      prisma.invoice.findMany({ where: { status: { in: ['PENDING', 'DRAFT', 'OVERDUE'] } } }),
    ])

    const totalPaidAmount = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)
    const totalPendingAmount = pendingInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)

    return apiSuccess({
      invoices,
      stats: {
        totalCount,
        totalPaidAmount,
        totalPendingAmount,
        paidCount: paidInvoices.length,
        pendingCount: pendingInvoices.length,
      },
    })
  } catch (error) {
    console.error('Admin billing GET API error:', error)
    return Errors.INTERNAL('Failed to fetch invoices')
  }
}

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const body = await request.json()
    const { clientId, projectId, issuedDate, dueDate, notes, taxRate = 18, lineItems } = body

    if (!clientId || !issuedDate || !dueDate || !Array.isArray(lineItems) || lineItems.length === 0) {
      return Errors.VALIDATION('clientId, issuedDate, dueDate, and at least one line item are required')
    }

    const subtotal = lineItems.reduce((acc: number, item: any) => acc + (Number(item.amount) || Number(item.qty * item.rate) || 0), 0)
    const numericTaxRate = Number(taxRate)
    const taxAmount = (subtotal * numericTaxRate) / 100
    const amount = subtotal + taxAmount

    const settings = await prisma.appSettings.findFirst()
    const prefix = settings?.invoicePrefix ?? 'INV'

    const count = await prisma.invoice.count()
    const year = new Date().getFullYear()
    const invoiceNo = `${prefix}-${year}-${String(count + 1).padStart(3, '0')}`

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        clientId,
        projectId: projectId || null,
        subtotal,
        taxRate: numericTaxRate,
        taxAmount,
        amount,
        currency: settings?.currency ?? 'INR',
        status: 'PENDING',
        issuedDate: new Date(issuedDate),
        dueDate: new Date(dueDate),
        notes: notes || null,
        lineItems: lineItems as any,
        createdById: user.id,
      },
    })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'CREATE',
      entityType: 'invoice',
      entityId: invoice.id,
      entityLabel: invoice.invoiceNo,
      newValue: { amount, status: invoice.status },
    })

    return apiSuccess(invoice, 201)
  } catch (error) {
    console.error('Admin billing POST API error:', error)
    return Errors.INTERNAL('Failed to create invoice')
  }
}
