import { apiSuccess, Errors } from '@/lib/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        project: { select: { id: true, name: true } },
      },
    })

    if (!invoice) {
      return Errors.NOT_FOUND('Invoice')
    }

    const settings = await prisma.appSettings.findFirst()

    return apiSuccess({ invoice, settings })
  } catch (error) {
    console.error('Admin invoice GET API error:', error)
    return Errors.INTERNAL('Failed to fetch invoice details')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const invoice = await prisma.invoice.findUnique({ where: { id } })
    if (!invoice) {
      return Errors.NOT_FOUND('Invoice')
    }

    const body = await request.json()
    const { status, paidDate, notes } = body

    const isPaid = status === 'PAID'

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: status ?? invoice.status,
        paidDate: isPaid ? (paidDate ? new Date(paidDate) : new Date()) : (status && status !== 'PAID' ? null : invoice.paidDate),
        notes: notes !== undefined ? notes : invoice.notes,
      },
    })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: isPaid ? 'PAYMENT' : 'UPDATE',
      entityType: 'invoice',
      entityId: id,
      entityLabel: invoice.invoiceNo,
      oldValue: { status: invoice.status },
      newValue: { status: updated.status },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Admin invoice PUT API error:', error)
    return Errors.INTERNAL('Failed to update invoice')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const invoice = await prisma.invoice.findUnique({ where: { id } })
    if (!invoice) {
      return Errors.NOT_FOUND('Invoice')
    }

    await prisma.invoice.delete({ where: { id } })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'DELETE',
      entityType: 'invoice',
      entityId: id,
      entityLabel: invoice.invoiceNo,
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('Admin invoice DELETE API error:', error)
    return Errors.INTERNAL('Failed to delete invoice')
  }
}
