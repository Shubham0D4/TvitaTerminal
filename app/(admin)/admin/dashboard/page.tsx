import { getServerUser, isAdmin, redirectToLogin, redirectToPortal } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { cleanupExpiredInvitations } from '@/lib/invitation-cleanup'
import BentoClamp from '@/app/components/ui/BentoClamp'
import {
  Building2,
  FolderKanban,
  Users,
  CreditCard,
  Clock,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
  Plus,
  ArrowUpRight,
  Receipt,
  CheckCircle2,
} from 'lucide-react'

export const metadata = {
  title: 'Admin Dashboard — Tvita Admin',
  description: 'Organization overview: clients, projects, team, exceptions, and financial health.',
}

// ─────────────────────────────────────────────
// HELPER UTILITIES
// ─────────────────────────────────────────────

function formatCurrency(amount: number | string | { toString(): string }, currency = 'INR') {
  const num = typeof amount === 'number' ? amount : parseFloat(amount.toString())
  if (isNaN(num)) return `${currency} 0`
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(num)
  } catch {
    return `${currency} ${num.toLocaleString('en-IN')}`
  }
}

function formatDate(dateInput: Date | string | null | undefined) {
  if (!dateInput) return 'TBD'
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return 'TBD'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

function formatShortDate(dateInput: Date | string | null | undefined) {
  if (!dateInput) return 'TBD'
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return 'TBD'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
  }).format(d)
}

function getOrgProjectHealth(
  project: {
    status: string
    progress: number
    endDate?: Date | string | null
    leadId?: string | null
  },
  projectTasks: Array<{ status: string; dueDate?: Date | string | null }> = [],
  openIssuesCount = 0
) {
  if (project.status === 'COMPLETED') {
    return { label: 'Completed', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', badge: 'Completed', text: 'On Track' }
  }

  if (!project.leadId) {
    return { label: 'No Lead', color: '#d97706', bg: 'rgba(245, 158, 11, 0.12)', badge: 'No Lead', text: 'Unassigned Lead' }
  }

  const blockedTasksCount = projectTasks.filter((t) => t.status === 'BLOCKED').length
  if (blockedTasksCount > 0 || openIssuesCount > 0) {
    return {
      label: 'Blocked',
      color: '#dc2626',
      bg: 'rgba(220, 38, 38, 0.12)',
      badge: 'Blocked',
      text: `${blockedTasksCount} task(s) / issue(s) blocked`,
    }
  }

  const now = new Date()
  const overdueTasksCount = projectTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
  ).length

  if (project.endDate) {
    const end = new Date(project.endDate)
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24))

    if ((diffDays < 0 && project.progress < 100) || overdueTasksCount >= 2) {
      return {
        label: 'Delayed',
        color: '#dc2626',
        bg: 'rgba(220, 38, 38, 0.12)',
        badge: 'Delayed',
        text: diffDays < 0 ? `Past target by ${Math.abs(diffDays)} day(s)` : `${overdueTasksCount} overdue tasks`,
      }
    }

    if ((diffDays <= 7 && project.progress < 75) || overdueTasksCount === 1) {
      return {
        label: 'At Risk',
        color: '#d97706',
        bg: 'rgba(217, 119, 6, 0.12)',
        badge: 'At Risk',
        text: diffDays <= 7 ? `Target date in ${diffDays} days (${project.progress}%)` : '1 overdue task',
      }
    }
  }

  return { label: 'On Track', color: '#059669', bg: 'rgba(5, 150, 105, 0.12)', badge: 'On Track', text: 'On Track' }
}

// ─────────────────────────────────────────────
// ADMIN DASHBOARD — Control Center Mosaic
// ─────────────────────────────────────────────

