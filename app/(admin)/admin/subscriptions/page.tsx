import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Boxes, Plus, CheckCircle2, Clock, Building2, Layers } from 'lucide-react'
import AssignPlanButton from './AssignPlanButton'

export const metadata = {
  title: 'Subscription Plans — Tvita Admin',
  description: 'Manage agency subscription packages, pricing models, and active client subscriptions.',
}

function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount))
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

export default async function AdminSubscriptionsPage() {
  const [plans, subscriptions, clients] = await Promise.all([
    prisma.plan.findMany({
      include: { features: true },
      orderBy: { price: 'asc' },
    }),
    prisma.subscription.findMany({
      include: {
        client: { select: { id: true, name: true } },
        plan: { select: { name: true, price: true, billingCycle: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Subscription Plans & Retainers</h1>
          <p className="page-header__subtitle">
            Configure monthly agency retainer packages and monitor client subscription status.
          </p>
        </div>
        <div className="page-header__actions">
          <AssignPlanButton clients={clients} plans={plans.map((p) => ({ id: p.id, name: p.name }))} />
          <Link href="/admin/subscriptions/plans/new" className="btn btn--primary">
            <Plus size={16} />
            Create Plan
          </Link>
        </div>
      </div>

      {/* Subscription Plans Grid */}
      <div className="mb-8">
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
          Active Retainer Packages ({plans.length})
        </h2>

        {plans.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <Boxes size={28} />
              <div className="empty-state__title">No subscription plans created</div>
              <div className="empty-state__desc">Create your first retainer plan (e.g. Starter, Growth, Agency Enterprise).</div>
              <Link href="/admin/subscriptions/plans/new" className="btn btn--primary btn--sm">
                <Plus size={14} />
                Create Plan
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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
                    {formatCurrency(Number(plan.price))}<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>/{plan.billingCycle.toLowerCase()}</span>
                  </div>

                  {plan.description && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
                      {plan.description}
                    </p>
                  )}

                  {plan.features.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
                      {plan.features.map((f) => (
                        <div key={f.id} className="flex items-center gap-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                          <CheckCircle2 size={13} className="text-success" />
                          <span>{f.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Client Subscriptions List */}
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
          Client Subscriptions ({subscriptions.length})
        </h2>

        {subscriptions.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <Layers size={28} />
              <div className="empty-state__title">No active client subscriptions</div>
              <div className="empty-state__desc">Assign retainer plans to onboarded clients.</div>
            </div>
          </div>
        ) : (
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
                    <tr key={sub.id}>
                      <td style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                        <Link href={`/admin/clients/${sub.client.id}`} style={{ color: 'var(--accent-primary)' }}>
                          {sub.client.name}
                        </Link>
                      </td>
                      <td style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                        {sub.plan.name}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {formatCurrency(Number(sub.plan.price))} / {sub.plan.billingCycle.toLowerCase()}
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
        )}
      </div>
    </div>
  )
}
