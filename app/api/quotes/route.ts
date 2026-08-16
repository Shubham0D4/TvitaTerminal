import { NextRequest } from 'next/server'
import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser } from '@/lib/auth/server'
import { QuoteService } from '@/application/services/quote.service'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId') || ''

  if (!clientId) {
    return Errors.VALIDATION('clientId query parameter is required')
  }

  try {
    const quotes = await QuoteService.getQuotesList(clientId, user)
    return apiSuccess(quotes)
  } catch (error: any) {
    console.error('GET quotes error:', error)
    return Errors.INTERNAL(error.message || 'Failed to fetch quotes')
  }
}

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  try {
    const body = await request.json()
    const quote = await QuoteService.createQuote(body, user)
    return apiSuccess(quote, 201)
  } catch (error: any) {
    console.error('POST quote error:', error)
    if (error.name === 'ValidationError') {
      return Errors.VALIDATION(error.message)
    }
    return Errors.INTERNAL(error.message || 'Failed to create quote')
  }
}
