'use client'

import { useState } from 'react'
import PlanDetailModal from './PlanDetailModal'
import { CheckCircle2 } from 'lucide-react'

interface Feature {
  id: string
  name: string
}

interface Plan {
  id: string
  name: string
  price: any
  currency: string
  billingCycle: string
  description: string | null
  isPrivate: boolean
  client: { name: string } | null
  features: Feature[]
}

export default function PlansListGrid({ plans }: { plans: Plan[] }) {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)

  const formatCurrency = (amount: number, currency: string) => {
    const locale = currency === 'INR' ? 'en-IN' : 'en-US'
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            onClick={() => setSelectedPlan(plan)}
            className="card" 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.borderColor = 'var(--accent-primary)'
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.borderColor = 'var(--border-subtle)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                  {plan.name}
                </h3>
                <span className="badge badge--active">
                  {plan.billingCycle}
                </span>
              </div>

              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--accent-primary)', marginBottom: 'var(--space-3)' }}>
                {formatCurrency(Number(plan.price), plan.currency)}<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>/{plan.billingCycle.toLowerCase()}</span>
              </div>

              {plan.description && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
                  {plan.description}
                </p>
              )}

              {plan.features.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
                  {plan.features.slice(0, 3).map((f) => (
                    <div key={f.id} className="flex items-center gap-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={13} className="text-success" style={{ color: 'var(--color-success)' }} />
                      <span>{f.name}</span>
                    </div>
                  ))}
                  {plan.features.length > 3 && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-primary)', fontWeight: 'var(--font-medium)', marginTop: 2 }}>
                      + {plan.features.length - 3} more deliverables
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <PlanDetailModal 
        isOpen={!!selectedPlan} 
        onClose={() => setSelectedPlan(null)} 
        plan={selectedPlan} 
      />
    </>
  )
}
