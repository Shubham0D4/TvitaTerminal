import { getServerUser, isTeamMember, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { cleanupExpiredInvitations } from '@/lib/invitation-cleanup'
import { redirect } from 'next/navigation'
import {
  FolderKanban,
  CheckSquare,
  AlertTriangle,
  Clock,
  Users,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  Zap,
} from 'lucide-react'

export const metadata = {
  title: 'Lead Dashboard — Tvita Team',
}

// ─────────────────────────────────────────────
// HELPER UTILITIES
// ─────────────────────────────────────────────

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

function getLeadProjectHealth(
  project: {
    status: string
    progress: number
    endDate?: Date | string | null
  },
  projectTasks: Array<{ status: string; dueDate?: Date | string | null }> = [],
  openIssuesCount = 0
) {
  if (project.status === 'COMPLETED') {
    return { label: 'Completed', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', badge: 'Completed', text: 'On Track' }
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
        text: diffDays < 0 ? `Delayed by ${Math.abs(diffDays)} day(s)` : `${overdueTasksCount} overdue tasks`,
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
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────

export default async function TeamDashboardPage() {
  // Trigger cleanup of expired invitations asynchronously
  cleanupExpiredInvitations().catch((err) => console.error('[Cleanup Error]', err))

  const user = await getServerUser()
  if (!user || (!isTeamMember(user) && !isAdmin(user))) {
    redirect('/login')
  }

  const isUserAdmin = isAdmin(user)

  // 1. Build Lead/Member project filter
  const projectWhere = isUserAdmin
    ? {}
    : {
        OR: [
          { leadId: user.id },
          { members: { some: { profileId: user.id } } },
        ],
      }

  // 2. Fetch all dashboard data concurrently
  const [
    projects,
    allTasks,
    supportTickets,
    projectUpdates,
    taskActivities,
    upcomingMilestones,
  ] = await Promise.all([
    prisma.project.findMany({
      where: projectWhere,
      orderBy: { updatedAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            profile: { select: { id: true, name: true, email: true, teamRole: true } },
          },
        },
        milestones: {
          orderBy: { dueDate: 'asc' },
          take: 3,
        },
      },
    }),
    prisma.task.findMany({
      where: { project: projectWhere },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        developer: { select: { id: true, name: true, email: true } },
        tester: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.ticket.findMany({
      where: { project: projectWhere, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { project: { select: { name: true } } },
    }),
    prisma.projectUpdate.findMany({
      where: { project: projectWhere },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { project: { select: { name: true } }, author: { select: { name: true } } },
    }),
    prisma.taskActivity.findMany({
      where: { task: { project: projectWhere } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        task: { select: { title: true, projectId: true } },
        actor: { select: { name: true } },
      },
    }),
    prisma.milestone.findMany({
      where: { project: projectWhere, status: { in: ['PLANNED', 'IN_PROGRESS'] } },
      orderBy: { dueDate: 'asc' },
      take: 5,
      include: { project: { select: { name: true } } },
    }),
  ])


  // 4. Calculate Operational Metrics
  const now = new Date()
  const activeProjects = projects.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'PLANNED')
  const openTasks = allTasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
  const overdueTasks = openTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now)
  const blockedTasks = openTasks.filter((t) => t.status === 'BLOCKED')
  const unassignedTasks = openTasks.filter((t) => !t.assigneeId && !t.developerId)
  const reviewTasks = openTasks.filter(
    (t) => t.status === 'READY_FOR_TESTING' || t.status === 'IN_TESTING' || t.status === 'CHANGES_REQUIRED'
  )

  // Pipeline Status Breakdown
  const taskPipeline = {
    todo: allTasks.filter((t) => t.status === 'TODO').length,
    inProgress: allTasks.filter((t) => t.status === 'IN_PROGRESS').length,
    review: reviewTasks.length,
    completed: allTasks.filter((t) => t.status === 'COMPLETED').length,
    blocked: blockedTasks.length,
  }

  // Aggregate Unique Team Members & Workload
  const memberWorkloadMap = new Map<
    string,
    {
      id: string
      name: string
      email: string
      role: string
      activeCount: number
      overdueCount: number
      blockedCount: number
    }
  >()

  projects.forEach((proj) => {
    proj.members.forEach((m) => {
      if (!memberWorkloadMap.has(m.profile.id)) {
        memberWorkloadMap.set(m.profile.id, {
          id: m.profile.id,
          name: m.profile.name,
          email: m.profile.email,
          role: m.profile.teamRole || m.role || 'Member',
          activeCount: 0,
          overdueCount: 0,
          blockedCount: 0,
        })
      }
    })
  })

  // Calculate task counts per member
  openTasks.forEach((t) => {
    const memberId = t.developerId || t.assigneeId || t.testerId
    if (memberId && memberWorkloadMap.has(memberId)) {
      const target = memberWorkloadMap.get(memberId)!
      target.activeCount += 1
      if (t.dueDate && new Date(t.dueDate) < now) {
        target.overdueCount += 1
      }
      if (t.status === 'BLOCKED') {
        target.blockedCount += 1
      }
    }
  })

  const teamWorkloadList = Array.from(memberWorkloadMap.values()).sort((a, b) => b.activeCount - a.activeCount)
  const maxActiveWorkload = Math.max(...teamWorkloadList.map((m) => m.activeCount), 1)

  // Build "NEEDS ATTENTION" Action Queue
  const actionQueueItems: Array<{
    id: string
    category: 'OVERDUE' | 'BLOCKED' | 'UNASSIGNED' | 'REVIEW' | 'APPROVAL' | 'TICKET'
    title: string
    subtitle: string
    badge: { text: string; bg: string; color: string }
    ctaText: string
    href: string
  }> = []

  // Overdue Tasks Item
  if (overdueTasks.length > 0) {
    actionQueueItems.push({
      id: 'queue-overdue',
      category: 'OVERDUE',
      title: `${overdueTasks.length} overdue task(s) needing follow-up`,
      subtitle: `e.g., "${overdueTasks[0].title}" (${overdueTasks[0].project.name})`,
      badge: { text: 'Overdue Tasks', bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
      ctaText: 'View Tasks',
      href: '/team/tasks',
    })
  }

  // Blocked Tasks Item
  if (blockedTasks.length > 0) {
    actionQueueItems.push({
      id: 'queue-blocked',
      category: 'BLOCKED',
      title: `${blockedTasks.length} blocked task(s)`,
      subtitle: `Task: "${blockedTasks[0].title}" (${blockedTasks[0].project.name})`,
      badge: { text: 'Blocked', bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
      ctaText: 'Resolve Blockers',
      href: '/team/tasks',
    })
  }

  // Unassigned Tasks Item
  if (unassignedTasks.length > 0) {
    actionQueueItems.push({
      id: 'queue-unassigned',
      category: 'UNASSIGNED',
      title: `${unassignedTasks.length} unassigned task(s)`,
      subtitle: `e.g., "${unassignedTasks[0].title}" (${unassignedTasks[0].project.name})`,
      badge: { text: 'Unassigned', bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
      ctaText: 'Assign Tasks',
      href: '/team/tasks',
    })
  }

  // Pending Review / QA Tasks Item
  if (reviewTasks.length > 0) {
    actionQueueItems.push({
      id: 'queue-review',
      category: 'REVIEW',
      title: `${reviewTasks.length} task(s) awaiting code review or QA testing`,
      subtitle: `e.g., "${reviewTasks[0].title}" (${reviewTasks[0].project.name})`,
      badge: { text: 'QA Review', bg: 'rgba(59,130,246,0.12)', color: '#2563eb' },
      ctaText: 'Review Tasks',
      href: '/team/tasks',
    })
  }

  // Open Client Tickets
  supportTickets.forEach((t) => {
    actionQueueItems.push({
      id: `queue-ticket-${t.id}`,
      category: 'TICKET',
      title: `Client ticket: "${t.title}" (${t.priority} priority)`,
      subtitle: `Project: ${t.project.name} · Status: ${t.status}`,
      badge: { text: 'Client Ticket', bg: 'rgba(234,88,12,0.12)', color: '#ea580c' },
      ctaText: 'Respond',
      href: `/team/projects/${t.projectId}`,
    })
  })

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
            Project lead overview and team task status.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
            {user.teamRole ? user.teamRole.replace('_', ' ') : 'Project Lead'}
          </span>
          <a href="/team/tasks" className="btn btn--primary btn--sm">
            Manage Tasks
            <ChevronRight size={14} />
          </a>
        </div>
      </div>

      {/* KPI Cards (4 COLUMNS x N ROWS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">
            <FolderKanban size={20} />
          </div>
          <div>
            <div className="stat-card__value">{activeProjects.length}</div>
            <div className="stat-card__label">Active Projects</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">
            <CheckSquare size={20} />
          </div>
          <div>
            <div className="stat-card__value">{openTasks.length}</div>
            <div className="stat-card__label">Active Tasks</div>
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
            borderLeft: blockedTasks.length > 0 ? '4px solid var(--color-orange)' : '1px solid var(--border-subtle)',
          }}
        >
          <div className="stat-card__icon stat-card__icon--orange">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="stat-card__value" style={{ color: blockedTasks.length > 0 ? '#ea580c' : undefined }}>
              {blockedTasks.length}
            </div>
            <div className="stat-card__label">Blocked Tasks</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">
            <Users size={20} />
          </div>
          <div>
            <div className="stat-card__value">{teamWorkloadList.length}</div>
            <div className="stat-card__label">Team Members</div>
          </div>
        </div>
      </div>

      {/* Project Health Matrix */}
      <div className="card" style={{ backgroundColor: '#ffffff' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              Project Health
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Project status based on blockers, schedule, and task progress.
            </p>
          </div>
          <a href="/team/projects" className="btn btn--ghost btn--sm">
            View All Projects
            <ChevronRight size={14} />
          </a>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">
              <FolderKanban size={24} />
            </div>
            <div className="empty-state__title">No projects assigned</div>
            <div className="empty-state__desc">Projects you lead or participate in will appear here.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {projects.map((project) => {
              const projectTasksList = allTasks.filter((t) => t.projectId === project.id)
              const health = getLeadProjectHealth(project, projectTasksList)
              const nextMilestone = Array.isArray(project.milestones) ? project.milestones[0] : null
              const projectOverdueCount = projectTasksList.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'COMPLETED').length
              const projectBlockedCount = projectTasksList.filter((t) => t.status === 'BLOCKED').length

              return (
                <div
                  key={project.id}
                  style={{
                    padding: 'var(--space-4) var(--space-5)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-3)',
                  }}
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div className="flex items-center gap-3 mb-1">
                        <a
                          href={`/team/projects/${project.id}`}
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
                            fontWeight: 600,
                            color: health.color,
                            background: health.bg,
                            padding: '2px 8px',
                            borderRadius: 4,
                          }}
                        >
                          {health.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        Client: <strong style={{ color: 'var(--text-secondary)' }}>{project.client.name}</strong> · Lead: {project.lead?.name || 'Unassigned'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', flexShrink: 0 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {projectOverdueCount > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(239,68,68,0.12)', color: '#ef4444', padding: '2px 6px', borderRadius: 4 }}>
                            {projectOverdueCount} Overdue
                          </span>
                        )}
                        {projectBlockedCount > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(234,88,12,0.12)', color: '#ea580c', padding: '2px 6px', borderRadius: 4 }}>
                            {projectBlockedCount} Blocked
                          </span>
                        )}
                      </div>

                      {nextMilestone && (
                        <div className="hidden md:block" style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Milestone
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                            {nextMilestone.name} ({formatShortDate(nextMilestone.dueDate)})
                          </div>
                        </div>
                      )}

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Target Date
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                          {formatDate(project.endDate)}
                        </div>
                      </div>

                      <div style={{ minWidth: 110, textAlign: 'right' }}>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
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

                      <a href={`/team/projects/${project.id}`} className="btn btn--secondary btn--sm">
                        Manage
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
            <ShieldAlert size={18} style={{ color: actionQueueItems.length > 0 ? '#dc2626' : '#10b981' }} />
            <div>
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                Needs Attention
              </h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Items requiring project lead action
              </p>
            </div>
          </div>

          {actionQueueItems.length > 0 && (
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
              {actionQueueItems.length} Pending
            </span>
          )}
        </div>

        {actionQueueItems.length === 0 ? (
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
              No items requiring intervention
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
              All project tasks and deliverables are on schedule.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {actionQueueItems.map((item) => (
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

      {/* Task Pipeline & Workload Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Task Pipeline */}
        <div className="card" style={{ backgroundColor: '#ffffff' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                Task Pipeline
              </h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Task status breakdown across projects</p>
            </div>
            <a href="/team/tasks" className="btn btn--ghost btn--xs">
              View Tasks
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>{taskPipeline.todo}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>To Do</div>
            </div>
            <div style={{ padding: 'var(--space-3)', background: 'rgba(59,130,246,0.08)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: '#2563eb' }}>{taskPipeline.inProgress}</div>
              <div style={{ fontSize: 11, color: '#2563eb' }}>In Progress</div>
            </div>
            <div style={{ padding: 'var(--space-3)', background: 'rgba(124,58,237,0.08)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: '#7c3aed' }}>{taskPipeline.review}</div>
              <div style={{ fontSize: 11, color: '#7c3aed' }}>Review / QA</div>
            </div>
            <div style={{ padding: 'var(--space-3)', background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: '#10b981' }}>{taskPipeline.completed}</div>
              <div style={{ fontSize: 11, color: '#10b981' }}>Completed</div>
            </div>
            <div style={{ padding: 'var(--space-3)', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: '#ef4444' }}>{taskPipeline.blocked}</div>
              <div style={{ fontSize: 11, color: '#ef4444' }}>Blocked</div>
            </div>
          </div>
        </div>

        {/* Team Workload */}
        <div className="card" style={{ backgroundColor: '#ffffff' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                Team Workload
              </h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Active tasks per team member</p>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{teamWorkloadList.length} Members</span>
          </div>

          {teamWorkloadList.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: 'var(--space-4) 0' }}>
              No team members assigned to projects.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {teamWorkloadList.slice(0, 5).map((member) => {
                const percent = Math.min(100, Math.round((member.activeCount / maxActiveWorkload) * 100))
                return (
                  <div
                    key={member.id}
                    style={{
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                          {member.name}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>({member.role})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {member.activeCount} active task(s)
                        </span>
                        {member.overdueCount > 0 && (
                          <span style={{ fontSize: 10, color: '#ef4444', background: 'rgba(239,68,68,0.12)', padding: '1px 6px', borderRadius: 4 }}>
                            {member.overdueCount} overdue
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="progress-bar-container" style={{ height: 5 }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: member.overdueCount > 0 ? '#ef4444' : member.activeCount > 6 ? '#f59e0b' : '#4f46e5',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Milestones & Client Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Milestones */}
        <div className="card" style={{ backgroundColor: '#ffffff' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              Milestones
            </h2>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Target Completion</span>
          </div>

          {upcomingMilestones.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: 'var(--space-4) 0' }}>
              No active project milestones.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {upcomingMilestones.map((m) => (
                <div
                  key={m.id}
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
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Project: {m.project.name} · Target: {formatDate(m.dueDate)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        background: m.status === 'COMPLETED' ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)',
                        color: m.status === 'COMPLETED' ? '#10b981' : '#3b82f6',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {m.status.replace('_', ' ')}
                    </span>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.progress}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Client Activity */}
        <div className="card" style={{ backgroundColor: '#ffffff' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              Client Activity
            </h2>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Support Tickets</span>
          </div>

          {supportTickets.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: 'var(--space-4) 0' }}>
              No open support requests.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

              {supportTickets.map((t) => (
                <div
                  key={t.id}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#ea580c' }}>Client Ticket</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatShortDate(t.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Project: {t.project.name} · Priority: {t.priority}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card" style={{ backgroundColor: '#ffffff' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
            Recent Activity
          </h2>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Task audit stream</span>
        </div>

        {taskActivities.length === 0 && projectUpdates.length === 0 ? (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: 'var(--space-4) 0' }}>
            No recent task updates recorded.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {taskActivities.map((act) => (
              <div
                key={act.id}
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
                  <strong style={{ color: 'var(--text-primary)' }}>{act.actor?.name || 'System'}</strong> updated task{' '}
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>&quot;{act.task.title}&quot;</span>: {act.action}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {formatShortDate(act.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
