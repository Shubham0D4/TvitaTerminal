'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { Plus, X, FileText, ArrowUpRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/utils/api-client'

interface Quote {
  id: string
  clientId: string
  client?: { id: string; name: string; email?: string }
  title: string
  description: string
  budget: number
  currency: string
  counterBudget?: number | null
  status: string
  createdAt: string
}

interface Props {
  clientId?: string
  userRole: string
  userId?: string
  compact?: boolean
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b',
  ACCEPTED: '#10b981',
  REJECTED: '#ef4444',
  COUNTER_OFFERED: '#8b5cf6',
}

export default function QuotesModule({ clientId, userRole, compact = false }: Props) {
  if (userRole === 'TEAM_MEMBER') {
    return null
  }

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [createMessage, setCreateMessage] = useState('')

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

  if (loading) {
    return (
      <div className="quotes-module quotes-module--loading">
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 'var(--text-sm)' }}>Loading quotes...</p>
      </div>
    )
  }

  return (
    <div className={`quotes-module${compact ? ' quotes-module--compact' : ''}`}>
      {isClient && (
        <div className="quotes-module__head">
          <div>
            <h2 className="quotes-module__title">Project Quotes &amp; Negotiations</h2>
            <p className="quotes-module__sub">
              {compact ? 'Client quotes & counter-offers' : 'Submit a request and track counter-offers.'}
            </p>
          </div>
          <button type="button" onClick={() => setShowCreate(!showCreate)} className="btn btn--primary btn--sm">
            {showCreate ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Request New Quote</>}
          </button>
        </div>
      )}

      {showCreate && isClient && (
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
        <div
          className={`quotes-empty${compact ? ' quotes-empty--compact' : ''}`}
        >
          {compact ? (
            <>
              <FileText size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  No active quotes
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  {isClient
                    ? 'Request a quote to get a project estimate.'
                    : 'Quotes appear here when clients submit requests.'}
                </p>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
                No active project quotes or counter-offer negotiations found.
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                {isClient
                  ? 'Click "Request New Quote" to submit a project estimation request to the agency.'
                  : 'When clients request quotes, negotiations will appear here for your response.'}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="quotes-module__list">
          {quotes.map((quote) => {
            const formattedBudget = new Intl.NumberFormat('en-IN', { style: 'currency', currency: quote.currency }).format(Number(quote.budget))
            const formattedCounter = quote.counterBudget
              ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: quote.currency }).format(Number(quote.counterBudget))
              : null
            const href = isAdmin ? `/admin/quotes/${quote.id}` : undefined

            return (
              <div key={quote.id} className="quotes-module__card">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, background: `${STATUS_COLOR[quote.status] || '#2340B8'}22`, color: STATUS_COLOR[quote.status] || '#2340B8', padding: '3px 9px', borderRadius: 20, fontWeight: 700, letterSpacing: '0.3px' }}>
                        {quote.status.replace(/_/g, ' ')}
                      </span>
                      {isAdmin && quote.client && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand-hover)', background: 'var(--brand-accent)', padding: '2px 8px', borderRadius: 4 }}>
                          {quote.client.name}
                        </span>
                      )}
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(quote.createdAt))}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', margin: 0 }}>
                      {quote.title}
                    </h3>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '6px 0 0' }}>
                      {formattedBudget}
                      {formattedCounter ? ` · Counter ${formattedCounter}` : ''}
                    </p>
                  </div>
                  {href && (
                    <Link href={href} className="btn btn--secondary btn--sm" style={{ gap: 4 }}>
                      Open <ArrowUpRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
