'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Calendar, DollarSign, Award, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/utils/api-client'

interface Feature {
  id: string
  name: string
}

interface SubscriptionDetailModalProps {
  isOpen: boolean
  onClose: () => void
  subscription: {
    id: string
    status: string
    startDate: any
    endDate: any
    renewalDate: any
    notes: string | null
    stripeSubId: string | null
    client?: { id: string; name: string }
    plan: {
      id: string
      name: string
      price: any
      currency: string
      billingCycle: string
      description: string | null
      features: Feature[]
    }
  } | null
  isAdmin?: boolean
}

export default function SubscriptionDetailModal({ isOpen, onClose, subscription, isAdmin = false }: SubscriptionDetailModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!isOpen || !subscription) return null

  const formatVal = (dateStr: any) => {
    if (!dateStr) return '—'
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr))
  }

  const formatCurrency = (amount: number, currency: string) => {
    const locale = currency === 'INR' ? 'en-IN' : 'en-US'
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
  }

  const handleCancel = async () => {
    if (!subscription) return
    if (!confirm('Are you sure you want to cancel this subscription?')) return

    setLoading(true)
    try {
      const res = await apiClient(`/api/admin/subscriptions/${subscription.id}/cancel`, {
        method: 'POST',
      })
      if (res.success) {
        toast.success('Subscription cancelled successfully.')
        router.refresh()
        onClose()
      } else {
        toast.error(res.error?.message || 'Failed to cancel subscription')
      }
    } catch (err: any) {
      toast.error('An error occurred while cancelling subscription')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!subscription) return
    if (!confirm('Are you sure you want to hard delete this subscription record? This action is permanent!')) return

    setLoading(true)
    try {
      const res = await apiClient(`/api/admin/subscriptions/${subscription.id}`, {
        method: 'DELETE',
      })
      if (res.success) {
        toast.success('Subscription deleted successfully.')
        router.refresh()
        onClose()
      } else {
        toast.error(res.error?.message || 'Failed to delete subscription')
      }
    } catch (err: any) {
      toast.error('An error occurred while deleting subscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', margin: 0 }}>
              Subscription Details
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              ID: {subscription.id}
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background var(--transition-fast)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-overlay)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Status & Plan Summary */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-overlay)', padding: '16px', borderRadius: 'var(--radius-lg)' }}>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Current Status</div>
              <span className={`badge badge--${subscription.status.toLowerCase()}`}>
                {subscription.status}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Retainer Rate</div>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--accent-primary)' }}>
                {formatCurrency(Number(subscription.plan.price), subscription.plan.currency)}
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>/{subscription.plan.billingCycle.toLowerCase()}</span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
                <Award size={13} /> Plan Name
              </label>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                {subscription.plan.name}
              </div>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
                <DollarSign size={13} /> Billing Interval
              </label>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                {subscription.plan.billingCycle}
              </div>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
                <Calendar size={13} /> Start Date
              </label>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                {formatVal(subscription.startDate)}
              </div>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
                <Calendar size={13} /> Next Renewal Date
              </label>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                {formatVal(subscription.endDate || subscription.renewalDate)}
              </div>
            </div>
          </div>

          {/* Client & Stripe details */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {subscription.client?.name && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Client Account:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{subscription.client?.name}</strong>
              </div>
            )}
            {subscription.stripeSubId && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Stripe Subscription Ref:</span>
                <code style={{ color: 'var(--text-primary)', background: 'var(--bg-overlay)', padding: '2px 6px', borderRadius: 4, fontSize: 'var(--text-xs)' }}>
                  {subscription.stripeSubId}
                </code>
              </div>
            )}
          </div>

          {/* Deliverables / Features */}
          {subscription.plan.features && subscription.plan.features.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em', margin: 0 }}>
                Included Deliverables
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {subscription.plan.features.map((feature) => (
                  <div key={feature.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)' }} />
                    <span>{feature.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {subscription.notes && (
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                <FileText size={13} /> Internal Notes
              </label>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', background: 'var(--bg-overlay)', padding: '12px', borderRadius: 'var(--radius-md)', lineHeight: 1.5 }}>
                {subscription.notes}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-overlay)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isAdmin && subscription.status !== 'CANCELLED' && (
              <button 
                type="button" 
                onClick={handleCancel}
                disabled={loading}
                className="btn btn--warning btn--sm"
                style={{ fontSize: 'var(--text-xs)', display: 'inline-flex', alignItems: 'center' }}
              >
                {loading ? 'Processing...' : 'Cancel Subscription'}
              </button>
            )}
            {isAdmin && (
              <button 
                type="button" 
                onClick={handleDelete}
                disabled={loading}
                className="btn btn--danger btn--sm"
                style={{ fontSize: 'var(--text-xs)', display: 'inline-flex', alignItems: 'center' }}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={loading}
            className="btn btn--secondary btn--sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
