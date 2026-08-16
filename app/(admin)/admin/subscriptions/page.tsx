import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Boxes, Plus, Layers } from 'lucide-react'
import AssignPlanButton from './AssignPlanButton'
import PlansListGrid from '@/components/subscriptions/PlansListGrid'
import SubscriptionsListTable from '@/components/subscriptions/SubscriptionsListTable'

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
      include: { 
        features: true,
        client: { select: { name: true } }
      },
      orderBy: { price: 'asc' },
    }),
    prisma.subscription.findMany({
      include: {
        client: { select: { id: true, name: true } },
        plan: { 
          include: { features: true }
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const serializedPlans = JSON.parse(JSON.stringify(plans))
  const serializedSubscriptions = JSON.parse(JSON.stringify(subscriptions))

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Subscription Plans &amp; Retainers</h1>
          <p className="page-header__subtitle">
            Configure monthly agency retainer packages and monitor client subscription status.
          </p>
        </div>
        <div className="page-header__actions">
          <AssignPlanButton clients={clients} plans={serializedPlans.map((p: any) => ({ id: p.id, name: p.name }))} />
          <Link href="/admin/subscriptions/plans/new" className="btn btn--primary">
            <Plus size={16} />
            Create Plan
          </Link>
        </div>
      </div>

      {/* Subscription Plans Grid */}
      <div className="mb-8">
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
          Active Retainer Packages ({serializedPlans.length})
        </h2>

        {serializedPlans.length === 0 ? (
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
          <PlansListGrid plans={serializedPlans} />
        )}
      </div>

      {/* Active Client Subscriptions List */}
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
          Client Subscriptions ({serializedSubscriptions.length})
        </h2>

        {serializedSubscriptions.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <Layers size={28} />
              <div className="empty-state__title">No active client subscriptions</div>
              <div className="empty-state__desc">Assign retainer plans to onboarded clients.</div>
            </div>
          </div>
        ) : (
          <SubscriptionsListTable subscriptions={serializedSubscriptions} />
        )}
      </div>
    </div>
  )
}
