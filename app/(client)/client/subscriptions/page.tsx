import { prisma } from '@/lib/prisma'
import { getServerUser, getClientSubTeamContext } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { Boxes, CheckCircle2, Sparkles } from 'lucide-react'
import SubscriptionPlanCard from './SubscriptionPlanCard'

export const metadata = {
  title: 'My Subscription — Tvita Client Portal',
  description: 'View active retainer package, included features, and renewal schedule.',
}

function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount))
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

export default async function ClientSubscriptionsPage() {
  const user = await getServerUser()
  if (!user) redirect('/login')

  // Sub-teams do not have access to subscription data
  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx && !subTeamCtx.policy.subscriptions) redirect('/client/dashboard')

  const client = await prisma.client.findFirst({
    where: subTeamCtx
      ? { id: subTeamCtx.clientId }
      : { OR: [{ profileId: user.id }, { email: user.email }] },
    include: {
      subscriptions: {
        where: { status: 'ACTIVE' },
        include: {
          plan: {
            include: { features: true },
          },
        },
        take: 1,
      },
    },
  })

  const availablePlans = await prisma.plan.findMany({
    where: {
      isActive: true,
      OR: [
        { isPrivate: false, clientId: null },          // public plans
        { isPrivate: true, clientId: client?.id },      // plans private to this client
      ],
    },
    include: { features: true },
    orderBy: { price: 'asc' },
  })

  const activeSubscription = client?.subscriptions[0]

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">My Retainer & Subscription</h1>
          <p className="page-header__subtitle">
            Current service plan and included deliverables for {client?.name ?? 'your account'}.
          </p>
        </div>
      </div>

      {/* Active Subscription Highlight Card */}
      {activeSubscription ? (
        <div
          className="card mb-8"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            padding: 'var(--space-6)',
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
                {activeSubscription.plan.name}
              </h2>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--accent-primary)', marginTop: 4 }}>
                {formatCurrency(Number(activeSubscription.plan.price))} / {activeSubscription.plan.billingCycle.toLowerCase()}
              </div>
            </div>

            <span className="badge badge--active">ACTIVE</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-4" style={{ borderTop: '1px solid var(--border-subtle)', fontSize: 'var(--text-xs)' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Subscription Start: </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>
                {formatDate(activeSubscription.startDate)}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Next Renewal Date: </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>
                {formatDate(activeSubscription.endDate)}
              </span>
            </div>
          </div>

          {activeSubscription.plan.features.length > 0 && (
            <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
                Included Services & Deliverables:
              </div>
              <div className="grid grid-cols-2 gap-2">
                {activeSubscription.plan.features.map((f) => (
                  <div key={f.id} className="flex items-center gap-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={14} className="text-success" />
                    <span>{f.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card mb-8">
          <div className="empty-state">
            <Boxes size={28} />
            <div className="empty-state__title">No Active Retainer Plan</div>
            <div className="empty-state__desc">Contact your agency manager to activate a monthly service retainer package.</div>
          </div>
        </div>
      )}

      {/* Available Plans Catalog */}
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
          Available Agency Plans
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {availablePlans.map((plan) => (
            <SubscriptionPlanCard
              key={plan.id}
              plan={{
                id: plan.id,
                name: plan.name,
                price: Number(plan.price),
                billingCycle: plan.billingCycle,
                isPrivate: (plan as any).isPrivate,
                features: plan.features.map((f) => ({ id: f.id, name: f.name })),
              }}
              isCurrent={activeSubscription?.planId === plan.id}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
