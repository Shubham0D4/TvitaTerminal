'use client'

import { useState } from 'react'
import { CheckCircle2, Sparkles, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface PlanCardProps {
  plan: {
    id: string
    name: string
    price: number | string
    billingCycle: string
    isPrivate?: boolean
    features: { id: string; name: string }[]
  }
  isCurrent: boolean
}

function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount))
}

export default function SubscriptionPlanCard({ plan, isCurrent }: PlanCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    if (isCurrent) return
    if (!confirm(`Confirm subscription to ${plan.name} (${formatCurrency(plan.price)}/${plan.billingCycle.toLowerCase()})?`)) return

    setLoading(true)
    try {
      const res = await fetch('/api/client/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || 'Failed to process subscription checkout')
      }

      toast.success(`Successfully subscribed to ${plan.name}!`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Subscription failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="card"
      style={{
        border: isCurrent ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
        background: isCurrent ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-card)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'var(--space-6)',
        borderRadius: 'var(--radius-lg)',
        transition: 'transform 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
              {plan.name}
            </h3>
            {plan.isPrivate && (
              <span style={{ fontSize: 9, background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                ⭐ EXCLUSIVE
              </span>
            )}
          </div>
          {isCurrent && (
            <span className="badge badge--active" style={{ fontSize: 10 }}>
              CURRENT PLAN
            </span>
          )}
        </div>

        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--accent-primary)', marginBottom: 'var(--space-4)' }}>
          {formatCurrency(plan.price)}
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 'normal' }}>
            /{plan.billingCycle.toLowerCase()}
          </span>
        </div>

        {plan.features.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            {plan.features.map((f) => (
              <div key={f.id} className="flex items-center gap-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={13} className="text-success" />
                <span>{f.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
        {isCurrent ? (
          <button disabled className="btn btn--secondary w-full" style={{ opacity: 0.75, cursor: 'default' }}>
            ✓ Active Subscription
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={loading}
            className="btn btn--primary w-full"
            style={{
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, #8b5cf6 100%)',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <ShoppingBag size={15} />
            {loading ? 'Processing...' : 'Subscribe Now'}
          </button>
        )}
      </div>
    </div>
  )
}