export default async function AdminDashboardPage() {
  cleanupExpiredInvitations().catch((err) => console.error('[Cleanup Error]', err))

  const user = await getServerUser()
  if (!user) redirectToLogin()
  if (!isAdmin(user)) redirectToPortal(user)

  const now = new Date()

  const [
    totalClientsCount,
    activeClientsCount,
    inactiveClientsCount,
    totalProjectsCount,
    activeProjectsCount,
    totalTeamMembersCount,
    pendingInvitesCount,
    projects,
    allInvoices,
    allTasks,
    recentClients,
    teamRolesGroup,
    openQuotes,
    pendingQuotesCount,
    negotiatingQuotesCount,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { status: 'ACTIVE' } }),
    prisma.client.count({ where: { status: { in: ['INACTIVE', 'SUSPENDED'] } } }),
    prisma.project.count(),
    prisma.project.count({ where: { status: { in: ['IN_PROGRESS', 'PLANNED'] } } }),
    prisma.profile.count({ where: { role: 'TEAM_MEMBER', isActive: true } }),
    prisma.profile.count({ where: { role: 'TEAM_MEMBER', isActive: false, magicLinkToken: { not: null } } }),
    prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        progress: true,
        endDate: true,
        leadId: true,
        clientId: true,
        updatedAt: true,
        client: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        invoiceNo: true,
        amount: true,
        currency: true,
        status: true,
        dueDate: true,
        client: { select: { id: true, name: true } },
      },
    }),
    prisma.task.findMany({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      select: {
        id: true,
        projectId: true,
        title: true,
        status: true,
        dueDate: true,
        project: { select: { name: true } },
      },
    }),
    prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.profile.groupBy({
      by: ['teamRole'],
      where: { role: 'TEAM_MEMBER', isActive: true },
      _count: { _all: true },
    }),
    prisma.quote.findMany({
      where: { status: { in: ['PENDING', 'COUNTER_OFFERED'] } },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: {
        id: true,
        title: true,
        status: true,
        budget: true,
        counterBudget: true,
        currency: true,
        updatedAt: true,
        client: { select: { name: true } },
      },
    }),
    prisma.quote.count({ where: { status: 'PENDING' } }),
    prisma.quote.count({ where: { status: 'COUNTER_OFFERED' } }),
  ])

  const paidInvoices = allInvoices.filter((inv) => inv.status === 'PAID')
  const pendingInvoices = allInvoices.filter((inv) => inv.status === 'PENDING')
  const overdueInvoices = allInvoices.filter(
    (inv) => inv.status === 'OVERDUE' || (inv.status === 'PENDING' && inv.dueDate && new Date(inv.dueDate) < now)
  )

  const totalInvoiced = allInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)
  const totalOutstanding = pendingInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)
  const currencySymbol = allInvoices[0]?.currency || 'INR'

  const overdueTasks = allTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now)
  const unassignedLeadProjects = projects.filter((p) => !p.leadId)
  const delayedProjects = projects.filter(
    (p) => p.endDate && new Date(p.endDate) < now && p.progress < 100 && p.status !== 'COMPLETED'
  )
  const atRiskProjects = projects.filter((p) => {
    if (!p.endDate || p.status === 'COMPLETED') return false
    const diffDays = Math.ceil((new Date(p.endDate).getTime() - now.getTime()) / (1000 * 3600 * 24))
    return diffDays > 0 && diffDays <= 7 && p.progress < 75
  })

  const onTrackCount = projects.filter((p) => {
    const health = getOrgProjectHealth(p, allTasks.filter((t) => t.projectId === p.id))
    return health.label === 'On Track'
  }).length

  const atRiskCount = atRiskProjects.length
  const delayedCount = delayedProjects.length
  const blockedCount = projects.filter((p) => {
    const health = getOrgProjectHealth(p, allTasks.filter((t) => t.projectId === p.id))
    return health.label === 'Blocked'
  }).length

  const overallHealthColor =
    delayedCount > 0 || blockedCount > 0 ? '#ef4444' : atRiskCount > 0 ? '#f59e0b' : '#10b981'

  const overallHealthText =
    delayedCount > 0 || blockedCount > 0
      ? 'Attention Required'
      : atRiskCount > 0
        ? 'At Risk'
        : 'All Systems Operational'

  const adminExceptionsQueue: Array<{
    id: string
    category: 'OVERDUE' | 'DELAYED' | 'UNASSIGNED' | 'INVITE' | 'FINANCE'
    title: string
    subtitle: string
    badge: { text: string; bg: string; color: string }
    ctaText: string
    href: string
  }> = []

  if (overdueTasks.length > 0) {
    adminExceptionsQueue.push({
      id: 'exc-overdue-tasks',
      category: 'OVERDUE',
      title: `${overdueTasks.length} overdue task(s) across projects`,
      subtitle: `e.g., "${overdueTasks[0].title}" (${overdueTasks[0].project.name})`,
      badge: { text: 'Overdue Tasks', bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
      ctaText: 'View Tasks',
      href: '/admin/projects',
    })
  }

  if (delayedProjects.length > 0) {
    adminExceptionsQueue.push({
      id: 'exc-delayed-projects',
      category: 'DELAYED',
      title: `${delayedProjects.length} delayed project(s) past target date`,
      subtitle: `e.g., "${delayedProjects[0].name}" (Target: ${formatDate(delayedProjects[0].endDate)})`,
      badge: { text: 'Delayed Projects', bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
      ctaText: 'View Projects',
      href: '/admin/projects',
    })
  }

  if (unassignedLeadProjects.length > 0) {
    adminExceptionsQueue.push({
      id: 'exc-no-lead',
      category: 'UNASSIGNED',
      title: `${unassignedLeadProjects.length} project(s) without an assigned lead`,
      subtitle: `e.g., "${unassignedLeadProjects[0].name}"`,
      badge: { text: 'Unassigned Lead', bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
      ctaText: 'Assign Lead',
      href: '/admin/projects',
    })
  }

  if (pendingInvitesCount > 0) {
    adminExceptionsQueue.push({
      id: 'exc-invites',
      category: 'INVITE',
      title: `${pendingInvitesCount} pending user invitation(s)`,
      subtitle: 'Team members invited via magic-link awaiting activation',
      badge: { text: 'Pending Invites', bg: 'rgba(59,130,246,0.12)', color: '#2563eb' },
      ctaText: 'View Team',
      href: '/admin/team',
    })
  }

  if (overdueInvoices.length > 0) {
    adminExceptionsQueue.push({
      id: 'exc-overdue-invoices',
      category: 'FINANCE',
      title: `${overdueInvoices.length} overdue invoice(s) totaling ${formatCurrency(totalOverdue)}`,
      subtitle: `e.g., Invoice #${overdueInvoices[0].invoiceNo} (${overdueInvoices[0].client.name})`,
      badge: { text: 'Overdue Invoices', bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
      ctaText: 'View Invoices',
      href: '/admin/billing',
    })
  }

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now)

  return (
    <div className="admin-dash">
      {/* ── 1. Admin Header ── */}
      <header className="admin-dash__header">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="admin-dash__greeting">
              {greeting}, {user.name?.split(' ')[0]}
            </h1>
            <span className="admin-dash__health" title={`Organization Health: ${overallHealthText}`}>
              <span
                className="admin-dash__health-dot"
                style={{
                  backgroundColor: overallHealthColor,
                  boxShadow: `0 0 8px ${overallHealthColor}`,
                }}
              />
              {overallHealthText}
            </span>
          </div>
          <p className="admin-dash__lede">
            Operational overview · {todayLabel}
          </p>
        </div>

        <div className="admin-dash__actions">
          <a href="/admin/clients/new" className="btn btn--secondary btn--sm">
            <Plus size={14} /> Add Client
          </a>
          <a href="/admin/projects/new" className="btn btn--primary btn--sm">
            <Plus size={14} /> New Project
          </a>
        </div>
      </header>

      {/* ── 2. Primary Metrics Mosaic ── */}
      <section className="admin-dash__grid" aria-label="Key performance metrics">
        {/* Total Clients — compact */}
        <div className="admin-dash__cell admin-dash__cell--3">
          <div className="admin-dash__panel admin-dash__panel--metric admin-dash__panel--compact">
            <div className="flex items-center justify-between">
              <div className="stat-card__icon stat-card__icon--blue" style={{ width: 36, height: 36 }}>
                <Building2 size={18} />
              </div>
              <span className="admin-dash__chip admin-dash__chip--blue">{activeClientsCount} active</span>
            </div>
            <div>
              <div className="admin-dash__metric-value">{totalClientsCount}</div>
              <div className="admin-dash__metric-label">Total Clients</div>
            </div>
          </div>
        </div>

        {/* Total Projects — wide feature metric */}
        <div className="admin-dash__cell admin-dash__cell--5">
          <div className="admin-dash__panel admin-dash__panel--metric admin-dash__panel--tall">
            <div className="flex items-center justify-between">
              <div className="stat-card__icon stat-card__icon--purple">
                <FolderKanban size={20} />
              </div>
              <span className="admin-dash__chip admin-dash__chip--purple">{activeProjectsCount} active</span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="admin-dash__metric-value admin-dash__metric-value--lg">{totalProjectsCount}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>projects</span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="progress-bar-container" style={{ flex: 1, height: 6, borderRadius: 3 }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width:
                        totalProjectsCount > 0
                          ? `${Math.round((activeProjectsCount / totalProjectsCount) * 100)}%`
                          : '0%',
                      backgroundColor: '#7c3aed',
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {onTrackCount} on track
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members — compact */}
        <div className="admin-dash__cell admin-dash__cell--4">
          <div
            className="admin-dash__panel admin-dash__panel--metric admin-dash__panel--compact"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}
          >
            <div className="stat-card__icon stat-card__icon--green" style={{ width: 44, height: 44, flexShrink: 0 }}>
              <Users size={22} />
            </div>
            <div>
              <div className="admin-dash__metric-value">{totalTeamMembersCount}</div>
              <div className="admin-dash__metric-label">Team Members</div>
              {pendingInvitesCount > 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#d97706', marginTop: 2, display: 'inline-block' }}>
                  {pendingInvitesCount} pending invite(s)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Overdue Tasks — attention */}
        <div className="admin-dash__cell admin-dash__cell--3">
          <div
            className={`admin-dash__panel admin-dash__panel--metric admin-dash__panel--compact${
              overdueTasks.length > 0 ? ' admin-dash__panel--danger' : ''
            }`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
          >
            <div className="stat-card__icon stat-card__icon--red" style={{ width: 40, height: 40, flexShrink: 0 }}>
              <Clock size={20} />
            </div>
            <div>
              <div
                className="admin-dash__metric-value admin-dash__metric-value--sm"
                style={{ color: overdueTasks.length > 0 ? '#ef4444' : undefined }}
              >
                {overdueTasks.length}
              </div>
              <div className="admin-dash__metric-label">Overdue Tasks</div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: overdueTasks.length > 0 ? '#ef4444' : 'var(--text-secondary)',
                }}
              >
                {overdueTasks.length > 0 ? 'Action required' : 'All clear'}
              </span>
            </div>
          </div>
        </div>

        {/* At Risk / Delayed — compact warning */}
        <div className="admin-dash__cell admin-dash__cell--3">
          <div
            className={`admin-dash__panel admin-dash__panel--metric admin-dash__panel--compact${
              atRiskCount + delayedCount > 0 ? ' admin-dash__panel--warn' : ''
            }`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
          >
            <div className="stat-card__icon stat-card__icon--yellow" style={{ width: 40, height: 40, flexShrink: 0 }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div
                className="admin-dash__metric-value admin-dash__metric-value--sm"
                style={{ color: atRiskCount + delayedCount > 0 ? '#d97706' : undefined }}
              >
                {atRiskCount + delayedCount}
              </div>
              <div className="admin-dash__metric-label">At Risk / Delayed</div>
              <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)' }}>
                {atRiskCount} risk · {delayedCount} delayed
              </span>
            </div>
          </div>
        </div>

        {/* Outstanding Billing — wide financial signal */}
        <div className="admin-dash__cell admin-dash__cell--6">
          <div className="admin-dash__panel admin-dash__panel--metric admin-dash__panel--accent admin-dash__panel--tall">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="stat-card__icon stat-card__icon--blue">
                <CreditCard size={20} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {totalOverdue > 0 && (
                  <span className="admin-dash__chip admin-dash__chip--red">
                    {formatCurrency(totalOverdue, currencySymbol)} overdue
                  </span>
                )}
                <span className="admin-dash__chip admin-dash__chip--blue">Outstanding Billing</span>
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Pending Collections
              </div>
              <div className="admin-dash__metric-value admin-dash__metric-value--lg" style={{ marginTop: 4 }}>
                {formatCurrency(totalOutstanding, currencySymbol)}
              </div>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  marginTop: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <span>
                  Collected:{' '}
                  <strong style={{ color: '#059669' }}>{formatCurrency(totalPaid, currencySymbol)}</strong>
                </span>
                <span aria-hidden>·</span>
                <span>
                  Invoiced:{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(totalInvoiced, currencySymbol)}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Attention + Team (paired row) ── */}
      <section className="admin-dash__grid" aria-label="Attention and team">
        <div className="admin-dash__cell admin-dash__cell--7">
          <div className="admin-dash__panel">
            <div className="admin-dash__panel-head">
              <div className="flex items-center gap-2">
                <ShieldAlert
                  size={18}
                  style={{ color: adminExceptionsQueue.length > 0 ? '#dc2626' : '#10b981', flexShrink: 0 }}
                />
                <div>
                  <h2 className="admin-dash__panel-title">Needs Attention</h2>
                  <p className="admin-dash__panel-sub">Exceptions requiring admin action</p>
                </div>
              </div>
              {adminExceptionsQueue.length > 0 && (
                <span className="admin-dash__chip admin-dash__chip--red">
                  {adminExceptionsQueue.length} action(s)
                </span>
              )}
            </div>

            {adminExceptionsQueue.length === 0 ? (
              <div className="admin-dash__status-ok">
                <CheckCircle2 size={20} style={{ color: '#10b981', flexShrink: 0 }} />
                <div>
                  <div className="admin-dash__status-ok-title">Everything looks good</div>
                  <div className="admin-dash__status-ok-desc">
                    No urgent actions require attention right now.
                  </div>
                </div>
              </div>
            ) : (
              <BentoClamp maxHeight={200} moreLabel="Show more">
                <div className="admin-dash__alert-list">
                  {adminExceptionsQueue.map((item) => (
                    <div key={item.id} className="admin-dash__alert-row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              background: item.badge.bg,
                              color: item.badge.color,
                              padding: '1px 6px',
                              borderRadius: 3,
                            }}
                          >
                            {item.badge.text}
                          </span>
                          <span
                            style={{
                              fontSize: 'var(--text-xs)',
                              fontWeight: 'var(--font-medium)',
                              color: 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.title}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.subtitle}
                        </div>
                      </div>
                      <a
                        href={item.href}
                        className="btn btn--secondary btn--xs"
                        style={{ flexShrink: 0, padding: '3px 10px', fontSize: 11 }}
                      >
                        {item.ctaText} <ChevronRight size={12} />
                      </a>
                    </div>
                  ))}
                </div>
              </BentoClamp>
            )}
          </div>
        </div>

        {/* Team Overview — compact widget */}
        <div className="admin-dash__cell admin-dash__cell--5">
          <div className="admin-dash__panel">
            <div className="admin-dash__panel-head">
              <div>
                <h2 className="admin-dash__panel-title">People</h2>
                <p className="admin-dash__panel-sub">Directory · roles &amp; invites</p>
              </div>
              <a href="/admin/team" className="btn btn--ghost btn--xs" style={{ fontSize: 11 }}>
                Open <ArrowUpRight size={12} />
              </a>
            </div>

            <div className="admin-dash__mini-stats admin-dash__mini-stats--3">
              <div className="admin-dash__mini-stat">
                <div className="admin-dash__mini-stat-value">{totalTeamMembersCount}</div>
                <div className="admin-dash__mini-stat-label">Members</div>
              </div>
              <div
                className="admin-dash__mini-stat"
                style={{ background: 'rgba(245,158,11,0.08)', border: 'none' }}
              >
                <div className="admin-dash__mini-stat-value" style={{ color: '#d97706' }}>
                  {pendingInvitesCount}
                </div>
                <div className="admin-dash__mini-stat-label" style={{ color: '#d97706' }}>
                  Invites
                </div>
              </div>
              <div
                className="admin-dash__mini-stat"
                style={{ background: 'rgba(79,70,229,0.08)', border: 'none' }}
              >
                <div className="admin-dash__mini-stat-value" style={{ color: '#4f46e5' }}>
                  {teamRolesGroup.length}
                </div>
                <div className="admin-dash__mini-stat-label" style={{ color: '#4f46e5' }}>
                  Roles
                </div>
              </div>
            </div>

            {teamRolesGroup.length > 0 && (
              <div className="admin-dash__list">
                {teamRolesGroup.slice(0, 3).map((r) => (
                  <div key={r.teamRole || 'UNASSIGNED'} className="admin-dash__list-row">
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>
                      {r.teamRole ? r.teamRole.replace('_', ' ') : 'General Team Member'}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-primary)' }}>
                      {r._count._all}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 4. Projects Overview — large operational card ── */}
      <section className="admin-dash__grid" aria-label="Projects overview">
        <div className="admin-dash__cell admin-dash__cell--12">
          <div className="admin-dash__panel">
            <div className="admin-dash__panel-head">
              <div>
                <h2 className="admin-dash__panel-title">Projects Overview</h2>
                <p className="admin-dash__panel-sub">
                  Active organization projects, leads &amp; completion health
                </p>
              </div>
              <a href="/admin/projects" className="btn btn--ghost btn--xs">
                View All <ChevronRight size={14} />
              </a>
            </div>

            {projects.length === 0 ? (
              <div className="admin-dash__status-ok" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                <FolderKanban size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    No active projects
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Create a project to begin tracking organization status.
                  </div>
                </div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table" style={{ fontSize: 'var(--text-xs)' }}>
                  <thead>
                    <tr>
                      <th>Project Name</th>
                      <th>Client</th>
                      <th>Lead</th>
                      <th>Status</th>
                      <th>Progress</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.slice(0, 5).map((project) => {
                      const projectTasksList = allTasks.filter((t) => t.projectId === project.id)
                      const health = getOrgProjectHealth(project, projectTasksList)

                      return (
                        <tr key={project.id}>
                          <td>
                            <a
                              href={`/admin/projects/${project.id}`}
                              style={{
                                fontWeight: 'var(--font-medium)',
                                color: 'var(--text-primary)',
                                textDecoration: 'none',
                              }}
                            >
                              {project.name}
                            </a>
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{project.client.name}</td>
                          <td>
                            {project.lead ? (
                              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                {project.lead.name.split(' ')[0]}
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 600,
                                  color: '#d97706',
                                  background: 'rgba(245,158,11,0.12)',
                                  padding: '1px 5px',
                                  borderRadius: 3,
                                }}
                              >
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: health.color,
                                background: health.bg,
                                padding: '1px 6px',
                                borderRadius: 4,
                              }}
                            >
                              {health.badge}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="progress-bar-container" style={{ width: 60, height: 5 }}>
                                <div
                                  className="progress-bar-fill"
                                  style={{ width: `${project.progress}%`, backgroundColor: health.color }}
                                />
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>
                                {project.progress}%
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <a
                              href={`/admin/projects/${project.id}`}
                              className="btn btn--secondary btn--xs"
                              style={{ padding: '2px 6px', fontSize: 10 }}
                            >
                              Manage <ArrowUpRight size={10} />
                            </a>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 5. Quotes + Client Accounts ── */}
      <section className="admin-dash__grid" aria-label="Quotes and clients">
        <div className="admin-dash__cell admin-dash__cell--7">
          <div className="admin-dash__panel">
            <div className="admin-dash__panel-head">
              <div>
                <h2 className="admin-dash__panel-title">Project Quotes &amp; Negotiations</h2>
                <p className="admin-dash__panel-sub">Open requests — open a quote to negotiate</p>
              </div>
              <a href="/admin/quotes" className="btn btn--ghost btn--xs">
                View <ChevronRight size={12} />
              </a>
            </div>

            <div className="admin-dash__mini-stats admin-dash__mini-stats--2">
              <div
                className="admin-dash__mini-stat"
                style={{ background: 'rgba(245,158,11,0.08)', border: 'none' }}
              >
                <div className="admin-dash__mini-stat-value" style={{ color: '#f59e0b' }}>
                  {pendingQuotesCount}
                </div>
                <div className="admin-dash__mini-stat-label" style={{ color: '#f59e0b' }}>
                  Pending
                </div>
              </div>
              <div
                className="admin-dash__mini-stat"
                style={{ background: 'rgba(139,92,246,0.08)', border: 'none' }}
              >
                <div className="admin-dash__mini-stat-value" style={{ color: '#8b5cf6' }}>
                  {negotiatingQuotesCount}
                </div>
                <div className="admin-dash__mini-stat-label" style={{ color: '#8b5cf6' }}>
                  Negotiating
                </div>
              </div>
            </div>

            <BentoClamp maxHeight={180} moreHref="/admin/quotes" moreLabel="Show more">
              <div className="admin-dash__list">
                {openQuotes.length === 0 ? (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', padding: '8px 0' }}>
                    No open quotes right now.
                  </div>
                ) : (
                  openQuotes.map((quote) => {
                    const amount = Number(quote.counterBudget ?? quote.budget)
                    const statusTone = quote.status === 'COUNTER_OFFERED'
                      ? { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6', label: 'Negotiating' }
                      : { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Pending' }
                    return (
                      <a key={quote.id} href={`/admin/quotes/${quote.id}`} className="admin-dash__list-row">
                        <div>
                          <div
                            style={{
                              fontSize: 'var(--text-xs)',
                              fontWeight: 'var(--font-semibold)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {quote.title}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {quote.client.name} · {formatCurrency(amount, quote.currency)}
                          </div>
                        </div>
                        <span
                          className="badge"
                          style={{
                            fontSize: 9,
                            padding: '1px 6px',
                            background: statusTone.bg,
                            color: statusTone.color,
                          }}
                        >
                          {statusTone.label}
                        </span>
                      </a>
                    )
                  })
                )}
              </div>
            </BentoClamp>
          </div>
        </div>

        <div className="admin-dash__cell admin-dash__cell--5">
          <div className="admin-dash__panel">
            <div className="admin-dash__panel-head">
              <div>
                <h2 className="admin-dash__panel-title">Client Accounts</h2>
                <p className="admin-dash__panel-sub">Status &amp; recent accounts</p>
              </div>
              <a href="/admin/clients" className="btn btn--ghost btn--xs">
                View <ChevronRight size={12} />
              </a>
            </div>

            <div className="admin-dash__mini-stats admin-dash__mini-stats--2">
              <div
                className="admin-dash__mini-stat"
                style={{ background: 'rgba(16,185,129,0.08)', border: 'none' }}
              >
                <div className="admin-dash__mini-stat-value" style={{ color: '#10b981' }}>
                  {activeClientsCount}
                </div>
                <div className="admin-dash__mini-stat-label" style={{ color: '#10b981' }}>
                  Active
                </div>
              </div>
              <div
                className="admin-dash__mini-stat"
                style={{ background: 'rgba(239,68,68,0.08)', border: 'none' }}
              >
                <div className="admin-dash__mini-stat-value" style={{ color: '#ef4444' }}>
                  {inactiveClientsCount}
                </div>
                <div className="admin-dash__mini-stat-label" style={{ color: '#ef4444' }}>
                  Inactive
                </div>
              </div>
            </div>

            <BentoClamp maxHeight={180} moreHref="/admin/clients" moreLabel="Show more">
              <div className="admin-dash__list">
                {recentClients.length === 0 ? (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', padding: '8px 0' }}>
                    No clients yet.
                  </div>
                ) : (
                  recentClients.map((client) => (
                    <a key={client.id} href={`/admin/clients/${client.id}`} className="admin-dash__list-row">
                      <div>
                        <div
                          style={{
                            fontSize: 'var(--text-xs)',
                            fontWeight: 'var(--font-semibold)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {client.name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          Added {formatShortDate(client.createdAt)}
                        </div>
                      </div>
                      <span
                        className={`badge badge--${client.status.toLowerCase()}`}
                        style={{ fontSize: 9, padding: '1px 5px' }}
                      >
                        {client.status}
                      </span>
                    </a>
                  ))
                )}
              </div>
            </BentoClamp>
          </div>
        </div>
      </section>

      {/* ── 6. Financial Health — large feature card ── */}
      <section className="admin-dash__grid" aria-label="Financial health">
        <div className="admin-dash__cell admin-dash__cell--12">
          <div className="admin-dash__panel">
            <div className="admin-dash__panel-head">
              <div>
                <h2 className="admin-dash__panel-title">Financial Health</h2>
                <p className="admin-dash__panel-sub">Collections, outstanding balance &amp; recent invoices</p>
              </div>
              <a href="/admin/billing" className="btn btn--secondary btn--xs">
                View Invoices <ChevronRight size={12} />
              </a>
            </div>

            <div className="admin-dash__finance-grid">
              <div className="admin-dash__finance-totals">
                <div className="admin-dash__finance-total admin-dash__finance-total--paid">
                  <div className="admin-dash__finance-total-label" style={{ color: '#059669' }}>
                    Collected
                  </div>
                  <div className="admin-dash__finance-total-value" style={{ color: '#059669' }}>
                    {formatCurrency(totalPaid, currencySymbol)}
                  </div>
                </div>
                <div className="admin-dash__finance-total admin-dash__finance-total--out">
                  <div className="admin-dash__finance-total-label" style={{ color: '#2563eb' }}>
                    Outstanding
                  </div>
                  <div className="admin-dash__finance-total-value" style={{ color: '#2563eb' }}>
                    {formatCurrency(totalOutstanding, currencySymbol)}
                  </div>
                  {totalOverdue > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', marginTop: 6 }}>
                      {formatCurrency(totalOverdue, currencySymbol)} overdue
                    </div>
                  )}
                </div>
              </div>

              <div>
                {allInvoices.length === 0 ? (
                  <div className="admin-dash__status-ok" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                    <Receipt size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        No invoices yet
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        Billing activity will appear here once invoices are issued.
                      </div>
                    </div>
                  </div>
                ) : (
                  <BentoClamp maxHeight={180} moreHref="/admin/billing" moreLabel="Show more">
                    <div className="admin-dash__list" style={{ marginTop: 0 }}>
                      {allInvoices.slice(0, 8).map((inv) => (
                        <a key={inv.id} href={`/admin/billing/${inv.id}`} className="admin-dash__list-row">
                          <div>
                            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                              #{inv.invoiceNo} — {inv.client.name}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              Due {formatDate(inv.dueDate)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>
                              {formatCurrency(inv.amount, inv.currency)}
                            </div>
                            <span
                              className={`badge badge--${inv.status.toLowerCase()}`}
                              style={{ fontSize: 8, padding: '1px 4px' }}
                            >
                              {inv.status}
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </BentoClamp>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
