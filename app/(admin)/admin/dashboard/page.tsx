import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { cleanupExpiredInvitations } from '@/lib/invitation-cleanup'
import { redirect } from 'next/navigation'
import QuotesModule from '@/app/components/projects/QuotesModule'
import {
  Building2,
  FolderKanban,
  Users,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
  Plus,
  ArrowUpRight,
  Zap,
  Activity,
  Check,
  ExternalLink,
  Receipt,
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
// MAIN ADMIN DASHBOARD COMPONENT
// ─────────────────────────────────────────────

export default async function AdminDashboardPage() {
  // Trigger cleanup of expired invitations asynchronously
  cleanupExpiredInvitations().catch((err) => console.error('[Cleanup Error]', err))

  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    redirect('/login')
  }

  const now = new Date()

  // 1. Fetch organization-wide data concurrently
  const [
    totalClientsCount,
    activeClientsCount,
    inactiveClientsCount,
    totalProjectsCount,
    activeProjectsCount,
    completedProjectsCount,
    totalTeamMembersCount,
    pendingInvitesCount,
    projects,
    allInvoices,
    allTasks,
    recentAuditLogs,
    recentClients,
    teamRolesGroup,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { status: 'ACTIVE' } }),
    prisma.client.count({ where: { status: { in: ['INACTIVE', 'SUSPENDED'] } } }),
    prisma.project.count(),
    prisma.project.count({ where: { status: { in: ['IN_PROGRESS', 'PLANNED'] } } }),
    prisma.project.count({ where: { status: 'COMPLETED' } }),
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
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { actor: { select: { name: true, email: true } } },
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
  ])

  // Calculate Financial Aggregates
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

  // Calculate Organization Exceptions
  const overdueTasks = allTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now)
  const blockedTasks = allTasks.filter((t) => t.status === 'BLOCKED')
  const unassignedLeadProjects = projects.filter((p) => !p.leadId)
  const delayedProjects = projects.filter(
    (p) => p.endDate && new Date(p.endDate) < now && p.progress < 100 && p.status !== 'COMPLETED'
  )
  const atRiskProjects = projects.filter((p) => {
    if (!p.endDate || p.status === 'COMPLETED') return false
    const diffDays = Math.ceil((new Date(p.endDate).getTime() - now.getTime()) / (1000 * 3600 * 24))
    return diffDays > 0 && diffDays <= 7 && p.progress < 75
  })

  // Organization Health Breakdown Counts
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
  const plannedCount = projects.filter((p) => p.status === 'PLANNED').length

  // Build Organization "NEEDS ATTENTION" Exceptions Queue
  const adminExceptionsQueue: Array<{
    id: string
    category: 'OVERDUE' | 'DELAYED' | 'UNASSIGNED' | 'INVITE' | 'FINANCE'
    title: string
    subtitle: string
    badge: { text: string; bg: string; color: string }
    ctaText: string
    href: string
  }> = []

  // 1. Overdue Tasks
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

  // 2. Delayed Projects
  if (delayedProjects.length > 0) {
    adminExceptionsQueue.push({
      id: 'exc-delayed-projects',
      category: 'DELAYED',
      title: `${delayedProjects.length} delayed project(s) past target completion date`,
      subtitle: `e.g., "${delayedProjects[0].name}" (Target: ${formatDate(delayedProjects[0].endDate)})`,
      badge: { text: 'Delayed Projects', bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
      ctaText: 'View Projects',
      href: '/admin/projects',
    })
  }

  // 3. Projects Without Lead
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

  // 4. Pending Invitations
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



  // 6. Overdue Invoices
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 1400, margin: '0 auto' }}>
      
      {/* Header */}
      <div className="page-header flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="page-header__title">
            {greeting}, {user.name?.split(' ')[0]}
          </h1>
          <p className="page-header__subtitle">
            Organization overview and system health.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <span
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Admin
          </span>
          <a href="/admin/settings#tax-financial" className="btn btn--secondary btn--sm">
            <Receipt size={14} /> Tax &amp; Financial Settings
          </a>
          <a href="/admin/clients/new" className="btn btn--secondary btn--sm">
            <Plus size={14} /> Add Client
          </a>
          <a href="/admin/projects/new" className="btn btn--primary btn--sm">
            <Plus size={14} /> New Project
          </a>
        </div>
      </div>

      {/* Top Metric Cards (4 COLUMNS x N ROWS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="stat-card__icon stat-card__icon--blue">
              <Building2 size={20} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', background: 'rgba(59,130,246,0.12)', padding: '2px 8px', borderRadius: 4 }}>
              {activeClientsCount} active
            </span>
          </div>
          <div>
            <div className="stat-card__value">{totalClientsCount}</div>
            <div className="stat-card__label">Total Clients</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="stat-card__icon stat-card__icon--purple">
              <FolderKanban size={20} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', background: 'rgba(124,58,237,0.12)', padding: '2px 8px', borderRadius: 4 }}>
              {activeProjectsCount} active
            </span>
          </div>
          <div>
            <div className="stat-card__value">{totalProjectsCount}</div>
            <div className="stat-card__label">Total Projects</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="stat-card__icon stat-card__icon--green">
              <Users size={20} />
            </div>
            {pendingInvitesCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#d97706', background: 'rgba(245,158,11,0.12)', padding: '2px 8px', borderRadius: 4 }}>
                {pendingInvitesCount} pending
              </span>
            )}
          </div>
          <div>
            <div className="stat-card__value">{totalTeamMembersCount}</div>
            <div className="stat-card__label">Team Members</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">
            <Zap size={20} />
          </div>
          <div>
            <div className="stat-card__value">{activeProjectsCount}</div>
            <div className="stat-card__label">Active Projects</div>
          </div>
        </div>

        <div
          className="stat-card"
          style={{
            borderLeft: overdueTasks.length > 0 ? '4px solid var(--color-danger)' : '1px solid var(--border-subtle)',
          }}
        >
          <div className="stat-card__icon stat-card__icon--red">
            <Clock size={20} />
          </div>
          <div>
            <div className="stat-card__value" style={{ color: overdueTasks.length > 0 ? '#ef4444' : undefined }}>
              {overdueTasks.length}
            </div>
            <div className="stat-card__label">Overdue Tasks</div>
          </div>
        </div>

        <div
          className="stat-card"
          style={{
            borderLeft: atRiskCount + delayedCount > 0 ? '4px solid var(--color-warning)' : '1px solid var(--border-subtle)',
          }}
        >
          <div className="stat-card__icon stat-card__icon--yellow">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="stat-card__value" style={{ color: atRiskCount + delayedCount > 0 ? '#d97706' : undefined }}>
              {atRiskCount + delayedCount}
            </div>
            <div className="stat-card__label">At Risk / Delayed</div>
          </div>
        </div>

        <div
          className="stat-card"
          style={{
            borderLeft: totalOutstanding > 0 ? '4px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
          }}
        >
          <div className="stat-card__icon stat-card__icon--green">
            <CreditCard size={20} />
          </div>
          <div>
            <div className="stat-card__value" style={{ fontSize: 'var(--text-xl)' }}>
              {formatCurrency(totalOutstanding, currencySymbol)}
            </div>
            <div className="stat-card__label">Outstanding Billing</div>
          </div>
        </div>
      </div>

      {/* Global Quotes & Iterative Negotiation Section */}
      <QuotesModule userRole={user.role} userId={user.id} />

      {/* Organization Health */}
      <div
        className="card"
        style={{
          backgroundColor: '#ffffff',
          padding: 'var(--space-4) var(--space-5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
            Organization Health
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Project status summary across active accounts.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <a
            href="/admin/projects"
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            {onTrackCount} On Track
          </a>
          <a
            href="/admin/projects"
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#d97706',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            {atRiskCount} At Risk
          </a>
          <a
            href="/admin/projects"
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#dc2626',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            {delayedCount} Delayed
          </a>
          {blockedCount > 0 && (
            <a
              href="/admin/projects"
              style={{
                padding: '4px 12px',
                borderRadius: 4,
                background: 'rgba(220, 38, 38, 0.12)',
                color: '#dc2626',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {blockedCount} Blocked
            </a>
          )}
          <a
            href="/admin/projects"
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              background: 'rgba(100, 116, 139, 0.12)',
              color: '#64748b',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            {plannedCount} Planned
          </a>
          <a
            href="/admin/projects"
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              background: 'rgba(79, 70, 229, 0.12)',
              color: '#4f46e5',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            {completedProjectsCount} Completed
          </a>
        </div>
      </div>

      {/* Needs Attention Queue */}
      <div
        className="card"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} style={{ color: adminExceptionsQueue.length > 0 ? '#dc2626' : '#10b981' }} />
            <div>
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                Needs Attention
              </h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Items requiring administrative action
              </p>
            </div>
          </div>

          {adminExceptionsQueue.length > 0 && (
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              {adminExceptionsQueue.length} Pending
            </span>
          )}
        </div>

        {adminExceptionsQueue.length === 0 ? (
          <div
            style={{
              padding: 'var(--space-6)',
              textAlign: 'center',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-secondary)' }}>
              No pending actions
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
              All projects and organization processes are operating normally.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {adminExceptionsQueue.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  gap: 'var(--space-4)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        background: item.badge.bg,
                        color: item.badge.color,
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {item.badge.text}
                    </span>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                      {item.title}
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{item.subtitle}</div>
                </div>

                <a href={item.href} className="btn btn--secondary btn--sm" style={{ flexShrink: 0 }}>
                  {item.ctaText}
                  <ChevronRight size={14} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Projects Overview */}
      <div className="card" style={{ backgroundColor: '#ffffff' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              Projects Overview
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Active projects and recent status changes.
            </p>
          </div>
          <a href="/admin/projects" className="btn btn--ghost btn--sm">
            View All Projects
            <ChevronRight size={14} />
          </a>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">
              <FolderKanban size={24} />
            </div>
            <div className="empty-state__title">No active projects</div>
            <div className="empty-state__desc">Create projects to begin tracking organization status.</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Client</th>
                  <th>Project Lead</th>
                  <th>Status</th>
                  <th>Target Date</th>
                  <th>Progress</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {projects.slice(0, 6).map((project) => {
                  const projectTasksList = allTasks.filter((t) => t.projectId === project.id)
                  const health = getOrgProjectHealth(project, projectTasksList)

                  return (
                    <tr key={project.id}>
                      <td>
                        <a
                          href={`/admin/projects/${project.id}`}
                          style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)', textDecoration: 'none' }}
                        >
                          {project.name}
                        </a>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{project.client.name}</td>
                      <td>
                        {project.lead ? (
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{project.lead.name}</span>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#d97706', background: 'rgba(245,158,11,0.12)', padding: '2px 6px', borderRadius: 4 }}>
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: health.color,
                            background: health.bg,
                            padding: '2px 8px',
                            borderRadius: 4,
                          }}
                        >
                          {health.badge}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{formatDate(project.endDate)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-bar-container" style={{ width: 80, height: 6 }}>
                            <div className="progress-bar-fill" style={{ width: `${project.progress}%`, backgroundColor: health.color }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {project.progress}%
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <a href={`/admin/projects/${project.id}`} className="btn btn--secondary btn--xs">
                          Manage <ArrowUpRight size={12} />
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

      {/* Team & Client Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Team Overview */}
        <div className="card" style={{ backgroundColor: '#ffffff' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                Team Overview
              </h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Roster and role distribution</p>
            </div>
            <a href="/admin/team" className="btn btn--ghost btn--xs">
              Manage Team
            </a>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>{totalTeamMembersCount}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Active Members</div>
            </div>
            <div style={{ padding: 'var(--space-3)', background: 'rgba(245,158,11,0.08)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: '#d97706' }}>{pendingInvitesCount}</div>
              <div style={{ fontSize: 11, color: '#d97706' }}>Pending Invites</div>
            </div>
            <div style={{ padding: 'var(--space-3)', background: 'rgba(79,70,229,0.08)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: '#4f46e5' }}>{teamRolesGroup.length}</div>
              <div style={{ fontSize: 11, color: '#4f46e5' }}>Defined Roles</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {teamRolesGroup.map((r) => (
              <div
                key={r.teamRole || 'UNASSIGNED'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                  {r.teamRole ? r.teamRole.replace('_', ' ') : 'General Team Member'}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--accent-primary)' }}>
                  {r._count._all} Member(s)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Client Overview */}
        <div className="card" style={{ backgroundColor: '#ffffff' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                Client Overview
              </h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Accounts and status</p>
            </div>
            <a href="/admin/clients" className="btn btn--ghost btn--xs">
              View Clients
            </a>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>{totalClientsCount}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Accounts</div>
            </div>
            <div style={{ padding: 'var(--space-3)', background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: '#10b981' }}>{activeClientsCount}</div>
              <div style={{ fontSize: 11, color: '#10b981' }}>Active Clients</div>
            </div>
            <div style={{ padding: 'var(--space-3)', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: '#ef4444' }}>{inactiveClientsCount}</div>
              <div style={{ fontSize: 11, color: '#ef4444' }}>Inactive / Suspended</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {recentClients.map((client) => (
              <a
                key={client.id}
                href={`/admin/clients/${client.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  textDecoration: 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                    {client.name}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Created {formatShortDate(client.createdAt)}</div>
                </div>
                <span className={`badge badge--${client.status.toLowerCase()}`}>{client.status}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="card" style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              Financial Overview
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Invoicing, collected revenue, and outstanding balance summary.
            </p>
          </div>
          <a href="/admin/billing" className="btn btn--secondary btn--sm">
            View Billing &amp; Invoices
            <ChevronRight size={14} />
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div style={{ padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Invoiced
            </div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
              {formatCurrency(totalInvoiced, currencySymbol)}
            </div>
          </div>
          <div style={{ padding: 'var(--space-4)', background: 'rgba(16,185,129,0.06)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: 11, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Revenue Collected
            </div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: '#059669', marginTop: 4 }}>
              {formatCurrency(totalPaid, currencySymbol)}
            </div>
          </div>
          <div style={{ padding: 'var(--space-4)', background: 'rgba(59,130,246,0.06)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: 11, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Outstanding Balance
            </div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
              {formatCurrency(totalOutstanding, currencySymbol)}
            </div>
          </div>
          <div style={{ padding: 'var(--space-4)', background: 'rgba(239,68,68,0.06)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: 11, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Overdue Balance
            </div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: '#ef4444', marginTop: 4 }}>
              {formatCurrency(totalOverdue, currencySymbol)}
            </div>
          </div>
        </div>

        {allInvoices.length === 0 ? (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: 'var(--space-3) 0' }}>
            No invoices generated yet.
          </p>
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
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {allInvoices.slice(0, 5).map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <a href={`/admin/billing/${inv.id}`} style={{ fontWeight: 'var(--font-medium)', color: 'var(--accent-primary)', textDecoration: 'none' }}>
                        #{inv.invoiceNo}
                      </a>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{inv.client.name}</td>
                    <td style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                      {formatCurrency(inv.amount, inv.currency)}
                    </td>
                    <td>
                      <span className={`badge badge--${inv.status.toLowerCase()}`}>{inv.status}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{formatDate(inv.dueDate)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <a href={`/admin/billing/${inv.id}`} className="btn btn--secondary btn--xs">
                        Manage <ExternalLink size={12} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Trail & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Audit Log Trail */}
        <div className="card" style={{ backgroundColor: '#ffffff' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              Recent Activity
            </h2>
            <a href="/admin/audit-logs" className="btn btn--ghost btn--xs">
              View Audit Logs
            </a>
          </div>

          {recentAuditLogs.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: 'var(--space-4) 0' }}>
              No recent audit trail entries logged.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {recentAuditLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{log.actor?.name || log.actorEmail || 'System'}</strong>:{' '}
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>{log.action}</span> on {log.entityType}{' '}
                    {log.entityLabel ? `("${log.entityLabel}")` : ''}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {formatShortDate(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Status */}
        <div className="card" style={{ backgroundColor: '#ffffff' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              System Status
            </h2>
            <span style={{ fontSize: 11, color: '#059669', fontWeight: 600, background: 'rgba(16,185,129,0.12)', padding: '2px 8px', borderRadius: 4 }}>
              Operational
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Check size={16} style={{ color: '#059669' }} />
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                  Authentication Service
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Magic links &amp; session security operating normally.
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Check size={16} style={{ color: '#2563eb' }} />
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                  Database Engine
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  PostgreSQL database connection pool healthy.
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Check size={16} style={{ color: pendingInvitesCount > 0 ? '#d97706' : '#059669' }} />
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                  Invitation Token Cleanup
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {pendingInvitesCount > 0 ? `${pendingInvitesCount} pending user magic links active.` : 'All magic link tokens cleaned.'}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
