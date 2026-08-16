'use client'

import { useState } from 'react'
import { CheckCircle2, Sparkles } from 'lucide-react'
import SubscriptionDetailModal from './SubscriptionDetailModal'

interface Feature {
  id: string
  name: string
}

interface Subscription {
  id: string
  status: any
  startDate: any
  endDate: any
  renewalDate: any
  notes: string | null
  stripeSubId: string | null
  client: { id: string; name: string }
  plan: {
    id: string
    name: string
    price: any
    currency: string
    billingCycle: string
    description: string | null
    features: Feature[]
  }
}

export default function ClientActiveSubscriptionCard({ subscription }: { subscription: Subscription }) {
  const [isOpen, setIsOpen] = useState(false)

  const formatCurrency = (amount: number, currency: string) => {
    const locale = currency === 'INR' ? 'en-IN' : 'en-US'
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  }

  const formatDate = (date: any) => {
    if (!date) return '—'
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
  }

  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        className="card mb-8"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          padding: 'var(--space-6)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.6)'
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(99, 102, 241, 0.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={18} className="text-primary" />
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ACTIVE RETAINER
              </span>
            </div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
              {subscription.plan.name}
            </h2>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--accent-primary)', marginTop: 4 }}>
              {formatCurrency(Number(subscription.plan.price), subscription.plan.currency)} / {subscription.plan.billingCycle.toLowerCase()}
            </div>
          </div>

          <span className="badge badge--active">ACTIVE</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-4" style={{ borderTop: '1px solid var(--border-subtle)', fontSize: 'var(--text-xs)' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Subscription Start: </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>
              {formatDate(subscription.startDate)}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Next Renewal Date: </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>
              {formatDate(subscription.endDate)}
            </span>
          </div>
        </div>

        {subscription.plan.features.length > 0 && (
          <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
              Included Services & Deliverables (Click to view full detail):
            </div>
            <div className="grid grid-cols-2 gap-2">
              {subscription.plan.features.slice(0, 4).map((f) => (
                <div key={f.id} className="flex items-center gap-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={14} className="text-success" />
                  <span>{f.name}</span>
                </div>
              ))}
              {subscription.plan.features.length > 4 && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-primary)', fontWeight: 'var(--font-medium)' }}>
                  + {subscription.plan.features.length - 4} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <SubscriptionDetailModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        subscription={subscription} 
      />
    </>
  )
}
