import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { InvoiceService } from '@/lib/services/invoice.service'
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
    const result = await InvoiceService.getInvoicesList({ status, clientId })
    return apiSuccess(result)
  } catch (error: any) {
    console.error('Admin billing GET API error:', error)
    return Errors.INTERNAL(error.message || 'Failed to fetch invoices')
  }
}

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const body = await request.json()
    let { clientId, projectId, issuedDate, dueDate, notes, taxRate = 18, lineItems, lineItemsJson, currency, poNumber, discountAmount, taxType, placeOfSupply, reverseCharge, status } = body

    if (!lineItems && typeof lineItemsJson === 'string') {
      try {
        lineItems = JSON.parse(lineItemsJson)
      } catch (e) {}
    }

    const result = await InvoiceService.createInvoice(
      {
        clientId,
        projectId,
        issuedDate,
        dueDate,
        notes,
        taxRate,
        lineItems,
        currency,
        poNumber,
        discountAmount,
        taxType,
        placeOfSupply,
        reverseCharge,
        status,
      },
      user
    )

    return apiSuccess(result, 201)
  } catch (error: any) {
    console.error('Admin billing POST API error:', error)
    if (error.name === 'ValidationError') {
      return Errors.VALIDATION(error.message)
    }
    if (error.name === 'ConflictError') {
      return Errors.CONFLICT(error.message)
    }
    return Errors.INTERNAL(error.message || 'Failed to create invoice')
  }
}
