import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import TaskBoardClient from '@/components/tasks/TaskBoardClient'

export const metadata = {
  title: 'Tasks & Workflow — Tvita Team',
  description: 'Manage development, testing, and milestone tasks with activity audit trails.',
}

export default async function TeamTasksPage() {
  const user = await getServerUser()
  if (!user) redirect('/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) redirect('/login')

  const isLeadOrAdmin = profile.role === 'ADMIN' || profile.teamRole === 'TEAM_LEAD'

  // Query tasks based on user role:
  const tasks = await prisma.task.findMany({
    where: isLeadOrAdmin
      ? {}
      : profile.teamRole === 'TESTER'
      ? {
          OR: [
            { testerId: user.id },
            { status: 'READY_FOR_TESTING' },
            { status: 'IN_TESTING' },
          ],
        }
      : {
          OR: [
            { developerId: user.id },
            { assigneeId: user.id },
          ],
        },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          client: { select: { name: true } },
          members: {
            include: {
              profile: true,
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

  // Query projects for task creation dropdown (Lead / Admin)
  const projects = isLeadOrAdmin
    ? await prisma.project.findMany({
        where: profile.role === 'ADMIN' ? {} : { leadId: profile.id },
        include: { client: { select: { name: true } } },
      })
    : []

  return (
    <div>
      {/* Page Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-header__title">
            {profile.teamRole === 'DEVELOPER'
              ? 'Developer Queue'
              : profile.teamRole === 'TESTER'
              ? 'QA Testing Queue'
              : 'Tasks & Deliverables Workflow'}
          </h1>
          <p className="page-header__subtitle">
            {tasks.length} active tasks in your queue ({profile.teamRole || profile.role}). Click any card to inspect Activity History Trail.
          </p>
        </div>
      </div>

      <TaskBoardClient
        tasks={tasks}
        userRole={profile.role}
        teamRole={profile.teamRole}
        isLeadOrAdmin={isLeadOrAdmin}
        projects={projects}
      />
    </div>
  )
}
