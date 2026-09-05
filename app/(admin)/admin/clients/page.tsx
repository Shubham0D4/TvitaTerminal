import { prisma } from '@/lib/prisma'
import {
  Building2,
  Mail,
  Phone,
  Plus,
  FolderKanban,
  CreditCard,
  MapPin,
  Search,
  ArrowUpRight,
} from 'lucide-react'
import Link from 'next/link'
import { getCountryDisplay } from '@/lib/utils/countries'
import AdminViewToggle, { type AdminViewMode } from '@/app/components/admin/AdminViewToggle'

export const metadata = {
  title: 'Clients — Tvita Admin',
  description: 'Manage all agency clients — view, add, and track client activity.',
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
    },
    orderBy: { createdAt: 'desc' },
  })
}

type SearchParams = Promise<{ search?: string; status?: string; view?: string }>

function buildClientsHref(params: { search?: string; status?: string }, view: AdminViewMode) {
  const sp = new URLSearchParams()
  if (params.search) sp.set('search', params.search)
  if (params.status && params.status !== 'ALL') sp.set('status', params.status)
  if (view === 'list') sp.set('view', 'list')
  const q = sp.toString()
  return q ? `/admin/clients?${q}` : '/admin/clients'
}

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const view: AdminViewMode = params.view === 'list' ? 'list' : 'grid'
  const clients = await getClients(params.search, params.status)
  const totalActive = clients.filter((c) => c.status === 'ACTIVE').length
  const totalInactive = clients.filter((c) => c.status === 'INACTIVE' || c.status === 'SUSPENDED').length

  return (
    <div className="clients-page">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Clients</h1>
          <p className="page-header__subtitle">
            {clients.length} accounts · {totalActive} active · {totalInactive} inactive
          </p>
        </div>
        <div className="page-header__actions">
          <AdminViewToggle
            value={view}
            modes={['grid', 'list']}
            hrefFor={(v) => buildClientsHref({ search: params.search, status: params.status }, v)}
          />
          <Link href="/admin/clients/new" className="btn btn--primary">
            <Plus size={16} />
            New Client
          </Link>
        </div>
      </div>

      <div className="filter-bar">
        <form className="filter-bar__search" method="GET">
          <Search size={15} className="filter-bar__search-icon" />
          <input
            name="search"
            className="filter-bar__search-input"
            placeholder="Search clients..."
            defaultValue={params.search ?? ''}
          />
          {params.status && <input type="hidden" name="status" value={params.status} />}
          {view === 'list' && <input type="hidden" name="view" value="list" />}
        </form>

        {(['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED'] as const).map((s) => (
          <Link
            key={s}
            href={buildClientsHref(
              { search: params.search, status: s === 'ALL' ? undefined : s },
              view
            )}
            className={`filter-chip${(!params.status && s === 'ALL') || params.status === s ? ' filter-chip--active' : ''}`}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      {clients.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state__icon">
              <Building2 size={28} />
            </div>
            <div className="empty-state__title">No clients found</div>
            <div className="empty-state__desc">
              {params.search
                ? `No clients match "${params.search}". Try a different search.`
                : 'Get started by adding your first client.'}
            </div>
            <Link href="/admin/clients/new" className="btn btn--primary btn--sm">
              <Plus size={14} />
              Add Client
            </Link>
          </div>
        </div>
      ) : view === 'list' ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Projects</th>
                  <th>Invoices</th>
                  <th>Plan</th>
                  <th style={{ textAlign: 'right' }}>Open</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const activePlan = client.subscriptions[0]?.plan
                  return (
                    <tr key={client.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="cbento__avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <Link
                              href={`/admin/clients/${client.id}`}
                              style={{ fontWeight: 600, color: 'var(--text-primary)' }}
                            >
                              {client.name}
                            </Link>
                            {client.country && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {getCountryDisplay(client.country)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 'var(--text-sm)' }}>
                          {client.contactPerson || '—'}
                        </div>
                        {client.email && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{client.email}</div>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge--${client.status.toLowerCase()}`}>
                          {client.status}
                        </span>
                      </td>
                      <td>{client._count.projects}</td>
                      <td>{client._count.invoices}</td>
                      <td>{activePlan?.name ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href={`/admin/clients/${client.id}`} className="btn btn--ghost btn--xs">
                          Open <ArrowUpRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="cbento">
          {clients.map((client) => {
            const activePlan = client.subscriptions[0]?.plan
            return (
              <div key={client.id} className="cbento__cell">
                <Link href={`/admin/clients/${client.id}`} className="cbento__card">
                  <div className="cbento__face">
                    <div className="cbento__top">
                      <div className="cbento__avatar" aria-hidden>
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`badge badge--${client.status.toLowerCase()}`}>
                        {client.status}
                      </span>
                    </div>
                    <h2 className="cbento__name">{client.name}</h2>
                    <p className="cbento__contact">
                      {client.contactPerson || client.email || 'No primary contact'}
                    </p>
                    <div className="cbento__stats">
                      <span>
                        <FolderKanban size={12} /> {client._count.projects}
                      </span>
                      <span>
                        <CreditCard size={12} /> {client._count.invoices}
                      </span>
                    </div>
                  </div>

                  <div className="cbento__extra">
                    <div className="cbento__extra-inner">
                      <div>
                        {client.email && (
                          <div className="cbento__row">
                            <Mail size={12} />
                            <span>{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="cbento__row">
                            <Phone size={12} />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {client.country && (
                          <div className="cbento__row">
                            <MapPin size={12} />
                            <span>{getCountryDisplay(client.country)}</span>
                          </div>
                        )}
                        {client.gstin && (
                          <div className="cbento__row">
                            <span className="cbento__gst">GST</span>
                            <span>{client.gstin}</span>
                          </div>
                        )}
                        {activePlan && <div className="cbento__plan">{activePlan.name}</div>}
                        <span className="cbento__cta">Open account →</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
