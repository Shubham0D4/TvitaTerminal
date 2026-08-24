import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { InvoiceService } from '@/lib/services/invoice.service'
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
    const result = await InvoiceService.getInvoiceDetails(id)
    return apiSuccess(result)
  } catch (error: any) {
    console.error('Admin invoice GET API error:', error)
    if (error.name === 'NotFoundError') {
      return Errors.NOT_FOUND(error.message)
    }
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
    const body = await request.json()
    const result = await InvoiceService.updateInvoice(id, body, user)
    return apiSuccess(result)
  } catch (error: any) {
    console.error('Admin invoice PUT API error:', error)
    if (error.name === 'NotFoundError') {
      return Errors.NOT_FOUND(error.message)
    }
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
    const result = await InvoiceService.deleteInvoice(id, user)
    return apiSuccess(result)
  } catch (error: any) {
    console.error('Admin invoice DELETE API error:', error)
    if (error.name === 'NotFoundError') {
      return Errors.NOT_FOUND(error.message)
    }
    return Errors.INTERNAL('Failed to delete invoice')
  }
}
