import { getServerUser, getClientSubTeamContext } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { cleanupExpiredInvitations } from '@/lib/invitation-cleanup'
import {
  FolderKanban,
  CreditCard,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  ChevronRight,
  Calendar,
  Award,
  AlertCircle,
  ExternalLink,
  Video,
  FileCode,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react'

export const metadata = {
  title: 'Dashboard — Tvita Client Portal',
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

function getProjectHealth(project: {
  status: string
  progress: number
  endDate?: Date | string | null
}) {
  if (project.status === 'COMPLETED') {
    return { label: 'Completed', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', icon: '', text: 'On Track' }
  }
  if (project.status === 'PLANNED' || project.status === 'ON_HOLD') {
    return { label: 'Not Started', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', icon: '', text: 'Not Started' }
  }

  if (project.endDate) {
    const end = new Date(project.endDate)
    const now = new Date()
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24))

    if (diffDays < 0 && project.progress < 100) {
      return {
        label: 'Delayed',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.12)',
        icon: '',
        text: `Delayed by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`,
      }
    }

    if (diffDays <= 7 && project.progress < 75) {
      return {
        label: 'At Risk',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.12)',
        icon: '',
        text: `Due in ${diffDays} days (${project.progress}% completed)`,
      }
    }
  }

  return { label: 'On Track', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', icon: '', text: 'On Track' }
}

// ─────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────

export default async function ClientDashboardPage() {
  // Trigger cleanup of expired invitations asynchronously
  cleanupExpiredInvitations().catch((err) => console.error('[Cleanup Error]', err))

  const user = await getServerUser()
  if (!user) return null

  const subTeamCtx = await getClientSubTeamContext(user.id)

  // Resolve client account record
  const client = await prisma.client.findFirst({
    where: subTeamCtx
      ? { id: subTeamCtx.clientId }
      : { OR: [{ profileId: user.id }, { email: user.email }] },
    include: {
      subscriptions: {
        where: { status: 'ACTIVE' },
        take: 1,
        include: { plan: true },
      },
    },
  })

  if (!client) {
    return (
      <div className="card text-center py-12">
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)' }}>No Client Account Found</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
          Please contact support or your account administrator to link your account profile.
        </p>
      </div>
    )
  }

  // 1. Permission checks
  const policy = subTeamCtx?.policy || {
    projects: true,
    milestones: true,
    approvals: true,
    invoices: true,
    subscriptions: true,
    billing: true,
    issues: true,
    notes: true,
  }

  const canSeeBilling = !subTeamCtx || Boolean(policy.invoices || policy.billing || policy.subscriptions)
  const canSeeProjects = !subTeamCtx || Boolean(policy.projects !== false)
  const canSeeMilestones = !subTeamCtx || Boolean(policy.milestones !== false)
  const canSeeApprovals = !subTeamCtx || Boolean(policy.approvals !== false)
  const canSeeIssues = !subTeamCtx || Boolean(policy.issues !== false)
  const canSeeNotes = !subTeamCtx || Boolean(policy.notes !== false)

  // Allowed project filter for subteams
  const allowedProjectIds = subTeamCtx?.allowedProjectIds || []
  const projectFilter = allowedProjectIds.length > 0
    ? { clientId: client.id, id: { in: allowedProjectIds } }
    : { clientId: client.id }

  // 2. Fetch Projects
  const projects = canSeeProjects
    ? await prisma.project.findMany({
        where: projectFilter,
        orderBy: { updatedAt: 'desc' },
        include: {
          lead: { select: { name: true, email: true } },
          milestones: canSeeMilestones
            ? {
                where: { clientVisible: true },
                orderBy: { dueDate: 'asc' },
              }
            : false,
        },
      })
    : []

  const projectIds = projects.map((p) => p.id)

  // 3. Fetch Actionable Data Concurrently
  const [
    pendingInvoices,
    pendingQuotes,
    pendingApprovals,
    openTickets,
    openIssues,
    upcomingMilestones,
    upcomingMeetings,
    sharedNotes,
    projectUpdates,
  ] = await Promise.all([
    canSeeBilling
      ? prisma.invoice.findMany({
          where: { clientId: client.id, status: { in: ['PENDING', 'OVERDUE'] } },
          orderBy: { dueDate: 'asc' },
        })
      : Promise.resolve([]),
    prisma.quote.findMany({
      where: { clientId: client.id, status: { in: ['PENDING', 'COUNTER_OFFERED'] } },
      orderBy: { createdAt: 'desc' },
    }),
    canSeeApprovals
      ? prisma.clientApproval.findMany({
          where: { clientId: client.id, status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          include: { project: { select: { name: true } } },
        })
      : Promise.resolve([]),
    prisma.ticket.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { project: { select: { name: true } } },
    }),
    canSeeIssues
      ? prisma.issue.findMany({
          where: { projectId: { in: projectIds }, status: { in: ['OPEN', 'IN_PROGRESS'] } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { project: { select: { name: true } } },
        })
      : Promise.resolve([]),
    canSeeMilestones
      ? prisma.milestone.findMany({
          where: { projectId: { in: projectIds }, clientVisible: true, status: { in: ['PLANNED', 'IN_PROGRESS'] }, dueDate: { not: null } },
          orderBy: { dueDate: 'asc' },
          take: 5,
          include: { project: { select: { name: true } } },
        })
      : Promise.resolve([]),
    prisma.meeting.findMany({
      where: { projectId: { in: projectIds }, scheduledAt: { gte: new Date(Date.now() - 3600 * 1000) } },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
      include: { project: { select: { name: true } }, host: { select: { name: true } } },
    }),
    canSeeNotes
      ? prisma.note.findMany({
          where: { projectId: { in: projectIds }, type: 'EXTERNAL_CLIENT' },
          orderBy: { updatedAt: 'desc' },
          take: 5,
          include: { project: { select: { name: true } }, creator: { select: { name: true } } },
        })
      : Promise.resolve([]),
    prisma.projectUpdate.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { project: { select: { name: true } }, author: { select: { name: true } } },
    }),
  ])

  // 4. Calculate Aggregate Metrics & Priority Attention Work Queue
  const activeProjects = projects.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'PLANNED')
  const totalOutstanding = pendingInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)
  const currencySymbol = pendingInvoices[0]?.currency || 'INR'

  // Build the "NEEDS YOUR ATTENTION" Work Queue Items
  const attentionItems: Array<{
    id: string
    category: 'INVOICE' | 'QUOTE' | 'APPROVAL' | 'TICKET' | 'MILESTONE'
    title: string
    subtitle: string
    badge: { text: string; bg: string; color: string }
    ctaText: string
    href: string
  }> = []

  // Add Pending/Overdue Invoices
  pendingInvoices.forEach((inv) => {
    const isOverdue = inv.status === 'OVERDUE' || (inv.dueDate && new Date(inv.dueDate) < new Date())
    attentionItems.push({
      id: `inv-${inv.id}`,
      category: 'INVOICE',
      title: `Invoice #${inv.invoiceNo} Payment ${isOverdue ? 'Overdue' : 'Due'}`,
      subtitle: `Amount: ${formatCurrency(inv.amount, inv.currency)} · Due Date: ${formatDate(inv.dueDate)}`,
      badge: isOverdue
        ? { text: 'OVERDUE', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' }
        : { text: 'PAYMENT DUE', bg: 'rgba(245,158,11,0.15)', color: '#d97706' },
      ctaText: 'Pay Invoice',
      href: `/client/invoices/${inv.id}`,
    })
  })

  // Add Pending Quotes
  pendingQuotes.forEach((q) => {
    attentionItems.push({
      id: `quote-${q.id}`,
      category: 'QUOTE',
      title: `Quote Proposal: "${q.title}" Requires Action`,
      subtitle: `Budget: ${formatCurrency(q.budget, q.currency)} ${q.status === 'COUNTER_OFFERED' ? '(Counter Submitted)' : '· Pending Client Approval'}`,
      badge: { text: 'QUOTE ACTION', bg: 'rgba(99,102,241,0.15)', color: '#4f46e5' },
      ctaText: 'Review Quote',
      href: `/client/projects`,
    })
  })

  // Add Pending Approvals
  pendingApprovals.forEach((app) => {
    attentionItems.push({
      id: `app-${app.id}`,
      category: 'APPROVAL',
      title: `Approval Requested: "${app.title}"`,
      subtitle: `Project: ${app.project.name} · Submitted for Client Sign-off`,
      badge: { text: 'APPROVAL REQD', bg: 'rgba(37,99,235,0.15)', color: '#2563eb' },
      ctaText: 'Review Approval',
      href: `/client/projects/${app.projectId}`,
    })
  })

  // Add Urgent/Open Support Tickets needing feedback
  openTickets
    .filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS')
    .slice(0, 2)
    .forEach((ticket) => {
      attentionItems.push({
        id: `ticket-${ticket.id}`,
        category: 'TICKET',
        title: `Ticket #${ticket.title} (${ticket.status.replace('_', ' ')})`,
        subtitle: `Project: ${ticket.project.name} · Priority: ${ticket.priority}`,
        badge: { text: 'TICKET', bg: 'rgba(124,58,237,0.15)', color: '#7c3aed' },
        ctaText: 'View Ticket',
        href: `/client/projects/${ticket.projectId}`,
      })
    })

  const pendingActionsCount = attentionItems.length

  // Calculate Due Soon (next 14 days)
  const now = new Date()
  const fourteenDaysOut = new Date(now.getTime() + 14 * 86400 * 1000)
  const dueSoonCount = projects.filter((p) => p.endDate && new Date(p.endDate) <= fourteenDaysOut && new Date(p.endDate) >= now).length +
    upcomingMilestones.filter((m) => m.dueDate && new Date(m.dueDate) <= fourteenDaysOut && new Date(m.dueDate) >= now).length

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const activePlan = client.subscriptions[0]?.plan

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 1400, margin: '0 auto' }}>
      
      {/* ─────────────────────────────────────────────
          1. GREETING & CONTEXT HEADER
          ───────────────────────────────────────────── */}
      <div className="page-header flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="page-header__title">
            {greeting}, {user.name?.split(' ')[0]}
          </h1>
          <p className="page-header__subtitle">
            Projects overview and pending items.
          </p>
        </div>

        {activePlan && canSeeBilling && (
          <div
            className="card"
            style={{
              padding: 'var(--space-3) var(--space-5)',
              flexShrink: 0,
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Current Plan</div>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: 'var(--accent-primary)' }}>
                {activePlan.name}
              </div>
            </div>
            <a href="/client/subscriptions" className="btn btn--ghost btn--xs" style={{ color: 'var(--accent-primary)' }}>
              Manage
            </a>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────
          2. TOP-LEVEL KPI CARDS (4-5 MAXIMUM)
          ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {/* Card 1: Active Projects */}
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">
            <FolderKanban size={20} />
          </div>
          <div>
            <div className="stat-card__value">{activeProjects.length}</div>
            <div className="stat-card__label">Active Projects</div>
          </div>
        </div>

        {/* Card 2: Pending Actions */}
        <div
          className="stat-card"
          style={{
            borderLeft: pendingActionsCount > 0 ? '4px solid var(--color-warning)' : '1px solid var(--border-subtle)',
          }}
        >
          <div className="stat-card__icon stat-card__icon--yellow">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="stat-card__value">{pendingActionsCount}</div>
            <div className="stat-card__label">Pending Actions</div>
          </div>
        </div>

        {/* Card 3: Due Soon */}
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">
            <Clock size={20} />
          </div>
          <div>
            <div className="stat-card__value">{dueSoonCount}</div>
            <div className="stat-card__label">Due Soon (14d)</div>
          </div>
        </div>

        {/* Card 4: Support / Syncs */}
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--orange">
            <MessageSquare size={20} />
          </div>
          <div>
            <div className="stat-card__value">{openTickets.length}</div>
            <div className="stat-card__label">Open Support Tickets</div>
          </div>
        </div>

        {/* Card 5: Outstanding Amount (Billing Authorized Only) */}
        {canSeeBilling && (
          <div
            className="stat-card"
            style={{
              borderLeft: totalOutstanding > 0 ? '4px solid var(--color-danger)' : '1px solid var(--border-subtle)',
            }}
          >
            <div className="stat-card__icon stat-card__icon--red">
              <CreditCard size={20} />
            </div>
            <div>
              <div className="stat-card__value" style={{ fontSize: 'var(--text-xl)' }}>
                {formatCurrency(totalOutstanding, currencySymbol)}
              </div>
              <div className="stat-card__label">Outstanding Amount</div>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────
          3. NEEDS YOUR ATTENTION (HIGHEST PRIORITY WORK QUEUE)
          ───────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          backgroundColor: '#ffffff',
          border: attentionItems.length > 0 ? '1.5px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
          boxShadow: attentionItems.length > 0 ? '0 4px 20px rgba(245, 158, 11, 0.08)' : 'none',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: attentionItems.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                color: attentionItems.length > 0 ? '#ef4444' : '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldAlert size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                Needs Your Attention
              </h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Actionable work items requiring your direct review, approval, or response.
              </p>
            </div>
          </div>
          {attentionItems.length > 0 && (
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                padding: '2px 10px',
                borderRadius: 20,
              }}
            >
              {attentionItems.length} ACTION{attentionItems.length === 1 ? '' : 'S'} REQUIRED
            </span>
          )}
        </div>

        {attentionItems.length === 0 ? (
          <div
            style={{
              padding: 'var(--space-6)',
              textAlign: 'center',
              background: 'rgba(16, 185, 129, 0.05)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed rgba(16, 185, 129, 0.3)',
            }}
          >
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-secondary)' }}>
              No pending actions
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
              There are currently no pending approvals, unpaid invoices, or items requiring your input.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {attentionItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  gap: 'var(--space-4)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        background: item.badge.bg,
                        color: item.badge.color,
                        padding: '2px 8px',
                        borderRadius: 12,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {item.badge.text}
                    </span>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                      {item.title}
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{item.subtitle}</div>
                </div>

                <a href={item.href} className="btn btn--primary btn--sm" style={{ flexShrink: 0 }}>
                  {item.ctaText}
                  <ChevronRight size={14} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────
          4. MY PROJECTS OVERVIEW (HEALTH & SCHEDULE)
          ───────────────────────────────────────────── */}
      <div className="card" style={{ backgroundColor: '#ffffff' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              Projects Overview &amp; Schedule
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Real-time health status, completion progress, and target completion dates.
            </p>
          </div>
          <a href="/client/projects" className="btn btn--ghost btn--sm">
            View All Projects
            <ChevronRight size={14} />
          </a>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">
              <FolderKanban size={24} />
            </div>
            <div className="empty-state__title">No active projects found</div>
            <div className="empty-state__desc">Your assigned agency projects will appear here.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {projects.map((project) => {
              const health = getProjectHealth(project)
              const nextMilestone = Array.isArray(project.milestones) ? project.milestones[0] : null

              return (
                <div
                  key={project.id}
                  style={{
                    padding: 'var(--space-4) var(--space-5)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-3)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div className="flex items-center gap-3 mb-1">
                        <a
                          href={`/client/projects/${project.id}`}
                          style={{
                            fontSize: 'var(--text-base)',
                            fontWeight: 'var(--font-semibold)',
                            color: 'var(--text-primary)',
                            textDecoration: 'none',
                          }}
                        >
                          {project.name}
                        </a>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: health.color,
                            background: health.bg,
                            padding: '2px 10px',
                            borderRadius: 20,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <span>{health.icon}</span> {health.text}
                        </span>
                      </div>
                      {project.description && (
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, lineClamp: 1 }}>
                          {project.description}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', flexShrink: 0 }}>
                      {/* Next Milestone */}
                      {nextMilestone && (
                        <div className="hidden md:block" style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Next Milestone
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                            {nextMilestone.name} ({formatShortDate(nextMilestone.dueDate)})
                          </div>
                        </div>
                      )}

                      {/* Target Date */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Target Date
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                          {formatDate(project.endDate)}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ minWidth: 110, textAlign: 'right' }}>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
                          {project.progress}% Complete
                        </div>
                        <div className="progress-bar-container" style={{ width: 110, height: 6 }}>
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${project.progress}%`,
                              backgroundColor: health.color,
                            }}
                          />
                        </div>
                      </div>

                      <a href={`/client/projects/${project.id}`} className="btn btn--secondary btn--sm">
                        Open
                        <ArrowUpRight size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────
          5. UPCOMING DEADLINES TIMELINE & RECENT UPDATES
          ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Upcoming Deadlines */}
        <div className="card" style={{ backgroundColor: '#ffffff' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              Upcoming Deadlines
            </h2>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Next 30 Days</span>
          </div>

          {upcomingMilestones.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: 'var(--space-4) 0' }}>
              No upcoming milestone deadlines scheduled.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {upcomingMilestones.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      width: 50,
                      height: 44,
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(79, 70, 229, 0.1)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>
                      {m.dueDate ? new Date(m.dueDate).toLocaleString('en-IN', { month: 'short' }) : 'TBD'}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1 }}>
                      {m.dueDate ? new Date(m.dueDate).getDate() : '--'}
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Project: {m.project.name}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      background: m.status === 'COMPLETED' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                      color: m.status === 'COMPLETED' ? '#10b981' : '#3b82f6',
                      padding: '2px 8px',
                      borderRadius: 10,
                    }}
                  >
                    {m.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Project Updates */}
        <div className="card" style={{ backgroundColor: '#ffffff' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              Recent Project Updates
            </h2>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Client Stream</span>
          </div>

          {projectUpdates.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: 'var(--space-4) 0' }}>
              No recent progress updates posted.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {projectUpdates.map((update) => (
                <div
                  key={update.id}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {update.project.name}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {formatShortDate(update.createdAt)}
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: 4 }}>
                    {update.content}
                  </div>
                  {update.author && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Posted by {update.author.name}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────
          6. RECENT SUPPORT CONVERSATIONS & MEETINGS
          ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Support Conversations */}
        <div className="card" style={{ backgroundColor: '#ffffff' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              Support Tickets &amp; Issues
            </h2>
            <a href="/client/projects" className="btn btn--ghost btn--xs">
              View All
            </a>
          </div>

          {openTickets.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: 'var(--space-4) 0' }}>
              No active support tickets opened.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {openTickets.map((t) => (
                <a
                  key={t.id}
                  href={`/client/projects/${t.projectId}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    textDecoration: 'none',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Project: {t.project.name} · Priority: {t.priority}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      background: 'rgba(99,102,241,0.15)',
                      color: '#4f46e5',
                      padding: '2px 8px',
                      borderRadius: 10,
                    }}
                  >
                    {t.status}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Scheduled Meetings */}
        <div className="card" style={{ backgroundColor: '#ffffff' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              Scheduled Syncs &amp; Meetings
            </h2>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Google Meet</span>
          </div>

          {upcomingMeetings.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: 'var(--space-4) 0' }}>
              No upcoming syncs scheduled.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {upcomingMeetings.map((meet) => (
                <div
                  key={meet.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                      {meet.title}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {formatDate(meet.scheduledAt)} · Host: {meet.host.name}
                    </div>
                  </div>
                  {meet.meetLink ? (
                    <a
                      href={meet.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn--primary btn--xs"
                      style={{ background: '#10b981' }}
                    >
                      <Video size={12} />
                      Join
                    </a>
                  ) : (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>No link yet</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────
          7. RECENT DELIVERABLES & SHARED NOTES
          ───────────────────────────────────────────── */}
      {canSeeNotes && sharedNotes.length > 0 && (
        <div className="card" style={{ backgroundColor: '#ffffff' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              Shared Deliverables &amp; Notes
            </h2>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Client Documentation</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
            {sharedNotes.map((note) => (
              <a
                key={note.id}
                href={`/client/projects/${note.projectId}?tab=notes`}
                style={{
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                  {note.title}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {note.content}
                </div>
                <div style={{ fontSize: 10, color: 'var(--accent-primary)', marginTop: 4 }}>
                  Project: {note.project.name} · Shared by {note.creator.name}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          8. BILLING & INVOICES (PERMISSION-DEPENDENT)
          ───────────────────────────────────────────── */}
      {canSeeBilling && (
        <div className="card" style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                Billing &amp; Invoices
              </h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Total Outstanding: {formatCurrency(totalOutstanding, currencySymbol)}
              </p>
            </div>
            <a href="/client/invoices" className="btn btn--secondary btn--sm">
              View All Invoices
              <ChevronRight size={14} />
            </a>
          </div>

          {pendingInvoices.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: 'var(--space-3) 0' }}>
              No unpaid invoices found. All account billing is up to date!
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 'var(--font-semibold)' }}>#{inv.invoiceNo}</td>
                      <td>
                        <span className={`badge badge--${inv.status.toLowerCase()}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td>{formatDate(inv.dueDate)}</td>
                      <td style={{ fontWeight: 'var(--font-bold)' }}>
                        {formatCurrency(inv.amount, inv.currency)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <a href={`/client/invoices/${inv.id}`} className="btn btn--primary btn--xs">
                          Pay / View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
