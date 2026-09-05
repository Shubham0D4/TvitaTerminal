import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  AlertCircle,
  ArrowUpRight,
  Wallet,
} from 'lucide-react'
import {
  AgingChart,
  RevenueTrendChart,
  StatusBreakdownChart,
  TopClientsChart,
} from './FinanceCharts'

export const metadata = {
  title: 'Finance Analytics — Tvita Admin',
  description: 'Revenue trends, collections health, and client contribution insights.',
}

function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / previous) * 100
}

export default async function FinanceAnalyticsPage() {
  const now = new Date()
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      dueDate: true,
      issuedDate: true,
      paidDate: true,
      createdAt: true,
      client: { select: { id: true, name: true } },
    },
  })

  const currency = invoices[0]?.currency || 'INR'

  const paid = invoices.filter((i) => i.status === 'PAID')
  const pending = invoices.filter((i) => i.status === 'PENDING')
  const overdue = invoices.filter(
    (i) =>
      i.status === 'OVERDUE' ||
      (i.status === 'PENDING' && i.dueDate && new Date(i.dueDate) < now)
  )

  const totalCollected = paid.reduce((s, i) => s + Number(i.amount), 0)
  const totalOutstanding = [...pending, ...overdue]
    .filter((i, idx, arr) => arr.findIndex((x) => x.id === i.id) === idx)
    .reduce((s, i) => s + Number(i.amount), 0)
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.amount), 0)
  const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0

  // Last 6 calendar months trend
  const months: { key: string; label: string; start: Date; end: Date }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString('en-IN', { month: 'short' }),
      start: d,
      end,
    })
  }

  const trend = months.map((m) => {
    const inMonth = invoices.filter((inv) => {
      const d = new Date(inv.issuedDate || inv.createdAt)
      return d >= m.start && d < m.end
    })
    const collected = inMonth
      .filter((inv) => inv.status === 'PAID')
      .reduce((s, inv) => s + Number(inv.amount), 0)
    const invoiced = inMonth.reduce((s, inv) => s + Number(inv.amount), 0)
    return { month: m.label, collected, invoiced }
  })

  const thisMonth = trend[trend.length - 1]
  const lastMonth = trend[trend.length - 2] ?? { collected: 0, invoiced: 0 }
  const collectedDelta = pctChange(thisMonth?.collected ?? 0, lastMonth.collected)
  const invoicedDelta = pctChange(thisMonth?.invoiced ?? 0, lastMonth.invoiced)

  const statusBreakdown = [
    {
      name: 'Paid',
      value: paid.length,
      amount: totalCollected,
    },
    {
      name: 'Pending',
      value: pending.filter((i) => !(i.dueDate && new Date(i.dueDate) < now)).length,
      amount: pending
        .filter((i) => !(i.dueDate && new Date(i.dueDate) < now))
        .reduce((s, i) => s + Number(i.amount), 0),
    },
    {
      name: 'Overdue',
      value: overdue.length,
      amount: overdue.reduce((s, i) => s + Number(i.amount), 0),
    },
    {
      name: 'Cancelled',
      value: invoices.filter((i) => i.status === 'CANCELLED').length,
      amount: invoices
        .filter((i) => i.status === 'CANCELLED')
        .reduce((s, i) => s + Number(i.amount), 0),
    },
  ]

  // Top clients by collected amount
  const byClient = new Map<string, { name: string; amount: number }>()
  for (const inv of paid) {
    const cur = byClient.get(inv.client.id) ?? { name: inv.client.name, amount: 0 }
    cur.amount += Number(inv.amount)
    byClient.set(inv.client.id, cur)
  }
  const topClients = [...byClient.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
    .map((c) => ({
      name: c.name.length > 14 ? `${c.name.slice(0, 13)}…` : c.name,
      amount: c.amount,
    }))

  // Receivables aging on outstanding invoices
  const outstanding = invoices.filter(
    (i) => i.status === 'PENDING' || i.status === 'OVERDUE'
  )
  const agingBuckets = [
    { bucket: 'Current', min: -Infinity, max: 0 },
    { bucket: '1–30d', min: 1, max: 30 },
    { bucket: '31–60d', min: 31, max: 60 },
    { bucket: '60d+', min: 61, max: Infinity },
  ]
  const aging = agingBuckets.map((b) => {
    let amount = 0
    let count = 0
    for (const inv of outstanding) {
      if (!inv.dueDate) {
        if (b.bucket === 'Current') {
          amount += Number(inv.amount)
          count += 1
        }
        continue
      }
      const daysPast = Math.ceil(
        (now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysPast >= b.min && daysPast <= b.max) {
        amount += Number(inv.amount)
        count += 1
      }
    }
    return { bucket: b.bucket, amount, count }
  })

  const insightParts: string[] = []
  if (collectionRate >= 80) {
    insightParts.push(`Collection rate is healthy at ${collectionRate.toFixed(0)}%.`)
  } else if (totalInvoiced > 0) {
    insightParts.push(
      `Collection rate is ${collectionRate.toFixed(0)}% — follow up on outstanding invoices.`
    )
  }
  if (overdue.length > 0) {
    insightParts.push(
      `${overdue.length} overdue invoice${overdue.length === 1 ? '' : 's'} totaling ${formatCurrency(
        overdue.reduce((s, i) => s + Number(i.amount), 0),
        currency
      )}.`
    )
  }
  if (collectedDelta !== 0) {
    insightParts.push(
      `Collections this month are ${Math.abs(collectedDelta).toFixed(0)}% ${
        collectedDelta >= 0 ? 'higher' : 'lower'
      } than last month.`
    )
  }
  if (insightParts.length === 0) {
    insightParts.push('Issue invoices to unlock revenue trends and collection insights.')
  }

  return (
    <div className="fin">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Finance Analytics</h1>
          <p className="page-header__subtitle">
            Collections health, revenue momentum, and where cash is concentrated
          </p>
        </div>
        <div className="page-header__actions">
          <Link href="/admin/quotes" className="btn btn--secondary btn--sm">
            Quotes <ArrowUpRight size={14} />
          </Link>
          <Link href="/admin/billing" className="btn btn--secondary btn--sm">
            Invoice ledger <ArrowUpRight size={14} />
          </Link>
          <Link href="/admin/billing/new" className="btn btn--primary btn--sm">
            <CreditCard size={14} /> Create Invoice
          </Link>
        </div>
      </div>

      <p className="fin__insight">{insightParts.join(' ')}</p>

      {/* KPI strip */}
      <section className="fin__kpis" aria-label="Financial KPIs">
        <article className="fin__kpi">
          <div className="fin__kpi-label">
            <Wallet size={15} /> Collected
          </div>
          <div className="fin__kpi-value">{formatCurrency(totalCollected, currency)}</div>
          <DeltaBadge value={collectedDelta} suffix="vs last month" />
        </article>
        <article className="fin__kpi fin__kpi--warn">
          <div className="fin__kpi-label">
            <AlertCircle size={15} /> Outstanding
          </div>
          <div className="fin__kpi-value">{formatCurrency(totalOutstanding, currency)}</div>
          <div className="fin__kpi-meta">
            {overdue.length > 0
              ? `${overdue.length} overdue`
              : pending.length > 0
                ? `${pending.length} pending`
                : 'All clear'}
          </div>
        </article>
        <article className="fin__kpi">
          <div className="fin__kpi-label">
            <CreditCard size={15} /> Invoiced (all time)
          </div>
          <div className="fin__kpi-value">{formatCurrency(totalInvoiced, currency)}</div>
          <DeltaBadge value={invoicedDelta} suffix="issued vs last month" />
        </article>
        <article className="fin__kpi">
          <div className="fin__kpi-label">
            <TrendingUp size={15} /> Collection rate
          </div>
          <div className="fin__kpi-value">{collectionRate.toFixed(0)}%</div>
          <div className="fin__kpi-meta">Paid ÷ total invoiced</div>
        </article>
      </section>

      {/* Charts mosaic */}
      <section className="fin__grid">
        <div className="fin__panel fin__panel--wide">
          <div className="fin__panel-head">
            <h2 className="fin__panel-title">Revenue trend</h2>
            <p className="fin__panel-sub">Invoiced vs collected · last 6 months</p>
          </div>
          <RevenueTrendChart data={trend} />
        </div>

        <div className="fin__panel">
          <div className="fin__panel-head">
            <h2 className="fin__panel-title">Invoice mix</h2>
            <p className="fin__panel-sub">Count by payment status</p>
          </div>
          <StatusBreakdownChart data={statusBreakdown} />
        </div>

        <div className="fin__panel">
          <div className="fin__panel-head">
            <h2 className="fin__panel-title">Receivables aging</h2>
            <p className="fin__panel-sub">Outstanding by days past due</p>
          </div>
          <AgingChart data={aging} />
        </div>

        <div className="fin__panel fin__panel--wide">
          <div className="fin__panel-head">
            <h2 className="fin__panel-title">Top contributing clients</h2>
            <p className="fin__panel-sub">Collected revenue by client</p>
          </div>
          <TopClientsChart data={topClients} />
        </div>
      </section>
    </div>
  )
}

function DeltaBadge({ value, suffix }: { value: number; suffix: string }) {
  const up = value >= 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <div className={`fin__delta${up ? ' fin__delta--up' : ' fin__delta--down'}`}>
      <Icon size={12} />
      {Math.abs(value).toFixed(0)}% {suffix}
    </div>
  )
}
