import { NextRequest } from 'next/server'
import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser } from '@/lib/auth/server'
import { QuoteService } from '@/application/services/quote.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  const { quoteId } = await params

  try {
    const body = await request.json()
    const quote = await QuoteService.updateQuote(quoteId, body, user)
    return apiSuccess(quote)
  } catch (error: any) {
    console.error('PATCH quote error:', error)
    if (error.name === 'ValidationError') {
      return Errors.VALIDATION(error.message)
    }
    if (error.name === 'NotFoundError') {
      return Errors.NOT_FOUND(error.message)
    }
    return Errors.INTERNAL(error.message || 'Failed to update quote')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  const { quoteId } = await params

  try {
    const result = await QuoteService.deleteQuote(quoteId, user)
    return apiSuccess(result)
  } catch (error: any) {
    console.error('DELETE quote error:', error)
    if (error.name === 'NotFoundError') {
      return Errors.NOT_FOUND(error.message)
    }
    return Errors.INTERNAL(error.message || 'Failed to delete quote')
  }
}
