'use client'

import { X, CheckCircle2, Lock, Unlock } from 'lucide-react'

interface Feature {
  id: string
  name: string
}

interface PlanDetailModalProps {
  isOpen: boolean
  onClose: () => void
  plan: {
    id: string
    name: string
    price: any
    currency: string
    billingCycle: string
    description: string | null
    isPrivate: boolean
    client: { name: string } | null
    features: Feature[]
  } | null
}

export default function PlanDetailModal({ isOpen, onClose, plan }: PlanDetailModalProps) {
  if (!isOpen || !plan) return null

  const formatCurrency = (amount: number, currency: string) => {
    const locale = currency === 'INR' ? 'en-IN' : 'en-US'
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
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
          maxWidth: '500px',
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
              Retainer Package Details
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              ID: {plan.id}
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
          {/* Top Price Summary */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-overlay)', padding: '16px', borderRadius: 'var(--radius-lg)' }}>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Plan Title</div>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                {plan.name}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Rate</div>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--accent-primary)' }}>
                {formatCurrency(Number(plan.price), plan.currency)}
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>/{plan.billingCycle.toLowerCase()}</span>
              </div>
            </div>
          </div>

          {/* Scope Visibility */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-sm)' }}>
            {plan.isPrivate ? (
              <>
                <Lock size={15} style={{ color: 'var(--color-warning)' }} />
                <span style={{ color: 'var(--text-secondary)' }}>
                  Private (Exclusive to client: <strong>{plan.client?.name ?? '—'}</strong>)
                </span>
              </>
            ) : (
              <>
                <Unlock size={15} style={{ color: 'var(--color-success)' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Public (Available to all clients)</span>
              </>
            )}
          </div>

          {/* Description */}
          {plan.description && (
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>Summary</div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {plan.description}
              </p>
            </div>
          )}

          {/* Features */}
          {plan.features && plan.features.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em', margin: 0 }}>
                Included Deliverables
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {plan.features.map((feature) => (
                  <div key={feature.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={13} className="text-success" style={{ color: 'var(--color-success)' }} />
                    <span>{feature.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--border-subtle)' }}>
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn--secondary btn--sm"
          >
            Close Detail View
          </button>
        </div>
      </div>
    </div>
  )
}
