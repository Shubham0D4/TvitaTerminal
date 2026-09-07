import { prisma } from '@/lib/prisma'
import { getServerUser, redirectToLogin } from '@/lib/auth/server'
import TaskBoardClient from '@/app/components/tasks/TaskBoardClient'
import { staffAccessibleProjectIds } from '@/lib/auth/access'

export const metadata = {
  title: 'Tasks & Workflow — Tvita Team',
  description: 'Manage development, testing, and milestone tasks with activity audit trails.',
}

export default async function TeamTasksPage() {
  const user = await getServerUser()
  if (!user) redirectToLogin()

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) redirectToLogin()

  const accessibleIds = await staffAccessibleProjectIds(user)
  const ledCount = await prisma.project.count({ where: { leadId: user.id } })
  const isLeadOrAdmin = profile.role === 'ADMIN' || ledCount > 0

  const tasks = await prisma.task.findMany({
    where: accessibleIds === null ? {} : { projectId: { in: accessibleIds } },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          banner: true,
          leadId: true,
          client: { select: { name: true } },
          lead: { select: { id: true, name: true } },
          members: {
            include: {
              profile: { select: { id: true, name: true } },
            },
          },
        },
      },
      developer: { select: { id: true, name: true } },
      tester: { select: { id: true, name: true } },
      activities: {
        include: {
          actor: { select: { name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      comments: {
        include: {
          author: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: [
      { priority: 'desc' },
      { dueDate: 'asc' },
    ],
  })

  const projects = isLeadOrAdmin
    ? await prisma.project.findMany({
        where: profile.role === 'ADMIN' ? {} : { leadId: profile.id },
        select: { id: true, name: true, client: { select: { name: true } } },
      })
    : []

  const serializedTasks = JSON.parse(JSON.stringify(tasks))

  return (
    <div className="team-tasks">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">
            {isLeadOrAdmin ? 'Task board' : 'My tasks'}
          </h1>
          <p className="page-header__subtitle">
            {isLeadOrAdmin
              ? `${tasks.length} tasks across projects you lead. Create, assign, and unblock work.`
              : `${tasks.length} tasks on your projects. Open a card to update status or leave a comment.`}
          </p>
        </div>
      </div>

      <TaskBoardClient
        tasks={serializedTasks}
        userId={profile.id}
        userRole={profile.role}
        teamRole={profile.teamRole}
        isLeadOrAdmin={isLeadOrAdmin}
        projects={projects}
      />
    </div>
  )
}
