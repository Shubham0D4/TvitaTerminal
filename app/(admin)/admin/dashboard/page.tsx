import { getServerUser } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import {
  Users,
  Building2,
  FolderKanban,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

export const metadata = {
  title: 'Dashboard — Tvita Admin',
  description: 'Admin overview: clients, projects, team, billing at a glance.',
}

async function getDashboardStats() {
  const [
    totalClients,
    activeClients,
    totalProjects,
    activeProjects,
    completedProjects,
    teamMembers,
    pendingInvoices,
    totalRevenue,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { status: 'ACTIVE' } }),
    prisma.project.count(),
    prisma.project.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.project.count({ where: { status: 'COMPLETED' } }),
    prisma.profile.count({ where: { role: 'TEAM_MEMBER', isActive: true } }),
    prisma.invoice.count({ where: { status: 'PENDING' } }),
    prisma.invoice.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true },
    }),
  ])

  return {
    totalClients,
    activeClients,
    totalProjects,
    activeProjects,
    completedProjects,
    teamMembers,
    pendingInvoices,
    totalRevenue: Number(totalRevenue._sum.amount ?? 0),
  }
}

async function getRecentActivity() {
  const [recentProjects, recentClients, recentInvoices] = await Promise.all([
    prisma.project.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { name: true } } },
    }),
    prisma.client.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { name: true } } },
    }),
  ])

  return { recentProjects, recentClients, recentInvoices }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export default async function AdminDashboardPage() {
  const user = await getServerUser()
  const stats = await getDashboardStats()
  const activity = await getRecentActivity()

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="page-header__subtitle">
            Here&apos;s what&apos;s happening across your agency today.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="stat-card__icon stat-card__icon--blue">
              <Building2 size={20} />
            </div>
            <span className="badge badge--active" style={{ fontSize: '10px' }}>
              {stats.activeClients} active
            </span>
          </div>
          <div>
            <div className="stat-card__value">{stats.totalClients}</div>
            <div className="stat-card__label">Total Clients</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="stat-card__icon stat-card__icon--purple">
              <FolderKanban size={20} />
            </div>
            <span className="badge badge--in-progress" style={{ fontSize: '10px' }}>
              {stats.activeProjects} active
            </span>
          </div>
          <div>
            <div className="stat-card__value">{stats.totalProjects}</div>
            <div className="stat-card__label">Total Projects</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="stat-card__icon stat-card__icon--green">
              <Users size={20} />
            </div>
          </div>
          <div>
            <div className="stat-card__value">{stats.teamMembers}</div>
            <div className="stat-card__label">Team Members</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="stat-card__icon stat-card__icon--yellow">
              <CreditCard size={20} />
            </div>
            {stats.pendingInvoices > 0 && (
              <span className="badge badge--pending" style={{ fontSize: '10px' }}>
                {stats.pendingInvoices} pending
              </span>
            )}
          </div>
          <div>
            <div className="stat-card__value">{formatCurrency(stats.totalRevenue)}</div>
            <div className="stat-card__label">Revenue Collected</div>
          </div>
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Recent Projects */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              Recent Projects
            </h2>
            <a href="/admin/projects" className="btn btn--ghost btn--sm">View all</a>
          </div>

          {activity.recentProjects.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <div className="empty-state__icon"><FolderKanban size={24} /></div>
              <p className="empty-state__desc">No projects yet. Create your first project.</p>
              <a href="/admin/projects" className="btn btn--primary btn--sm">Create Project</a>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Client</th>
                    <th>Status</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.recentProjects.map((project: typeof activity.recentProjects[number]) => (
                    <tr key={project.id}>
                      <td>
                        <a
                          href={`/admin/projects/${project.id}`}
                          style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}
                        >
                          {project.name}
                        </a>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{project.client.name}</td>
                      <td>
                        <span className={`badge badge--${project.status.toLowerCase().replace('_', '-')}`}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-bar-container" style={{ width: '80px' }}>
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                            {project.progress}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Clients */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              Recent Clients
            </h2>
            <a href="/admin/clients" className="btn btn--ghost btn--sm">View all</a>
          </div>

          {activity.recentClients.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
              <p className="empty-state__desc">No clients yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {activity.recentClients.map((client: typeof activity.recentClients[number]) => (
                <a
                  key={client.id}
                  href={`/admin/clients/${client.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    transition: 'background var(--transition-fast)',
                  }}
                  className="client-row"
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'var(--accent-primary-muted)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-bold)',
                      flexShrink: 0,
                    }}
                  >
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-medium)',
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {client.name}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {formatDate(client.createdAt)}
                    </div>
                  </div>
                  <span className={`badge badge--${client.status.toLowerCase()}`}>
                    {client.status}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
            Recent Invoices
          </h2>
          <a href="/admin/billing" className="btn btn--ghost btn--sm">View all</a>
        </div>

        {activity.recentInvoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon"><CreditCard size={24} /></div>
            <p className="empty-state__desc">No invoices yet.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {activity.recentInvoices.map((invoice: typeof activity.recentInvoices[number]) => (
                  <tr key={invoice.id}>
                    <td>
                      <a
                        href={`/admin/billing/${invoice.id}`}
                        style={{ color: 'var(--accent-primary)', fontWeight: 'var(--font-medium)' }}
                      >
                        {invoice.invoiceNo}
                      </a>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{invoice.client.name}</td>
                    <td style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                      {formatCurrency(Number(invoice.amount))}
                    </td>
                    <td>
                      <span className={`badge badge--${invoice.status.toLowerCase()}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {invoice.dueDate ? formatDate(invoice.dueDate) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
