'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, RefreshCw, MessageSquare, Trash2 } from 'lucide-react'
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

export interface QuoteDetailData {
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
  messages?: QuoteMessage[]
  createdAt: string
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b',
  ACCEPTED: '#10b981',
  REJECTED: '#ef4444',
  COUNTER_OFFERED: '#8b5cf6',
}

function formatQuoteMessageTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount)
}

export default function QuoteDetail({ initialQuote, userRole }: { initialQuote: QuoteDetailData; userRole: string }) {
  const router = useRouter()
  const [quote, setQuote] = useState(initialQuote)
  const [counterOpen, setCounterOpen] = useState(false)
  const [counterBudget, setCounterBudget] = useState('')
  const [counterMsg, setCounterMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  const isPendingQuote = quote.status === 'PENDING' || quote.status === 'COUNTER_OFFERED'
  const messagesList: QuoteMessage[] = Array.isArray(quote.messages) ? quote.messages : []

  const handleUpdateStatus = (status: string, additional: Record<string, unknown> = {}) => {
    startTransition(async () => {
      try {
        const updated = await apiClient.patch<QuoteDetailData>(`/api/quotes/${quote.id}`, {
          status,
          message: counterMsg.trim() || undefined,
          ...additional,
        })
        setQuote(updated)
        toast.success(`Quote ${status.replace(/_/g, ' ').toLowerCase()}`)
        setCounterOpen(false)
        setCounterBudget('')
        setCounterMsg('')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to respond to quote')
      }
    })
  }

  const handleDelete = () => {
    if (!confirm('Delete this quote request?')) return
    startTransition(async () => {
      try {
        await apiClient.delete(`/api/quotes/${quote.id}`)
        toast.success('Quote deleted')
        router.push('/admin/quotes')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete quote')
      }
    })
  }

  return (
    <div className="aquotes">
      <div className="page-header">
        <div>
          <Link href="/admin/quotes" className="btn btn--ghost btn--xs" style={{ marginBottom: 8, gap: 4 }}>
            <ArrowLeft size={14} /> All quotes
          </Link>
          <h1 className="page-header__title">{quote.title}</h1>
          <p className="page-header__subtitle">
            {quote.client?.name ?? 'Client'} ·{' '}
            {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(quote.createdAt))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            style={{
              fontSize: 11,
              background: `${STATUS_COLOR[quote.status] || '#2340B8'}22`,
              color: STATUS_COLOR[quote.status] || '#2340B8',
              padding: '4px 10px',
              borderRadius: 20,
              fontWeight: 700,
            }}
          >
            {quote.status.replace(/_/g, ' ')}
          </span>
          {userRole === 'ADMIN' && (
            <button
              type="button"
              onClick={handleDelete}
              className="btn btn--ghost btn--sm btn--icon"
              style={{ color: 'var(--color-danger)' }}
              title="Delete quote"
              disabled={isPending}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="quotes-module__card">
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 16px' }}>
          {quote.description}
        </p>

        <div className="quotes-module__finance">
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Proposed budget</span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              {money(Number(quote.budget), quote.currency)}
            </span>
          </div>
          {quote.counterBudget != null && (
            <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: 16 }}>
              <span style={{ fontSize: 11, color: '#8b5cf6', display: 'block', fontWeight: 600 }}>Active counter-offer</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: '#8b5cf6' }}>
                {money(Number(quote.counterBudget), quote.currency)}
              </span>
            </div>
          )}
          {quote.lastCounterBy && (
            <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: 16 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Last offer from</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                {quote.lastCounterBy === 'ADMIN' ? 'Agency' : 'Client'}
              </span>
            </div>
          )}
        </div>

        {messagesList.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MessageSquare size={12} /> Negotiation history
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messagesList.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: msg.senderRole === userRole ? 'rgba(35,64,184,0.06)' : '#ffffff',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: msg.senderRole === 'ADMIN' ? '#2340B8' : '#059669' }}>
                      {msg.senderName} ({msg.senderRole === 'ADMIN' ? 'Agency' : 'Client'})
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {formatQuoteMessageTime(msg.timestamp)}
                    </span>
                  </div>
                  {msg.counterBudget != null && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#8b5cf6', marginBottom: 2 }}>
                      Counter-offer: {money(Number(msg.counterBudget), quote.currency)}
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

        {isPendingQuote && !counterOpen && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => handleUpdateStatus('ACCEPTED')}
              className="btn btn--primary btn--sm flex items-center gap-1"
              style={{ background: '#10b981', borderColor: '#10b981' }}
              disabled={isPending}
            >
              <Check size={14} /> Accept
            </button>
            <button
              type="button"
              onClick={() => setCounterOpen(true)}
              className="btn btn--secondary btn--sm flex items-center gap-1"
              disabled={isPending}
            >
              <RefreshCw size={14} /> Counter-offer
            </button>
            <button
              type="button"
              onClick={() => handleUpdateStatus('REJECTED')}
              className="btn btn--ghost btn--sm"
              style={{ color: 'var(--color-danger)' }}
              disabled={isPending}
            >
              Reject
            </button>
          </div>
        )}

        {counterOpen && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dotted var(--border-default)' }}>
            <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', marginBottom: 8 }}>
              Submit counter-offer
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div className="form-group">
                <label className="form-label" htmlFor="cnt-b">Amount ({quote.currency}) *</label>
                <input
                  id="cnt-b"
                  type="number"
                  value={counterBudget}
                  onChange={(e) => setCounterBudget(e.target.value)}
                  className="form-input"
                  placeholder="e.g. 45000"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="cnt-m">Optional message</label>
                <input
                  id="cnt-m"
                  type="text"
                  value={counterMsg}
                  onChange={(e) => setCounterMsg(e.target.value)}
                  className="form-input"
                  placeholder="Rationale for this rate…"
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setCounterOpen(false); setCounterBudget(''); setCounterMsg('') }}
                className="btn btn--secondary btn--sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus('COUNTER_OFFERED', { counterBudget: Number(counterBudget) })}
                className="btn btn--primary btn--sm"
                disabled={!counterBudget || isPending}
              >
                Send counter-offer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
