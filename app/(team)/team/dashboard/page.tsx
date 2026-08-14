import { getServerUser } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { FolderKanban, CheckSquare, TestTube, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Dashboard — Tvita Team',
}

export default async function TeamDashboardPage() {
  const user = await getServerUser()
  if (!user) redirect('/login')

  const { teamRole } = user

  // Build task query based on sub-role
  const taskWhere =
    teamRole === 'TESTER'
      ? { OR: [{ testerId: user.id }, { assigneeId: user.id }] }
      : teamRole === 'DEVELOPER'
      ? { OR: [{ developerId: user.id }, { assigneeId: user.id }] }
      : teamRole === 'TEAM_LEAD'
      ? {
          project: {
            OR: [
              { leadId: user.id },
              { members: { some: { profileId: user.id } } },
            ],
          },
        }
      : { OR: [{ developerId: user.id }, { testerId: user.id }, { assigneeId: user.id }] }

  const [openTaskCount, projectCount, recentTasks, qaQueueCount, completedTaskCount] = await Promise.all([
    prisma.task.count({
      where: {
        ...taskWhere,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    }),
    prisma.project.count({
      where: {
        OR: [
          { leadId: user.id },
          { members: { some: { profileId: user.id } } },
        ],
      },
    }),
    prisma.task.findMany({
      where: {
        ...taskWhere,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      take: 6,
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      include: { project: { select: { name: true, client: { select: { name: true } } } } },
    }),
    // QA Queue count (for testers/team leads)
    prisma.task.count({
      where: { status: { in: ['READY_FOR_TESTING', 'IN_TESTING'] } },
    }),
    prisma.task.count({
      where: { ...taskWhere, status: 'COMPLETED' },
    }),
  ])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const roleLabel =
    teamRole === 'TEAM_LEAD'
      ? 'Team Lead'
      : teamRole === 'DEVELOPER'
      ? 'Developer'
      : teamRole === 'TESTER'
      ? 'QA Tester'
      : 'Team Member'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">
            {greeting}, {user.name.split(' ')[0]} 👋
          </h1>
          <p className="page-header__subtitle">
            {roleLabel} Dashboard — here&apos;s your work overview.
          </p>
        </div>
        <div className="page-header__actions">
          <Link href="/team/tasks" className="btn btn--primary btn--sm">
            View My Queue →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">
            <FolderKanban size={20} />
          </div>
          <div>
            <div className="stat-card__value">{projectCount}</div>
            <div className="stat-card__label">My Projects</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--yellow">
            <CheckSquare size={20} />
          </div>
          <div>
            <div className="stat-card__value">{openTaskCount}</div>
            <div className="stat-card__label">Open Tasks</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--color-warning)' }}>
            <TestTube size={20} />
          </div>
          <div>
            <div className="stat-card__value">{qaQueueCount}</div>
            <div className="stat-card__label">QA Queue</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="stat-card__value">{completedTaskCount}</div>
            <div className="stat-card__label">Completed</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
            {teamRole === 'TESTER' ? 'Active Testing Queue' : teamRole === 'DEVELOPER' ? 'My Development Queue' : teamRole === 'TEAM_LEAD' ? 'Project Task Overview' : 'My Tasks'}
          </h2>
          <Link href="/team/tasks" className="btn btn--ghost btn--sm">View All →</Link>
        </div>

        {recentTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon"><CheckSquare size={24} /></div>
            <div className="empty-state__title">All caught up!</div>
            <div className="empty-state__desc">You have no open tasks right now.</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Client</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map((task) => (
                  <tr key={task.id}>
                    <td style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>{task.title}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{task.project.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{task.project.client.name}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          fontSize: 10,
                          background: task.priority === 'URGENT' ? 'rgba(239,68,68,0.15)' : task.priority === 'HIGH' ? 'rgba(245,158,11,0.15)' : 'var(--bg-overlay)',
                          color: task.priority === 'URGENT' ? 'var(--color-danger)' : task.priority === 'HIGH' ? 'var(--color-warning)' : 'var(--text-muted)',
                        }}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ fontSize: 10 }}>
                        {task.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                      {task.dueDate
                        ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(task.dueDate)
                        : '—'}
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
