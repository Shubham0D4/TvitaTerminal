'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, X, FileText, Check, DollarSign, RefreshCw, MessageSquare, Trash2, User, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/utils/api-client'

interface QuoteMessage {
  senderRole: string
  senderName: string
  status: string
  budget?: number | null
  counterBudget?: number | null
  text?: string | null
  timestamp: string
}

interface Quote {
  id: string
  clientId: string
  client?: { id: string; name: string; email?: string }
  title: string
  description: string
  budget: number
  currency: string
  counterBudget?: number | null
  counterMessage?: string | null
  lastCounterBy?: string | null
  status: string
  adminNotes?: string | null
  messages?: QuoteMessage[]
  createdAt: string
}

interface Props {
  clientId?: string
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
  // STRICT EXCLUSION: Internal Team Members (role === 'TEAM_MEMBER') cannot see quotes
  if (userRole === 'TEAM_MEMBER') {
    return null
  }

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [counterQuoteId, setCounterQuoteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Create Quote Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [createMessage, setCreateMessage] = useState('')

  // Counter offer / Response state
  const [counterBudget, setCounterBudget] = useState('')
  const [counterMsg, setCounterMsg] = useState('')

  const isAdmin = userRole === 'ADMIN'
  const isClient = userRole === 'CLIENT'

  useEffect(() => {
    const url = clientId ? `/api/quotes?clientId=${clientId}` : `/api/quotes`
    apiClient.get<Quote[]>(url)
      .then((res) => {
        setQuotes(Array.isArray(res) ? res : [])
        setLoading(false)
      })
      .catch((err) => {
        console.warn('Quotes fetch fallback:', err?.message || err)
        setQuotes([])
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
          message: createMessage.trim() || undefined,
        })
        setQuotes((prev) => [newQuote, ...prev])
        toast.success(isClient ? 'Quote request sent to admin' : 'Quote issued to client')
        setShowCreate(false)
        setTitle('')
        setDescription('')
        setBudget('')
        setCurrency('INR')
        setCreateMessage('')
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
          message: counterMsg.trim() || undefined,
          ...additional,
        })
        setQuotes((prev) => prev.map((q) => q.id === quoteId ? updated : q))
        toast.success(`Quote status updated to ${status.replace(/_/g, ' ')}`)
        setCounterQuoteId(null)
        setCounterBudget('')
        setCounterMsg('')
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
    <div className="card dashboard-card quotes-card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', margin: 0 }}>
            Project Quotes &amp; Negotiations
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
            Centralized workspace for project requests, proposal quotes, and 2-way counter-offers.
          </p>
        </div>
        <button type="button" onClick={() => setShowCreate(!showCreate)} className="btn btn--primary btn--sm">
          {showCreate ? <><X size={14} /> Cancel</> : <><Plus size={14} /> {isClient ? 'Request New Quote' : 'Issue New Quote'}</>}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="qt-title">Project / Quote Title *</label>
            <input id="qt-title" value={title} onChange={(e) => setTitle(e.target.value)} className="form-input" placeholder="e.g. E-Commerce Redesign & Custom Backend" required />
          </div>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="qt-desc">Requirements &amp; Scope Details *</label>
            <textarea id="qt-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="form-textarea" rows={3} placeholder="Describe the project goals, key deliverables, technologies, and target timeline..." required />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="form-group">
              <label className="form-label" htmlFor="qt-budget">Proposed Budget *</label>
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
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="qt-msg">Optional Message / Note to {isAdmin ? 'Client' : 'Admin'}</label>
            <textarea id="qt-msg" value={createMessage} onChange={(e) => setCreateMessage(e.target.value)} className="form-textarea" rows={2} placeholder="Add any optional notes regarding flexibility, deliverables, or payment terms..." />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn--primary btn--sm" disabled={isPending}>
              {isClient ? 'Send Quote Request' : 'Issue Official Quote'}
            </button>
          </div>
        </form>
      )}

      {quotes.length === 0 ? (
        <div style={{ padding: 'var(--space-5)', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>No active project quotes or counter-offer negotiations found.</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
            {isClient ? 'Click "Request New Quote" to submit a project estimation request to the agency.' : 'Issue quotes or manage incoming client project estimations here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {quotes.map((quote) => {
            const isPendingQuote = quote.status === 'PENDING' || quote.status === 'COUNTER_OFFERED'
            const formattedBudget = new Intl.NumberFormat('en-IN', { style: 'currency', currency: quote.currency }).format(quote.budget)
            const formattedCounter = quote.counterBudget ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: quote.currency }).format(quote.counterBudget) : null
            const messagesList: QuoteMessage[] = Array.isArray(quote.messages) ? quote.messages : []

            return (
              <div key={quote.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap mb-3">
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, background: `${STATUS_COLOR[quote.status] || '#2340B8'}22`, color: STATUS_COLOR[quote.status] || '#2340B8', padding: '3px 9px', borderRadius: 20, fontWeight: 700, letterSpacing: '0.3px' }}>
                        {quote.status.replace(/_/g, ' ')}
                      </span>
                      {isAdmin && quote.client && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand-hover)', background: 'var(--brand-accent)', padding: '2px 8px', borderRadius: 4 }}>
                          Client: {quote.client.name}
                        </span>
                      )}
                      {quote.lastCounterBy && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: quote.lastCounterBy === 'ADMIN' ? '#2340B8' : '#7c3aed', background: quote.lastCounterBy === 'ADMIN' ? 'rgba(35,64,184,0.1)' : 'rgba(124,58,237,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                          Last offer from: {quote.lastCounterBy === 'ADMIN' ? 'Agency Admin' : 'Client'}
                        </span>
                      )}
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(quote.createdAt))}
                      </span>
                    </div>

                    <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', margin: 0 }}>
                      {quote.title}
                    </h3>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                      {quote.description}
                    </p>
                  </div>

                  {/* Top Action Bar */}
                  <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
                    {isAdmin && (
                      <button onClick={() => handleDelete(quote.id)} title="Delete Quote" className="btn btn--ghost btn--sm btn--icon" style={{ color: 'var(--color-danger)' }}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Financial Overview */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: '10px 14px', background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Initial Proposed Budget</span>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{formattedBudget}</span>
                  </div>
                  {formattedCounter && (
                    <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: 16 }}>
                      <span style={{ fontSize: 11, color: '#8b5cf6', display: 'block', fontWeight: 600 }}>Active Counter Offer</span>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: '#8b5cf6' }}>{formattedCounter}</span>
                    </div>
                  )}
                </div>

                {/* Negotiation Messages & Counter History */}
                {messagesList.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MessageSquare size={12} /> Negotiation &amp; Offer History
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {messagesList.map((msg, idx) => (
                        <div key={idx} style={{ padding: '8px 12px', borderRadius: 6, background: msg.senderRole === userRole ? 'rgba(35,64,184,0.06)' : '#ffffff', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: msg.senderRole === 'ADMIN' ? '#2340B8' : '#059669' }}>
                              {msg.senderName} ({msg.senderRole === 'ADMIN' ? 'Agency Admin' : 'Client'})
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(msg.timestamp))}
                            </span>
                          </div>
                          {msg.counterBudget && (
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#8b5cf6', marginBottom: 2 }}>
                              Counter-Offer: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: quote.currency }).format(msg.counterBudget)}
                            </div>
                          )}
                          {msg.text && (
                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                              &quot;{msg.text}&quot;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Counter Offer & Status Actions */}
                {isPendingQuote && counterQuoteId !== quote.id && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                    <button onClick={() => handleUpdateStatus(quote.id, 'ACCEPTED')} className="btn btn--primary btn--sm flex items-center gap-1" style={{ background: '#10b981', borderColor: '#10b981' }}>
                      <Check size={14} /> Accept Offer
                    </button>
                    <button onClick={() => setCounterQuoteId(quote.id)} className="btn btn--secondary btn--sm flex items-center gap-1">
                      <RefreshCw size={14} /> Counter-Offer
                    </button>
                    <button onClick={() => handleUpdateStatus(quote.id, 'REJECTED')} className="btn btn--ghost btn--sm" style={{ color: 'var(--color-danger)' }}>
                      Reject
                    </button>
                  </div>
                )}

                {/* Interactive Counter Form with Optional Message */}
                {counterQuoteId === quote.id && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dotted var(--border-default)' }}>
                    <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 8 }}>
                      Submit Counter Offer &amp; Message
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div className="form-group">
                        <label className="form-label" htmlFor={`cnt-b-${quote.id}`}>Your Counter-Offer Amount ({quote.currency}) *</label>
                        <input id={`cnt-b-${quote.id}`} type="number" value={counterBudget} onChange={(e) => setCounterBudget(e.target.value)} className="form-input" placeholder="e.g. 45000" required />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor={`cnt-m-${quote.id}`}>Optional Message / Rationale</label>
                        <input id={`cnt-m-${quote.id}`} type="text" value={counterMsg} onChange={(e) => setCounterMsg(e.target.value)} className="form-input" placeholder="e.g. We can include priority support at this rate..." />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => { setCounterQuoteId(null); setCounterBudget(''); setCounterMsg('') }} className="btn btn--secondary btn--sm">
                        Cancel
                      </button>
                      <button onClick={() => handleUpdateStatus(quote.id, 'COUNTER_OFFERED', { counterBudget: Number(counterBudget) })} className="btn btn--primary btn--sm" disabled={!counterBudget || isPending}>
                        Send Counter-Offer
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
