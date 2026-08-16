'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, X, FileText, Check, DollarSign, RefreshCw, MessageSquare, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@/shared/utilities/api-client'

interface Quote {
  id: string
  title: string
  description: string
  budget: number
  currency: string
  counterBudget?: number | null
  status: string
  adminNotes?: string | null
  createdAt: string
}

interface Props {
  clientId: string
  userRole: string
  userId: string
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b',
  ACCEPTED: '#10b981',
  REJECTED: '#ef4444',
  COUNTER_OFFERED: '#8b5cf6',
}

export default function QuotesModule({ clientId, userRole, userId }: Props) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(() => !!clientId)
  const [showCreate, setShowCreate] = useState(false)
  const [counterQuoteId, setCounterQuoteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form states (Admin Create Quote)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [currency, setCurrency] = useState('INR')

  // Client response counter state
  const [counterBudget, setCounterBudget] = useState('')

  const isAdmin = userRole === 'ADMIN'
  const isClient = userRole === 'CLIENT'

  useEffect(() => {
    if (!clientId) return
    apiClient.get<Quote[]>(`/api/quotes?clientId=${clientId}`)
      .then((res) => {
        setQuotes(res)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        toast.error('Failed to load quotes')
        setLoading(false)
      })
  }, [clientId])

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !description || !budget) return

    startTransition(async () => {
      try {
        const newQuote = await apiClient.post<Quote>(`/api/quotes`, {
          clientId,
          title,
          description,
          budget: Number(budget),
          currency,
        })
        setQuotes((prev) => [newQuote, ...prev])
        toast.success('Quote generated and sent to client')
        setShowCreate(false)
        setTitle('')
        setDescription('')
        setBudget('')
        setCurrency('INR')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create quote'
        toast.error(msg)
      }
    })
  }

  const handleUpdateStatus = (quoteId: string, status: string, additional: Record<string, unknown> = {}) => {
    startTransition(async () => {
      try {
        const updated = await apiClient.patch<Quote>(`/api/quotes/${quoteId}`, {
          status,
          ...additional,
        })
        setQuotes((prev) => prev.map((q) => q.id === quoteId ? updated : q))
        toast.success(`Quote status updated to ${status.replace(/_/g, ' ')}`)
        setCounterQuoteId(null)
        setCounterBudget('')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to respond to quote'
        toast.error(msg)
      }
    })
  }

  const handleDelete = (quoteId: string) => {
    if (!confirm('Are you sure you want to delete this quote request?')) return

    startTransition(async () => {
      try {
        await apiClient.delete(`/api/quotes/${quoteId}`)
        setQuotes((prev) => prev.filter((q) => q.id !== quoteId))
        toast.success('Quote deleted successfully')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to delete quote'
        toast.error(msg)
      }
    })
  }

  if (loading) {
    return <div className="card text-center py-6"><p style={{ color: 'var(--text-muted)' }}>Loading quotes...</p></div>
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
          Quotes & Estimates
        </h2>
        {isAdmin && (
          <button type="button" onClick={() => setShowCreate(!showCreate)} className="btn btn--ghost btn--sm">
            {showCreate ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Send Quote</>}
          </button>
        )}
      </div>

      {showCreate && isAdmin && (
        <form onSubmit={handleCreate} style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="qt-title">Quote Title *</label>
            <input id="qt-title" value={title} onChange={(e) => setTitle(e.target.value)} className="form-input" placeholder="e.g. Mobile App Redesign" required />
          </div>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="qt-desc">Details / Description *</label>
            <textarea id="qt-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="form-textarea" rows={3} placeholder="Scope, features, timelines..." required />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="form-group">
              <label className="form-label" htmlFor="qt-budget">Budget Estimate *</label>
              <input id="qt-budget" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="form-input" placeholder="Amount..." required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="qt-currency">Currency</label>
              <select id="qt-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="form-input">
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn--primary btn--sm" disabled={isPending}>
              Submit Quote
            </button>
          </div>
        </form>
      )}

      {quotes.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No quotes issued.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {quotes.map((quote) => {
            const isPendingQuote = quote.status === 'PENDING' || quote.status === 'COUNTER_OFFERED'
            const formattedBudget = new Intl.NumberFormat('en-IN', { style: 'currency', currency: quote.currency }).format(quote.budget)

            return (
              <div key={quote.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, background: `${STATUS_COLOR[quote.status]}22`, color: STATUS_COLOR[quote.status], padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                        {quote.status.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        Generated {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(quote.createdAt))}
                      </span>
                    </div>

                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{quote.title}</div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>{quote.description}</p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12, fontSize: 'var(--text-xs)', color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)' }}>
                      <span className="flex items-center gap-1">
                        <FileText size={12} style={{ color: 'var(--text-muted)' }} />
                        Offered Budget: {formattedBudget}
                      </span>
                      {quote.counterBudget && (
                        <span className="flex items-center gap-1" style={{ color: '#8b5cf6' }}>
                          <DollarSign size={12} />
                          Counter-Offer: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: quote.currency }).format(quote.counterBudget)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
                    {isClient && isPendingQuote && counterQuoteId !== quote.id && (
                      <>
                        <button onClick={() => handleUpdateStatus(quote.id, 'ACCEPTED')} className="btn btn--primary btn--sm flex items-center gap-1" style={{ background: '#10b981', borderColor: '#10b981' }}>
                          <Check size={14} /> Accept
                        </button>
                        <button onClick={() => setCounterQuoteId(quote.id)} className="btn btn--secondary btn--sm flex items-center gap-1">
                          <RefreshCw size={14} /> Counter
                        </button>
                        <button onClick={() => handleUpdateStatus(quote.id, 'REJECTED')} className="btn btn--ghost btn--sm" style={{ color: 'var(--color-danger)' }}>
                          Reject
                        </button>
                      </>
                    )}
                    {isAdmin && (
                      <button onClick={() => handleDelete(quote.id)} title="Delete Quote" className="btn btn--ghost btn--sm btn--icon" style={{ color: 'var(--color-danger)' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Counter Offer Input Form */}
                {counterQuoteId === quote.id && (
                  <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
                    <div className="form-group mb-3">
                      <label className="form-label" htmlFor="cnt-budget">Your Counter Budget ({quote.currency}) *</label>
                      <input id="cnt-budget" type="number" value={counterBudget} onChange={(e) => setCounterBudget(e.target.value)} className="form-input" placeholder="Enter counter budget amount..." required />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                      <button onClick={() => { setCounterQuoteId(null); setCounterBudget('') }} className="btn btn--secondary btn--sm">
                        Cancel
                      </button>
                      <button onClick={() => handleUpdateStatus(quote.id, 'COUNTER_OFFERED', { counterBudget: Number(counterBudget) })} className="btn btn--primary btn--sm" disabled={!counterBudget || isPending}>
                        Submit Counter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
