import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { sendEmail } from '@/infrastructure/email'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function POST(
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
      include: { client: true },
    })

    if (!invoice || !invoice.client) {
      return Errors.NOT_FOUND('Invoice or client')
    }

    const recipientEmail = invoice.client.billingEmail || invoice.client.email
    if (!recipientEmail) {
      return Errors.VALIDATION('Client has no valid email address')
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const invoiceUrl = `${appUrl}/client/invoices/${invoice.id}`

    const html = `
      <h2>Invoice ${invoice.invoiceNo}</h2>
      <p>Dear ${invoice.client.contactPerson || invoice.client.name},</p>
      <p>Your invoice <strong>${invoice.invoiceNo}</strong> for ${invoice.currency} ${Number(invoice.amount).toFixed(2)} is ready.</p>
      <p><a href="${invoiceUrl}">View & Pay Invoice</a></p>
    `

    await sendEmail({
      to: recipientEmail,
      subject: `Invoice ${invoice.invoiceNo} from Tvita`,
      html,
    })

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: 'PENDING' },
    })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'UPDATE',
      entityType: 'invoice',
      entityId: id,
      entityLabel: invoice.invoiceNo,
      newValue: { status: 'PENDING', sentTo: recipientEmail },
    })

    return apiSuccess({ sent: true, invoice: updated })
  } catch (error) {
    console.error('Send invoice email API error:', error)
    return Errors.INTERNAL('Failed to send invoice email')
  }
}
