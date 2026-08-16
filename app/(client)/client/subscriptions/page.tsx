import { prisma } from '@/lib/prisma'
import { getServerUser, getClientSubTeamContext } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { Boxes, Sparkles } from 'lucide-react'
import SubscriptionPlanCard from './SubscriptionPlanCard'
import ClientActiveSubscriptionCard from '@/components/subscriptions/ClientActiveSubscriptionCard'

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
          client: { select: { id: true, name: true } },
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

      {activeSubscription ? (
        <ClientActiveSubscriptionCard subscription={activeSubscription as any} />
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
