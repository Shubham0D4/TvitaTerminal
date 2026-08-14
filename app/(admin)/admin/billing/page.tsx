import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import {
  CreditCard,
  Plus,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react'

export const metadata = {
  title: 'Invoices & Billing — Tvita Admin',
  description: 'Manage agency invoices, track payments, and monitor revenue.',
}

function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

async function getInvoices(search?: string, status?: string) {
  return prisma.invoice.findMany({
    where: {
      ...(search && {
        OR: [
          { invoiceNo: { contains: search, mode: 'insensitive' } },
          { client: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
      ...(status && status !== 'ALL' && { status: status as any }),
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

type SearchParams = Promise<{ search?: string; status?: string }>

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const invoices = await getInvoices(params.search, params.status)

  const totalCollected = invoices.filter((i) => i.status === 'PAID').reduce((a, i) => a + Number(i.amount), 0)
  const totalPending = invoices.filter((i) => i.status === 'PENDING').reduce((a, i) => a + Number(i.amount), 0)

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Invoices & Billing</h1>
          <p className="page-header__subtitle">
            Create GST invoices, track receipts, and review client payment status.
          </p>
        </div>
        <div className="page-header__actions">
          <Link href="/admin/billing/new" className="btn btn--primary">
            <Plus size={16} />
            Create Invoice
          </Link>
        </div>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__title">Total Revenue Collected</span>
            <div className="stat-card__icon text-success"><CheckCircle2 size={16} /></div>
          </div>
          <div className="stat-card__value text-success">{formatCurrency(totalCollected)}</div>
          <div className="stat-card__change">Paid invoices to date</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__title">Outstanding Balance</span>
            <div className="stat-card__icon text-warning"><Clock size={16} /></div>
          </div>
          <div className="stat-card__value text-warning">{formatCurrency(totalPending)}</div>
          <div className="stat-card__change">Pending client payments</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__title">Total Invoices Issued</span>
            <div className="stat-card__icon"><FileText size={16} /></div>
          </div>
          <div className="stat-card__value">{invoices.length}</div>
          <div className="stat-card__change">Generated records</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <form className="filter-bar__search" method="GET">
          <CreditCard size={15} className="filter-bar__search-icon" />
          <input
            name="search"
            className="filter-bar__search-input"
            placeholder="Search by invoice # or client..."
            defaultValue={params.search ?? ''}
          />
          {params.status && <input type="hidden" name="status" value={params.status} />}
        </form>

        {(['ALL', 'PAID', 'PENDING', 'OVERDUE', 'CANCELLED'] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/billing?${params.search ? `search=${params.search}&` : ''}status=${s}`}
            className={`filter-chip${(!params.status && s === 'ALL') || params.status === s ? ' filter-chip--active' : ''}`}
          >
            {s === 'ALL' ? 'All' : s}
          </Link>
        ))}
      </div>

      {/* Invoices Table */}
      {invoices.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state__icon"><CreditCard size={28} /></div>
            <div className="empty-state__title">No invoices found</div>
            <div className="empty-state__desc">
              {params.search ? `No invoices match "${params.search}".` : 'Generate your first GST invoice.'}
            </div>
            <Link href="/admin/billing/new" className="btn btn--primary btn--sm">
              <Plus size={14} />
              Create Invoice
            </Link>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Project</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <Link
                        href={`/admin/billing/${inv.id}`}
                        style={{ color: 'var(--accent-primary)', fontWeight: 'var(--font-medium)' }}
                      >
                        {inv.invoiceNo}
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/admin/clients/${inv.client.id}`}
                        style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}
                      >
                        {inv.client.name}
                      </Link>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {inv.project?.name ?? '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {formatDate(inv.issuedDate)}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {formatDate(inv.dueDate)}
                    </td>
                    <td style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                      {formatCurrency(Number(inv.amount))}
                    </td>
                    <td>
                      <span className={`badge badge--${inv.status.toLowerCase()}`}>
                        {inv.status}
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
  )
}
