import { NextRequest } from 'next/server'
import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { getServerUser } from '@/lib/auth/server'
import { QuoteService } from '@/lib/services/quote.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  const { quoteId } = await params

  try {
    const quote = await QuoteService.getQuoteById(quoteId, user)
    return apiSuccess(quote)
  } catch (error: unknown) {
    console.error('GET quote error:', error)
    return fromUnknownError(error, 'Failed to fetch quote')
  }
}

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
  } catch (error: unknown) {
    console.error('PATCH quote error:', error)
    return fromUnknownError(error, 'Failed to update quote')
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
  } catch (error: unknown) {
    console.error('DELETE quote error:', error)
    return fromUnknownError(error, 'Failed to delete quote')
  }
}
