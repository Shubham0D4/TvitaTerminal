import { getServerUser, isAdmin, redirectToLogin, redirectToPortal } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { cleanupExpiredInvitations } from '@/lib/invitation-cleanup'
import QuotesModule from '@/app/components/projects/QuotesModule'
import Link from 'next/link'
import {
  Building2,
  FolderKanban,
  Users,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  FileText,
  DollarSign,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react'
import './dashboard.css'

export const metadata = {
  title: 'Admin Dashboard — Tvita Admin',
  description: 'Organization overview: clients, projects, team, exceptions, and financial health.',
}

function formatCurrency(amount: number | string, currency = 'INR'): string {
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : `${currency} `
  return `${symbol}${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

function getAuditBadgeColor(action: string): { bg: string; color: string } {
  switch (action.toUpperCase()) {
    case 'CREATE':
      return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }
    case 'UPDATE':
      return { bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }
    case 'DELETE':
      return { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }
    case 'LOGIN':
    case 'LOGOUT':
      return { bg: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }
    default:
      return { bg: 'rgba(107, 114, 128, 0.12)', color: '#6b7280' }
  }
}

export default async function AdminDashboardPage() {
  const user = await getServerUser()
  if (!user) redirectToLogin()
  if (!isAdmin(user)) redirectToPortal(user)

  const now = new Date()

  // 1. Fetch organization-wide data concurrently
  const [
    totalClients,
    activeClients,
    totalProjects,
    activeProjects,
    completedProjects,
    onHoldProjects,
    inReviewProjects,
    totalTeamMembers,
    pendingInvitesCount,
    allInvoices,
    allTasks,
    recentAuditLogs,
    recentProjects,
    recentClients,
    openTicketsCount,
    openTickets,
    quotesPendingCount,
    quotesPending,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { status: 'ACTIVE' } }),
    prisma.project.count(),
    prisma.project.count({ where: { status: { in: ['IN_PROGRESS', 'PLANNED', 'CLIENT_REVIEW', 'ON_HOLD'] } } }),
    prisma.project.count({ where: { status: 'COMPLETED' } }),
    prisma.project.count({ where: { status: 'ON_HOLD' } }),
    prisma.project.count({ where: { status: 'CLIENT_REVIEW' } }),
    prisma.profile.count({ where: { role: 'TEAM_MEMBER', isActive: true } }),
    prisma.profile.count({ where: { role: 'TEAM_MEMBER', isActive: false, magicLinkToken: { not: null } } }),
    prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { name: true } } },
    }),
    prisma.task.findMany({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        projectId: true,
        project: { select: { name: true } },
        assignee: { select: { name: true } },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { actor: { select: { name: true, email: true } } },
    }),
    prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: {
        client: { select: { id: true, name: true, currency: true } },
        lead: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        _count: { select: { projects: true } },
      },
    }),
    prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.ticket.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      take: 5,
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { name: true } },
      },
    }),
    prisma.quote.count({ where: { status: { in: ['PENDING', 'COUNTER_OFFERED'] } } }),
    prisma.quote.findMany({
      where: { status: { in: ['PENDING', 'COUNTER_OFFERED'] } },
      take: 5,
      include: { client: { select: { name: true } } },
    }),
  ])

  // Financial aggregates
  const paidInvoices = allInvoices.filter((inv) => inv.status === 'PAID')
  const pendingInvoices = allInvoices.filter((inv) => inv.status === 'PENDING')
  const overdueInvoices = allInvoices.filter(
    (inv) => inv.status === 'OVERDUE' || (inv.status === 'PENDING' && inv.dueDate && new Date(inv.dueDate) < now)
  )

  const totalCollected = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)
  const totalOutstanding = pendingInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0) + overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)

  // Construct Exceptions list
  const exceptionsList: Array<{
    id: string
    title: string
    subtitle: string
    badgeText: string
    badgeStyle: { background: string; color: string }
    link: string
  }> = []

  // 1. Overdue Invoices Exception
  overdueInvoices.forEach((inv) => {
    exceptionsList.push({
      id: `invoice-${inv.id}`,
      title: `Invoice ${inv.invoiceNo} is Overdue`,
      subtitle: `${inv.client.name} owes ${formatCurrency(Number(inv.amount), inv.currency)} (Due: ${formatDate(inv.dueDate)})`,
      badgeText: 'Overdue',
      badgeStyle: { background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' },
      link: `/admin/billing/${inv.id}`,
    })
  })

  // 2. Open Support Tickets Exception
  openTickets.forEach((ticket) => {
    exceptionsList.push({
      id: `ticket-${ticket.id}`,
      title: `Support Ticket: ${ticket.title}`,
      subtitle: `Project: ${ticket.project.name} · Priority: ${ticket.priority} · Creator: ${ticket.creator?.name ?? 'Client'}`,
      badgeText: 'Support',
      badgeStyle: { background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' },
      link: `/admin/projects/${ticket.projectId}`,
    })
  })

  // 3. Blocked Tasks Exception
  const blockedTasks = allTasks.filter((t) => t.status === 'BLOCKED')
  blockedTasks.forEach((task) => {
    exceptionsList.push({
      id: `task-blocked-${task.id}`,
      title: `Blocked Task: ${task.title}`,
      subtitle: `Project: ${task.project?.name ?? 'General'} · Assigned to: ${task.assignee?.name ?? 'Unassigned'}`,
      badgeText: 'Blocked',
      badgeStyle: { background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' },
      link: `/admin/projects/${task.projectId}`,
    })
  })

  // 4. Projects without Team Lead Exception
  const unassignedLeadProjects = recentProjects.filter((p) => !p.leadId && p.status !== 'COMPLETED' && p.status !== 'CANCELLED')
  unassignedLeadProjects.forEach((proj) => {
    exceptionsList.push({
      id: `proj-lead-${proj.id}`,
      title: `Project needs Team Lead: ${proj.name}`,
      subtitle: `Client: ${proj.client.name} (Status: ${proj.status})`,
      badgeText: 'Needs Lead',
      badgeStyle: { background: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5' },
      link: `/admin/projects/${proj.id}`,
    })
  })

  // 5. Overdue Tasks Exception
  const overdueTasks = allTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now)
  overdueTasks.forEach((task) => {
    exceptionsList.push({
      id: `task-overdue-${task.id}`,
      title: `Overdue Task: ${task.title}`,
      subtitle: `Project: ${task.project?.name ?? 'General'} · Due: ${formatDate(task.dueDate)}`,
      badgeText: 'Overdue Task',
      badgeStyle: { background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' },
      link: `/admin/projects/${task.projectId}`,
    })
  })

  // Limit exceptions to 5 items
  const exceptionsToShow = exceptionsList.slice(0, 5)

  return (
    <div className="admin-dashboard">
      {/* ── Page Header ── */}
      <div className="page-header flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-header__title">Dashboard</h1>
            <span className="badge-admin">CONTROL TOWER</span>
          </div>
          <p className="page-header__subtitle">
            Overview of clients, projects, team, exceptions, and financial health.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/admin/clients/new" className="btn btn--secondary btn--sm">
            + Client
          </Link>
          <Link href="/admin/projects/new" className="btn btn--secondary btn--sm">
            + Project
          </Link>
          <Link href="/admin/billing/new" className="btn btn--primary btn--sm">
            + Invoice
          </Link>
        </div>
      </div>

      {/* ── KPI Metric Cards Grid ── */}
      <div className="grid grid-cols-4 gap-4">
        {/* Metric Card 1: Clients */}
        <div className="stat-card">
          <div className="flex justify-between items-start">
            <div>
              <div className="stat-card__value">{activeClients}</div>
              <div className="stat-card__label">Active Clients</div>
            </div>
            <div className="stat-card__icon stat-card__icon--blue">
              <Building2 size={20} />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted" style={{ borderTop: '1px solid rgba(0,0,0,0.03)', paddingTop: 8 }}>
            <span>{totalClients} registered total</span>
            <span className="badge-metric" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
              {((activeClients / (totalClients || 1)) * 100).toFixed(0)}% active
            </span>
          </div>
        </div>

        {/* Metric Card 2: Projects */}
        <div className="stat-card">
          <div className="flex justify-between items-start">
            <div>
              <div className="stat-card__value">{activeProjects}</div>
              <div className="stat-card__label">Active Projects</div>
            </div>
            <div className="stat-card__icon stat-card__icon--blue">
              <FolderKanban size={20} />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted" style={{ borderTop: '1px solid rgba(0,0,0,0.03)', paddingTop: 8 }}>
            <span>{completedProjects} completed total</span>
            <span className="badge-metric" style={{ background: 'rgba(35,64,184,0.1)', color: 'var(--accent-primary)' }}>
              {activeProjects} in progress
            </span>
          </div>
        </div>

        {/* Metric Card 3: Support Tickets */}
        <div className="stat-card" style={{ borderLeft: openTicketsCount > 0 ? '3px solid var(--color-danger)' : undefined }}>
          <div className="flex justify-between items-start">
            <div>
              <div className="stat-card__value" style={{ color: openTicketsCount > 0 ? 'var(--color-danger)' : undefined }}>
                {openTicketsCount}
              </div>
              <div className="stat-card__label">Support Tickets</div>
            </div>
            <div className={`stat-card__icon ${openTicketsCount > 0 ? 'stat-card__icon--red' : 'stat-card__icon--green'}`}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted" style={{ borderTop: '1px solid rgba(0,0,0,0.03)', paddingTop: 8 }}>
            <span>Awaiting admin response</span>
            {openTicketsCount > 0 && (
              <span className="badge-metric" style={{ background: 'rgba(229,72,77,0.1)', color: 'var(--color-danger)' }}>
                Needs Action
              </span>
            )}
          </div>
        </div>

        {/* Metric Card 4: Receivables */}
        <div className="stat-card" style={{ borderLeft: totalOverdue > 0 ? '3px solid var(--color-warning)' : undefined }}>
          <div className="flex justify-between items-start">
            <div>
              <div className="stat-card__value" style={{ color: totalOverdue > 0 ? '#d97706' : undefined }}>
                {formatCurrency(totalOutstanding)}
              </div>
              <div className="stat-card__label">Outstanding Balance</div>
            </div>
            <div className={`stat-card__icon ${totalOverdue > 0 ? 'stat-card__icon--yellow' : 'stat-card__icon--blue'}`}>
              <CreditCard size={20} />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted" style={{ borderTop: '1px solid rgba(0,0,0,0.03)', paddingTop: 8 }}>
            <span>{formatCurrency(totalOverdue)} overdue</span>
            {totalOverdue > 0 && (
              <span className="badge-metric" style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>
                Overdue Invoices
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Organization Health Status Banner ── */}
      <div className="dashboard-card org-health-card">
        <div>
          <h3>Deliverable Health Metrics</h3>
        </div>
        <div className="health-badges-row">
          <span className="health-badge health-badge--track">
            {completedProjects} Completed Projects
          </span>
          <span className="health-badge health-badge--planned">
            {totalProjects - activeProjects - completedProjects} Planned Projects
          </span>
          <span className="health-badge health-badge--blocked">
            {blockedTasks.length} Blocked Tasks
          </span>
          <span className="health-badge health-badge--delayed">
            {overdueTasks.length} Overdue Tasks
          </span>
        </div>
      </div>

      {/* ── Exceptions Queue and Active Data Tables ── */}
      <div className="grid grid-cols-3 gap-6">
        {/* Column 1 & 2: Recent Projects & Invoices */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Recent Active Projects */}
          <div className="dashboard-card" style={{ padding: '20px 24px' }}>
            <div className="flex justify-between items-center mb-2">
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: '#0c0d12', margin: 0 }}>
                Active Client Projects
              </h2>
              <Link href="/admin/projects" className="flex items-center gap-1 text-xs color-brand font-semibold text-decoration-none">
                View All <ArrowUpRight size={13} />
              </Link>
            </div>
            {recentProjects.length === 0 ? (
              <div className="empty-state">
                <FolderKanban className="empty-state__icon" size={20} />
                <div className="empty-state__title">No active projects</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Client</th>
                      <th>Lead</th>
                      <th>Progress</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentProjects.map((project) => (
                      <tr key={project.id}>
                        <td style={{ fontWeight: 600 }}>
                          <Link href={`/admin/projects/${project.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                            {project.name}
                          </Link>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{project.client.name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{project.lead?.name ?? 'Unassigned'}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="progress-bar-container" style={{ width: 80, height: 5 }}>
                              <div className="progress-bar-fill" style={{ width: `${project.progress}%`, background: 'var(--accent-primary)' }} />
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{project.progress}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge--${project.status.toLowerCase().replace(/_/g, '-')}`}>
                            {project.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Invoices Table */}
          <div className="dashboard-card" style={{ padding: '20px 24px' }}>
            <div className="flex justify-between items-center mb-2">
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: '#0c0d12', margin: 0 }}>
                Recent Invoices
              </h2>
              <Link href="/admin/billing" className="flex items-center gap-1 text-xs color-brand font-semibold text-decoration-none">
                View All <ArrowUpRight size={13} />
              </Link>
            </div>
            {allInvoices.length === 0 ? (
              <div className="empty-state">
                <CreditCard className="empty-state__icon" size={20} />
                <div className="empty-state__title">No invoices issued</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Client</th>
                      <th>Issue Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allInvoices.slice(0, 5).map((invoice) => (
                      <tr key={invoice.id}>
                        <td style={{ fontWeight: 600 }}>
                          <Link href={`/admin/billing/${invoice.id}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                            {invoice.invoiceNo}
                          </Link>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{invoice.client.name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{formatDate(invoice.issuedDate)}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(Number(invoice.amount), invoice.currency)}</td>
                        <td>
                          <span className={`badge badge--${invoice.status.toLowerCase()}`}>
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Needs Attention Exception Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Needs Attention Panel */}
          <div className="dashboard-card exceptions-card" style={{ borderLeft: exceptionsToShow.length > 0 ? '3px solid var(--color-danger)' : undefined }}>
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: '#0c0d12', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={18} className={exceptionsToShow.length > 0 ? 'text-danger' : 'text-success'} />
              Needs Attention ({exceptionsList.length})
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: '#71717a', marginBottom: 'var(--space-4)' }}>
              Real-time exception logs requiring administrative resolution.
            </p>

            {exceptionsToShow.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 16px' }}>
                <CheckCircle2 size={24} style={{ color: '#10b981', marginBottom: 8 }} />
                <div className="empty-state__title" style={{ color: '#10b981' }}>System On Track</div>
                <div className="empty-state__desc">All items cleared and operations active.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {exceptionsToShow.map((ex) => (
                  <Link
                    key={ex.id}
                    href={ex.link}
                    className="exception-item"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span
                          className="exception-badge"
                          style={{
                            background: ex.badgeStyle.background,
                            color: ex.badgeStyle.color,
                          }}
                        >
                          {ex.badgeText}
                        </span>
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                        {ex.title}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{ex.subtitle}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Audit Trail Log */}
          <div className="dashboard-card" style={{ padding: '20px 24px' }}>
            <div className="flex justify-between items-center mb-3">
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: '#0c0d12', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={18} style={{ color: 'var(--accent-primary)' }} />
                Security Audit Trail
              </h2>
            </div>
            {recentAuditLogs.length === 0 ? (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>No audit logs captured.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentAuditLogs.map((log) => {
                  const badgeColor = getAuditBadgeColor(log.action)
                  return (
                    <div
                      key={log.id}
                      className="activity-item"
                      style={{
                        padding: '10px 12px',
                        background: '#fcfdfe',
                        border: '1px solid rgba(16, 28, 107, 0.03)',
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex justify-between items-center mb-1">
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: badgeColor.bg,
                              color: badgeColor.color,
                            }}
                          >
                            {log.action}
                          </span>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                            {new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(log.createdAt))}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {log.entityType}: {log.entityLabel || log.entityId}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                          Actor: {log.actor?.name ?? log.actorEmail ?? 'System'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

