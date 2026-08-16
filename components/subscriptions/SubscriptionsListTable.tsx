'use client'

import { useState } from 'react'
import SubscriptionDetailModal from './SubscriptionDetailModal'
import Link from 'next/link'

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
    features: any[]
  }
}

export default function SubscriptionsListTable({ subscriptions }: { subscriptions: Subscription[] }) {
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null)

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
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Plan</th>
                <th>Billing Rate</th>
                <th>Start Date</th>
                <th>Renewal Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr 
                  key={sub.id} 
                  onClick={() => setSelectedSub(sub)}
                  style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <td style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }} onClick={(e) => e.stopPropagation()}>
                    <Link href={`/admin/clients/${sub.client.id}`} style={{ color: 'var(--accent-primary)' }}>
                      {sub.client.name}
                    </Link>
                  </td>
                  <td style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                    {sub.plan.name}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {formatCurrency(Number(sub.plan.price), sub.plan.currency)} / {sub.plan.billingCycle.toLowerCase()}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {formatDate(sub.startDate)}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {formatDate(sub.endDate)}
                  </td>
                  <td>
                    <span className={`badge badge--${sub.status.toLowerCase()}`}>
                      {sub.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SubscriptionDetailModal 
        isOpen={!!selectedSub} 
        onClose={() => setSelectedSub(null)} 
        subscription={selectedSub} 
        isAdmin={true}
      />
    </>
  )
}
