import { prisma } from '@/lib/prisma'
import {
  Building2,
  Mail,
  Phone,
  Plus,
  FolderKanban,
  CreditCard,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Clients — Tvita Admin',
  description: 'Manage all agency clients — view, add, and track client activity.',
}

function formatCurrency(amount: number | string, currency = 'INR'): string {
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : `${currency} `
  return `${symbol}${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

async function getClients(search?: string, status?: string) {
  return prisma.client.findMany({
    where: {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && status !== 'ALL' && { status: status as any }),
    },
    include: {
      _count: {
        select: { projects: true, invoices: true },
      },
      subscriptions: {
        where: { status: 'ACTIVE' },
        include: { plan: { select: { name: true } } },
        take: 1,
      },
      invoices: {
        where: { status: { in: ['PENDING', 'OVERDUE'] } },
        select: { amount: true, currency: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

type SearchParams = Promise<{ search?: string; status?: string }>

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const clients = await getClients(params.search, params.status)
  const totalClientsCount = clients.length
  const totalActive = clients.filter((c: any) => c.status === 'ACTIVE').length
  const totalInactive = clients.filter((c: any) => c.status === 'INACTIVE' || c.status === 'SUSPENDED').length

  // Calculate total outstanding balance
  const totalOutstanding = clients.reduce((sum, client) => {
    return sum + client.invoices.reduce((s, inv) => s + Number(inv.amount), 0)
  }, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header flex-col md:flex-row items-start md:items-center justify-between gap-4" style={{ padding: 'var(--space-2) 0', borderBottom: 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 className="page-header__title" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
            Clients
          </h1>
          <p className="page-header__subtitle" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 400, margin: 0 }}>
            Manage organization-wide client accounts, sub-teams, and portal access.
          </p>
        </div>
        <div className="page-header__actions">
          <Link 
            href="/admin/clients/new" 
            className="btn btn--primary btn--sm"
            style={{ 
              borderRadius: '10px', 
              background: 'var(--accent-primary)', 
              color: '#ffffff',
              fontWeight: 500, 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '8px 16px',
              boxShadow: '0 2px 4px rgba(35, 64, 184, 0.15)',
              border: 'none'
            }}
          >
            <Plus size={16} />
            New Client
          </Link>
        </div>
      </div>

      {/* Hero Metrics Row */}
      <div className="grid grid-cols-4 gap-5" style={{ gap: '20px' }}>
        {/* Metric 1: Total Clients */}
        <div 
          className="stat-card" 
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '16px', 
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.015), 0 1px 2px rgba(0, 0, 0, 0.005)', 
            border: '1px solid rgba(16, 28, 107, 0.08)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div className="flex items-center justify-between">
            <div 
              style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '50%', 
                background: 'rgba(35, 64, 184, 0.08)', 
                color: 'var(--accent-primary)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              <Building2 size={20} />
            </div>
          </div>
          <div>
            <div className="stat-card__value" style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              {totalClientsCount}
            </div>
            <div className="stat-card__label" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Total Clients
            </div>
          </div>
        </div>

        {/* Metric 2: Active Clients */}
        <div 
          className="stat-card" 
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '16px', 
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.015), 0 1px 2px rgba(0, 0, 0, 0.005)', 
            border: '1px solid rgba(16, 28, 107, 0.08)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div className="flex items-center justify-between">
            <div 
              style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '50%', 
                background: 'rgba(16, 185, 129, 0.08)', 
                color: '#10b981', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              <Building2 size={20} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '3px 10px', borderRadius: '12px' }}>
              Active
            </span>
          </div>
          <div>
            <div className="stat-card__value" style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              {totalActive}
            </div>
            <div className="stat-card__label" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Active Accounts
            </div>
          </div>
        </div>

        {/* Metric 3: Inactive/Suspended */}
        <div 
          className="stat-card" 
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '16px', 
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.015), 0 1px 2px rgba(0, 0, 0, 0.005)', 
            border: '1px solid rgba(16, 28, 107, 0.08)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div className="flex items-center justify-between">
            <div 
              style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '50%', 
                background: 'rgba(239, 68, 68, 0.08)', 
                color: '#ef4444', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              <Building2 size={20} />
            </div>
            {totalInactive > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)', padding: '3px 10px', borderRadius: '12px' }}>
                Review Needed
              </span>
            )}
          </div>
          <div>
            <div className="stat-card__value" style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              {totalInactive}
            </div>
            <div className="stat-card__label" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Inactive / Suspended
            </div>
          </div>
        </div>

        {/* Metric 4: Outstanding Billing */}
        <div 
          className="stat-card" 
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '16px', 
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.015), 0 1px 2px rgba(0, 0, 0, 0.005)', 
            border: '1px solid rgba(16, 28, 107, 0.08)',
            borderLeft: totalOutstanding > 0 ? '4px solid #ea580c' : '1px solid rgba(16, 28, 107, 0.08)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div className="flex items-center justify-between">
            <div 
              style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '50%', 
                background: 'rgba(234, 88, 12, 0.08)', 
                color: '#ea580c', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              <CreditCard size={20} />
            </div>
            {totalOutstanding > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#ea580c', background: 'rgba(234, 88, 12, 0.08)', padding: '3px 10px', borderRadius: '12px' }}>
                Unpaid
              </span>
            )}
          </div>
          <div>
            <div className="stat-card__value" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {formatCurrency(totalOutstanding)}
            </div>
            <div className="stat-card__label" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Outstanding Balance
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div 
        className="filter-bar"
        style={{
          background: 'var(--bg-surface)', 
          padding: 'var(--space-2) var(--space-4)', 
          borderRadius: 'var(--radius-lg)', 
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.01)'
        }}
      >
        <form className="filter-bar__search" method="GET" style={{ flex: 1 }}>
          <Building2 size={15} className="filter-bar__search-icon" />
          <input
            name="search"
            className="filter-bar__search-input"
            placeholder="Search clients by name, contact, email..."
            defaultValue={params.search ?? ''}
          />
          {/* Keep existing status param */}
          {params.status && <input type="hidden" name="status" value={params.status} />}
        </form>

        {/* Status filter chips */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED'] as const).map((s) => (
            <Link
              key={s}
              href={`/admin/clients?${params.search ? `search=${params.search}&` : ''}status=${s}`}
              className={`filter-chip${(!params.status && s === 'ALL') || params.status === s ? ' filter-chip--active' : ''}`}
            >
              {s === 'ALL' ? 'All Status' : s.charAt(0) + s.slice(1).toLowerCase()}
            </Link>
          ))}
        </div>
      </div>

      {/* Client List Table */}
      {clients.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', background: '#ffffff', borderRadius: '16px', border: '1px solid rgba(16, 28, 107, 0.08)' }}>
          <div className="empty-state">
            <div className="empty-state__icon" style={{ display: 'inline-flex', width: 50, height: 50, borderRadius: '50%', background: 'rgba(16, 28, 107, 0.05)', color: 'var(--text-muted)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Building2 size={24} />
            </div>
            <div className="empty-state__title" style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)' }}>No clients found</div>
            <div className="empty-state__desc" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 4, marginBottom: 16 }}>
              {params.search
                ? `No clients match "${params.search}". Try another query.`
                : 'Get started by adding your first client.'}
            </div>
            <Link href="/admin/clients/new" className="btn btn--primary btn--sm">
              <Plus size={14} />
              Add Client
            </Link>
          </div>
        </div>
      ) : (
        <div 
          className="table-wrapper" 
          style={{ 
            overflowX: 'auto', 
            background: '#ffffff', 
            borderRadius: '16px', 
            border: '1px solid rgba(16, 28, 107, 0.08)', 
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.01)', 
            padding: '8px 16px 16px 16px' 
          }}
        >
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(16, 28, 107, 0.08)' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Client / Representative</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact Info</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Legal &amp; Tax</th>
                <th style={{ padding: '16px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Projects / Bills</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Plan</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                <th style={{ padding: '16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client: any) => {
                const activePlan = client.subscriptions[0]?.plan
                const avatarColor = stringToHue(client.name)
                const unpaidCount = client.invoices.length

                return (
                  <tr 
                    key={client.id} 
                    style={{ 
                      borderBottom: '1px solid rgba(16, 28, 107, 0.04)',
                      verticalAlign: 'middle'
                    }}
                  >
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: `hsl(${avatarColor}, 70%, 93%)`,
                            color: `hsl(${avatarColor}, 70%, 35%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '14px',
                            flexShrink: 0
                          }}
                        >
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            href={`/admin/clients/${client.id}`}
                            style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}
                          >
                            {client.name}
                          </Link>
                          {client.contactPerson && (
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {client.contactPerson} {client.designation ? `(${client.designation})` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: 'var(--text-xs)' }}>
                        {client.email && (
                          <span style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <a href={`mailto:${client.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{client.email}</a>
                          </span>
                        )}
                        {client.phone && (
                          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> {client.phone}
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: 'var(--text-xs)' }}>
                        {client.gstin && (
                          <span style={{ color: 'var(--text-primary)' }}>
                            <span style={{ opacity: 0.6, fontWeight: 500, marginRight: '4px' }}>GST:</span>
                            <code style={{ fontFamily: 'monospace' }}>{client.gstin}</code>
                          </span>
                        )}
                        {client.pan && (
                          <span style={{ color: 'var(--text-muted)' }}>
                            <span style={{ opacity: 0.6, fontWeight: 500, marginRight: '4px' }}>PAN:</span>
                            <code style={{ fontFamily: 'monospace' }}>{client.pan}</code>
                          </span>
                        )}
                        {!client.gstin && !client.pan && <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </div>
                    </td>

                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                        <div title="Projects" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {client._count.projects}
                          </span>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em', fontWeight: 500 }}>Projects</span>
                        </div>
                        <div title="Unpaid Invoices" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: unpaidCount > 0 ? '#ea580c' : 'var(--text-primary)' }}>
                            {unpaidCount}
                          </span>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em', fontWeight: 500 }}>Unpaid</span>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '16px' }}>
                      {activePlan ? (
                        <span 
                          style={{ 
                            fontSize: '11px', 
                            fontWeight: 600, 
                            color: 'var(--accent-primary)',
                            background: 'rgba(35, 64, 184, 0.08)',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            border: '1px solid rgba(35, 64, 184, 0.15)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em'
                          }}
                        >
                          {activePlan.name}
                        </span>
                      ) : (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>No Active Plan</span>
                      )}
                    </td>

                    <td style={{ padding: '16px' }}>
                      <span className={`badge badge--${client.status.toLowerCase()}`}>
                        {client.status}
                      </span>
                    </td>

                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="btn btn--secondary btn--xs"
                        style={{
                          borderRadius: '8px',
                          border: '1px solid var(--border-default)',
                          background: 'var(--bg-surface)',
                          fontWeight: 500,
                          padding: '6px 12px',
                          fontSize: 'var(--text-xs)',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        Details <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Deterministic hue from a string for avatar coloring */
function stringToHue(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}
