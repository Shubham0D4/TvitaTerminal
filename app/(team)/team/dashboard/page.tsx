import { getServerUser, isTeamMember, isAdmin, redirectToLogin, redirectToPortal } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { cleanupExpiredInvitations } from '@/lib/invitation-cleanup'
import Link from 'next/link'
import {
  FolderKanban,
  CheckSquare,
  AlertTriangle,
  Clock,
  Users,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react'

export const metadata = {
  title: 'Dashboard — Tvita Team',
  description: 'Assigned work, project health, and what needs attention today.',
}

function formatDate(dateInput: Date | string | null | undefined) {
  if (!dateInput) return 'TBD'
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return 'TBD'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}

function formatShortDate(dateInput: Date | string | null | undefined) {
  if (!dateInput) return 'TBD'
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return 'TBD'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(d)
}

function projectHealth(
  project: { status: string; progress: number; endDate?: Date | string | null },
  projectTasks: Array<{ status: string; dueDate?: Date | string | null }> = [],
) {
  if (project.status === 'COMPLETED') {
    return { label: 'Completed', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', chip: 'green' as const }
  }
  const blocked = projectTasks.filter((t) => t.status === 'BLOCKED').length
  if (blocked > 0) {
    return { label: 'Blocked', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)', chip: 'red' as const }
  }
  const now = new Date()
  const overdue = projectTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED',
  ).length
  if (project.endDate) {
    const diffDays = Math.ceil((new Date(project.endDate).getTime() - now.getTime()) / 86400000)
    if ((diffDays < 0 && project.progress < 100) || overdue >= 2) {
      return { label: 'Delayed', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)', chip: 'red' as const }
    }
    if ((diffDays <= 7 && project.progress < 75) || overdue === 1) {
      return { label: 'At risk', color: '#d97706', bg: 'rgba(217, 119, 6, 0.12)', chip: 'amber' as const }
    }
  }
  return { label: 'On track', color: '#059669', bg: 'rgba(5, 150, 105, 0.12)', chip: 'green' as const }
}

export default async function TeamDashboardPage() {
  cleanupExpiredInvitations().catch((err) => console.error('[Cleanup Error]', err))

  const user = await getServerUser()
  if (!user) redirectToLogin()
  if (!isTeamMember(user) && !isAdmin(user)) redirectToPortal(user)

  const isUserAdmin = isAdmin(user)
  const projectWhere = isUserAdmin
    ? {}
    : { OR: [{ leadId: user.id }, { members: { some: { profileId: user.id } } }] }

  const [projects, allTasks, supportTickets, upcomingMilestones, ledCount] = await Promise.all([
    prisma.project.findMany({
      where: projectWhere,
      orderBy: { updatedAt: 'desc' },
      include: {
        client: { select: { name: true } },
        lead: { select: { id: true, name: true } },
        members: { include: { profile: { select: { id: true, name: true, email: true, teamRole: true } } } },
        milestones: { orderBy: { dueDate: 'asc' }, take: 1 },
      },
    }),
    prisma.task.findMany({
      where: { project: projectWhere },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        developer: { select: { id: true, name: true } },
        tester: { select: { id: true, name: true } },
      },
    }),
    prisma.ticket.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        project: isUserAdmin ? projectWhere : { leadId: user.id },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { project: { select: { name: true } } },
    }),
    prisma.milestone.findMany({
      where: { project: projectWhere, status: { in: ['PLANNED', 'IN_PROGRESS'] } },
      orderBy: { dueDate: 'asc' },
      take: 5,
      include: { project: { select: { name: true } } },
    }),
    prisma.project.count({ where: { leadId: user.id } }),
  ])

  const isLeadView = isUserAdmin || ledCount > 0
  const now = new Date()
  const weekAhead = new Date(now.getTime() + 7 * 86400000)

  const mine = (t: (typeof allTasks)[number]) =>
    t.assigneeId === user.id || t.developerId === user.id || t.testerId === user.id

  const focusTasks = isLeadView ? allTasks : allTasks.filter(mine)
  const openTasks = focusTasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
  const overdueTasks = openTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now)
  const blockedTasks = openTasks.filter((t) => t.status === 'BLOCKED')
  const dueSoon = openTasks.filter((t) => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= weekAhead)
  const unassignedTasks = allTasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && !t.assigneeId && !t.developerId)
  const reviewTasks = openTasks.filter((t) =>
    ['READY_FOR_TESTING', 'IN_TESTING', 'CHANGES_REQUIRED'].includes(t.status),
  )
  const activeProjects = projects.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'PLANNED')

  const pipeline = {
    todo: focusTasks.filter((t) => t.status === 'TODO').length,
    inProgress: focusTasks.filter((t) => t.status === 'IN_PROGRESS').length,
    review: reviewTasks.length,
    completed: focusTasks.filter((t) => t.status === 'COMPLETED').length,
    blocked: blockedTasks.length,
  }

  const memberWorkloadMap = new Map<string, { id: string; name: string; role: string; activeCount: number; overdueCount: number }>()
  if (isLeadView) {
    projects.forEach((proj) => {
      proj.members.forEach((m) => {
        if (!memberWorkloadMap.has(m.profile.id)) {
          memberWorkloadMap.set(m.profile.id, {
            id: m.profile.id,
            name: m.profile.name,
            role: m.profile.teamRole || m.role || 'Member',
            activeCount: 0,
            overdueCount: 0,
          })
        }
      })
    })
    openTasks.forEach((t) => {
      const memberId = t.developerId || t.assigneeId || t.testerId
      if (memberId && memberWorkloadMap.has(memberId)) {
        const target = memberWorkloadMap.get(memberId)!
        target.activeCount += 1
        if (t.dueDate && new Date(t.dueDate) < now) target.overdueCount += 1
      }
    })
  }
  const teamWorkloadList = Array.from(memberWorkloadMap.values()).sort((a, b) => b.activeCount - a.activeCount)
  const maxActiveWorkload = Math.max(...teamWorkloadList.map((m) => m.activeCount), 1)

  type QueueItem = { id: string; title: string; subtitle: string; badge: string; chip: string; href: string; cta: string }
  const queue: QueueItem[] = []
  if (overdueTasks.length > 0) {
    queue.push({
      id: 'overdue',
      title: `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'}`,
      subtitle: `"${overdueTasks[0].title}" · ${overdueTasks[0].project.name}`,
      badge: 'Overdue',
      chip: 'red',
      href: '/team/tasks',
      cta: isLeadView ? 'View tasks' : 'Open my tasks',
    })
  }
  if (blockedTasks.length > 0) {
    queue.push({
      id: 'blocked',
      title: `${blockedTasks.length} blocked task${blockedTasks.length === 1 ? '' : 's'}`,
      subtitle: `"${blockedTasks[0].title}" · ${blockedTasks[0].project.name}`,
      badge: 'Blocked',
      chip: 'red',
      href: '/team/tasks',
      cta: 'Unblock',
    })
  }
  if (isLeadView && unassignedTasks.length > 0) {
    queue.push({
      id: 'unassigned',
      title: `${unassignedTasks.length} unassigned task${unassignedTasks.length === 1 ? '' : 's'}`,
      subtitle: `"${unassignedTasks[0].title}" · ${unassignedTasks[0].project.name}`,
      badge: 'Unassigned',
      chip: 'amber',
      href: '/team/tasks',
      cta: 'Assign',
    })
  }
  if (reviewTasks.length > 0) {
    queue.push({
      id: 'review',
      title: `${reviewTasks.length} in review / QA`,
      subtitle: `"${reviewTasks[0].title}" · ${reviewTasks[0].project.name}`,
      badge: 'QA',
      chip: 'blue',
      href: '/team/tasks',
      cta: 'Review',
    })
  }
  supportTickets.forEach((t) => {
    queue.push({
      id: `ticket-${t.id}`,
      title: t.title,
      subtitle: `${t.project.name} · ${t.priority}`,
      badge: 'Ticket',
      chip: 'amber',
      href: `/team/projects/${t.projectId}`,
      cta: 'Open',
    })
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user.name?.split(' ')[0] ?? 'there'

  const myMilestones = isLeadView
    ? upcomingMilestones
    : upcomingMilestones.filter((m) => (m as { assigneeId?: string }).assigneeId === user.id)

  return (
    <div className="admin-dash team-dash">
      <header className="admin-dash__header">
        <div>
          <h1 className="admin-dash__greeting">
            {greeting}, {firstName}
          </h1>
          <p className="admin-dash__lede">
            {isLeadView
              ? 'Coordinate projects, workload, and blockers — not org-wide admin.'
              : 'What you need to work on today.'}
          </p>
        </div>
        <div className="admin-dash__actions">
          <span className="admin-dash__health">
            <span
              className="admin-dash__health-dot"
              style={{ background: queue.length > 0 ? '#dc2626' : '#10b981' }}
            />
            {queue.length > 0 ? `${queue.length} need attention` : 'All clear'}
          </span>
          <Link href="/team/tasks" className="btn btn--primary btn--sm">
            {isLeadView ? 'Task board' : 'My tasks'}
            <ChevronRight size={14} />
          </Link>
        </div>
      </header>

      <div className="admin-dash__grid">
        <article className="admin-dash__cell admin-dash__cell--3">
          <div className="admin-dash__panel admin-dash__panel--metric admin-dash__panel--compact">
            <div className="admin-dash__panel-head">
              <FolderKanban size={16} />
              <span className="admin-dash__metric-label">Projects</span>
            </div>
            <div className="admin-dash__metric-value">{activeProjects.length}</div>
            <span className="admin-dash__chip admin-dash__chip--purple">Active</span>
          </div>
        </article>
        <article className="admin-dash__cell admin-dash__cell--3">
          <div className="admin-dash__panel admin-dash__panel--metric admin-dash__panel--compact">
            <div className="admin-dash__panel-head">
              <CheckSquare size={16} />
              <span className="admin-dash__metric-label">{isLeadView ? 'Open tasks' : 'My open tasks'}</span>
            </div>
            <div className="admin-dash__metric-value">{openTasks.length}</div>
            <span className="admin-dash__chip admin-dash__chip--blue">{dueSoon.length} due this week</span>
          </div>
        </article>
        <article className="admin-dash__cell admin-dash__cell--3">
          <div className={`admin-dash__panel admin-dash__panel--metric admin-dash__panel--compact${overdueTasks.length ? ' admin-dash__panel--danger' : ''}`}>
            <div className="admin-dash__panel-head">
              <Clock size={16} />
              <span className="admin-dash__metric-label">Overdue</span>
            </div>
            <div className="admin-dash__metric-value">{overdueTasks.length}</div>
            <span className={`admin-dash__chip ${overdueTasks.length ? 'admin-dash__chip--red' : 'admin-dash__chip--green'}`}>
              {overdueTasks.length ? 'Follow up' : 'None'}
            </span>
          </div>
        </article>
        <article className="admin-dash__cell admin-dash__cell--3">
          <div className={`admin-dash__panel admin-dash__panel--metric admin-dash__panel--compact${blockedTasks.length ? ' admin-dash__panel--warn' : ''}`}>
            <div className="admin-dash__panel-head">
              {isLeadView ? <Users size={16} /> : <AlertTriangle size={16} />}
              <span className="admin-dash__metric-label">{isLeadView ? 'Team' : 'Blocked'}</span>
            </div>
            <div className="admin-dash__metric-value">{isLeadView ? teamWorkloadList.length : blockedTasks.length}</div>
            <span className="admin-dash__chip admin-dash__chip--amber">
              {isLeadView ? 'On your projects' : blockedTasks.length ? 'Needs you' : 'Clear'}
            </span>
          </div>
        </article>

        <article className="admin-dash__cell admin-dash__cell--7">
          <div className="admin-dash__panel admin-dash__panel--tall">
            <div className="admin-dash__panel-head">
              <div>
                <h2 className="admin-dash__panel-title">Needs attention</h2>
                <p className="admin-dash__panel-sub">
                  {isLeadView ? 'Blockers, assignments, and client tickets across your projects.' : 'Start with these items on your plate.'}
                </p>
              </div>
              {queue.length > 0 && (
                <span className="admin-dash__chip admin-dash__chip--red">{queue.length}</span>
              )}
            </div>
            {queue.length === 0 ? (
              <div className="admin-dash__status-ok">
                <ShieldAlert size={18} />
                <div>
                  <div className="admin-dash__status-ok-title">Nothing waiting</div>
                  <p className="admin-dash__status-ok-desc">No overdue, blocked, or open client tickets right now.</p>
                </div>
              </div>
            ) : (
              <ul className="admin-dash__list">
                {queue.slice(0, 6).map((item) => (
                  <li key={item.id} className="admin-dash__list-row">
                    <div>
                      <span className={`admin-dash__chip admin-dash__chip--${item.chip}`}>{item.badge}</span>
                      <div className="team-dash__row-title">{item.title}</div>
                      <div className="team-dash__row-sub">{item.subtitle}</div>
                    </div>
                    <Link href={item.href} className="btn btn--secondary btn--xs">
                      {item.cta} <ChevronRight size={12} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>

        <article className="admin-dash__cell admin-dash__cell--5">
          <div className="admin-dash__panel admin-dash__panel--tall">
            <div className="admin-dash__panel-head">
              <div>
                <h2 className="admin-dash__panel-title">{isLeadView ? 'Task pipeline' : 'My pipeline'}</h2>
                <p className="admin-dash__panel-sub">Status across {isLeadView ? 'your projects' : 'your assignments'}</p>
              </div>
              <Link href="/team/tasks" className="btn btn--ghost btn--xs">Board</Link>
            </div>
            <div className="team-dash__pipeline">
              {[
                { n: pipeline.todo, l: 'To do' },
                { n: pipeline.inProgress, l: 'In progress', tone: 'blue' },
                { n: pipeline.review, l: 'Review', tone: 'purple' },
                { n: pipeline.completed, l: 'Done', tone: 'green' },
                { n: pipeline.blocked, l: 'Blocked', tone: 'red' },
              ].map((cell) => (
                <div key={cell.l} className={`team-dash__pipe${cell.tone ? ` team-dash__pipe--${cell.tone}` : ''}`}>
                  <strong>{cell.n}</strong>
                  <span>{cell.l}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="admin-dash__cell admin-dash__cell--12">
          <div className="admin-dash__panel">
            <div className="admin-dash__panel-head">
              <div>
                <h2 className="admin-dash__panel-title">{isLeadView ? 'Project health' : 'My projects'}</h2>
                <p className="admin-dash__panel-sub">
                  {isLeadView ? 'Progress, deadlines, and blockers on projects you lead or join.' : 'Where you are assigned.'}
                </p>
              </div>
              <Link href="/team/projects" className="btn btn--ghost btn--sm">
                All projects <ChevronRight size={14} />
              </Link>
            </div>
            {projects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon"><FolderKanban size={22} /></div>
                <div className="empty-state__title">No projects yet</div>
                <div className="empty-state__desc">Projects you lead or join will show up here.</div>
              </div>
            ) : (
              <ul className="team-dash__projects">
                {projects.slice(0, isLeadView ? 8 : 6).map((project) => {
                  const health = projectHealth(project, allTasks.filter((t) => t.projectId === project.id))
                  const next = project.milestones[0]
                  const leading = project.leadId === user.id
                  return (
                    <li key={project.id}>
                      <Link href={`/team/projects/${project.id}`} className="team-dash__project">
                        <div>
                          <div className="team-dash__project-name">{project.name}</div>
                          <div className="team-dash__project-meta">
                            {project.client.name}
                            {project.lead ? ` · ${project.lead.name}` : ''}
                            {leading ? ' · You lead' : ''}
                          </div>
                        </div>
                        <span className={`admin-dash__chip admin-dash__chip--${health.chip}`}>{health.label}</span>
                        {next && (
                          <span className="team-dash__project-ms">{next.name} · {formatShortDate(next.dueDate)}</span>
                        )}
                        <span className="team-dash__project-due">{formatDate(project.endDate)}</span>
                        <span className="team-dash__project-pct">{project.progress}%</span>
                        <span className="btn btn--ghost btn--xs">
                          Open <ArrowUpRight size={12} />
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </article>

        {isLeadView && (
          <article className="admin-dash__cell admin-dash__cell--6">
            <div className="admin-dash__panel">
              <div className="admin-dash__panel-head">
                <div>
                  <h2 className="admin-dash__panel-title">Team workload</h2>
                  <p className="admin-dash__panel-sub">Active tasks on people assigned to your projects</p>
                </div>
              </div>
              {teamWorkloadList.length === 0 ? (
                <p className="admin-dash__panel-sub">No members assigned yet.</p>
              ) : (
                <ul className="team-dash__workload">
                  {teamWorkloadList.slice(0, 6).map((member) => {
                    const percent = Math.min(100, Math.round((member.activeCount / maxActiveWorkload) * 100))
                    return (
                      <li key={member.id}>
                        <div className="team-dash__wl-head">
                          <span>{member.name}</span>
                          <span>
                            {member.activeCount} active
                            {member.overdueCount > 0 ? ` · ${member.overdueCount} overdue` : ''}
                          </span>
                        </div>
                        <div className="progress-bar-container" style={{ height: 5 }}>
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${percent}%`,
                              background: member.overdueCount > 0 ? '#ef4444' : 'var(--accent-primary)',
                            }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </article>
        )}

        <article className={`admin-dash__cell ${isLeadView ? 'admin-dash__cell--6' : 'admin-dash__cell--12'}`}>
          <div className="admin-dash__panel">
            <div className="admin-dash__panel-head">
              <div>
                <h2 className="admin-dash__panel-title">Upcoming milestones</h2>
                <p className="admin-dash__panel-sub">{isLeadView ? 'Next deadlines on your projects' : 'Assigned to you'}</p>
              </div>
              <Link href="/team/milestones" className="btn btn--ghost btn--xs">Mine</Link>
            </div>
            {(!isLeadView ? myMilestones : upcomingMilestones).length === 0 ? (
              <p className="admin-dash__panel-sub">
                {isLeadView ? 'No active milestones.' : 'None assigned to you yet.'}
              </p>
            ) : (
              <ul className="admin-dash__list">
                {(isLeadView ? upcomingMilestones : myMilestones).slice(0, 5).map((m) => (
                  <li key={m.id} className="admin-dash__list-row">
                    <div>
                      <div className="team-dash__row-title">{m.name}</div>
                      <div className="team-dash__row-sub">{m.project.name} · {formatDate(m.dueDate)}</div>
                    </div>
                    <span className="admin-dash__chip admin-dash__chip--blue">{m.progress}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
