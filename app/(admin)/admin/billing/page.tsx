import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import {
  CreditCard,
  Plus,
  CheckCircle2,
  Clock,
  FileText,
  Search,
} from 'lucide-react'

import AdminInvoiceStatusToggle from './AdminInvoiceStatusToggle'

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

  const totalCollected = invoices.filter((i: any) => i.status === 'PAID').reduce((a: number, i: any) => a + Number(i.amount), 0)
  const totalPending = invoices.filter((i: any) => i.status === 'PENDING').reduce((a: number, i: any) => a + Number(i.amount), 0)

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Billing</h1>
          <p className="page-header__subtitle">
            Invoice ledger · create, track, and settle client payments
          </p>
        </div>
        <div className="page-header__actions">
          <Link href="/admin/quotes" className="btn btn--secondary btn--sm">
            Quotes
          </Link>
          <Link href="/admin/finance" className="btn btn--secondary btn--sm">
            Finance Analytics
          </Link>
          <Link href="/admin/billing/new" className="btn btn--primary">
            <Plus size={16} />
            Create Invoice
          </Link>
        </div>
      </div>

      {/* Revenue Summary Cards */}
      <div className="admin-stat-row">
        <div className="admin-stat">
          <div className="admin-stat__top">
            <div className="admin-stat__icon admin-stat__icon--green">
              <CheckCircle2 size={20} />
            </div>
            <span className="admin-stat__chip admin-stat__chip--green">Paid</span>
          </div>
          <div>
            <div className="admin-stat__value">{formatCurrency(totalCollected)}</div>
            <div className="admin-stat__label">Total Revenue Collected</div>
          </div>
        </div>

        <div className={`admin-stat${totalPending > 0 ? ' admin-stat--warn' : ''}`}>
          <div className="admin-stat__top">
            <div className="admin-stat__icon admin-stat__icon--orange">
              <Clock size={20} />
            </div>
            {totalPending > 0 && (
              <span className="admin-stat__chip admin-stat__chip--orange">Pending</span>
            )}
          </div>
          <div>
            <div className="admin-stat__value">{formatCurrency(totalPending)}</div>
            <div className="admin-stat__label">Outstanding Balance</div>
          </div>
        </div>

        <div className="admin-stat">
          <div className="admin-stat__top">
            <div className="admin-stat__icon admin-stat__icon--blue">
              <FileText size={20} />
            </div>
          </div>
          <div>
            <div className="admin-stat__value">{invoices.length}</div>
            <div className="admin-stat__label">Total Invoices Issued</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <form className="filter-bar__search" method="GET">
          <Search size={15} className="filter-bar__search-icon" />
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any) => (
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
                      <AdminInvoiceStatusToggle invoiceId={inv.id} currentStatus={inv.status} />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/billing/${inv.id}`} className="btn btn--ghost btn--xs">
                          View
                        </Link>
                        <a
                          href={`/api/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn--secondary btn--xs"
                          title="Download PDF Invoice"
                        >
                          Download PDF
                        </a>
                      </div>
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
