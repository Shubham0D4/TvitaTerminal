import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { InvoiceService } from '@/application/services/invoice.service'
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
    const result = await InvoiceService.sendInvoiceReminder(id, user)
    return apiSuccess(result)
  } catch (error: any) {
    console.error('Send invoice reminder API error:', error)
    if (error.name === 'NotFoundError') {
      return Errors.NOT_FOUND(error.message)
    }
    if (error.name === 'ValidationError') {
      return Errors.VALIDATION(error.message)
    }
    return Errors.INTERNAL('Failed to send invoice reminder')
  }
}
