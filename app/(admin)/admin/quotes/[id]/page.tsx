import { getServerUser, isAdmin, redirectToLogin, redirectToPortal } from '@/lib/auth/server'
import { notFound } from 'next/navigation'
import { QuoteService } from '@/lib/services/quote.service'
import QuoteDetail from './QuoteDetail'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const user = await getServerUser()
    if (!user) return { title: 'Quote — Tvita Admin' }
    const quote = await QuoteService.getQuoteById(id, user)
    return {
      title: `${quote.title} — Quotes`,
      description: 'Quote request, negotiation history, and response.',
    }
  } catch {
    return { title: 'Quote — Tvita Admin' }
  }
}

export default async function AdminQuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser()
  if (!user) redirectToLogin()
  if (!isAdmin(user)) redirectToPortal(user)

  const { id } = await params
  let quote
  try {
    quote = await QuoteService.getQuoteById(id, user)
  } catch {
    notFound()
  }

  const serialized = JSON.parse(JSON.stringify({
    ...quote,
    budget: Number(quote.budget),
    counterBudget: quote.counterBudget != null ? Number(quote.counterBudget) : null,
  }))

  return <QuoteDetail initialQuote={serialized} userRole={user.role} />
}
