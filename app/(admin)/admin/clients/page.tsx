import { prisma } from '@/lib/prisma'
import {
  Building2,
  Mail,
  Phone,
  Plus,
  FolderKanban,
  CreditCard,
} from 'lucide-react'
import Link from 'next/link'

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

type SearchParams = Promise<{ search?: string; status?: string }>

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const clients = await getClients(params.search, params.status)
  const totalActive = clients.filter((c: any) => c.status === 'ACTIVE').length
  const totalInactive = clients.filter((c: any) => c.status === 'INACTIVE').length

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Clients</h1>
          <p className="page-header__subtitle">
            {clients.length} total · {totalActive} active · {totalInactive} inactive
          </p>
        </div>
        <div className="page-header__actions">
          <Link href="/admin/clients/new" className="btn btn--primary">
            <Plus size={16} />
            New Client
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <form className="filter-bar__search" method="GET">
          <Building2 size={15} className="filter-bar__search-icon" />
          <input
            name="search"
            className="filter-bar__search-input"
            placeholder="Search clients..."
            defaultValue={params.search ?? ''}
          />
          {/* Keep existing status param */}
          {params.status && <input type="hidden" name="status" value={params.status} />}
        </form>

        {/* Status filter chips */}
        {(['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED'] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/clients?${params.search ? `search=${params.search}&` : ''}status=${s}`}
            className={`filter-chip${(!params.status && s === 'ALL') || params.status === s ? ' filter-chip--active' : ''}`}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      {/* Client Cards Grid */}
      {clients.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state__icon"><Building2 size={28} /></div>
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
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {clients.map((client: any) => {
            const activePlan = client.subscriptions[0]?.plan
            const avatarColor = stringToHue(client.name)
            return (
              <Link
                key={client.id}
                href={`/admin/clients/${client.id}`}
                className="client-card"
              >
                <div className="client-card__header">
                  <div
                    className="client-card__avatar"
                    style={{
                      background: `hsl(${avatarColor}, 70%, 15%)`,
                      color: `hsl(${avatarColor}, 70%, 65%)`,
                    }}
                  >
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="client-card__info">
                    <div className="client-card__name">{client.name}</div>
                    {client.contactPerson && (
                      <div className="client-card__company">{client.contactPerson}</div>
                    )}
                  </div>
                  <span className={`badge badge--${client.status.toLowerCase()}`}>
                    {client.status}
                  </span>
                </div>

                <div className="client-card__meta">
                  {client.email && (
                    <div className="client-card__meta-item">
                      <Mail size={12} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {client.email}
                      </span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="client-card__meta-item">
                      <Phone size={12} />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.gstin && (
                    <div className="client-card__meta-item">
                      <span style={{ fontSize: 10, fontFamily: 'monospace', opacity: 0.7 }}>GST</span>
                      <span style={{ fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                        {client.gstin}
                      </span>
                    </div>
                  )}
                </div>

                <div className="client-card__footer">
                  <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      <FolderKanban size={12} />
                      <span>{client._count.projects} projects</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      <CreditCard size={12} />
                      <span>{client._count.invoices} invoices</span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
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
