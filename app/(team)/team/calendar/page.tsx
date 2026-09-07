import { prisma } from '@/lib/prisma'
import { getServerUser, redirectToLogin } from '@/lib/auth/server'
import { staffAccessibleProjectIds } from '@/lib/auth/access'
import AdminCalendar from '@/app/components/admin/AdminCalendar'
import { buildCalendarPayload } from '@/lib/calendar/build-events'

export const metadata = {
  title: 'Calendar — Tvita Team',
  description: 'Meetings, tasks, and milestones on your projects — without billing.',
}

export default async function TeamCalendarPage() {
  const user = await getServerUser()
  if (!user) redirectToLogin()

  const accessibleIds = await staffAccessibleProjectIds(user)
  const projectFilter = accessibleIds === null
    ? { status: { notIn: ['CANCELLED' as const] } }
    : {
        status: { notIn: ['CANCELLED' as const] },
        id: { in: accessibleIds.length > 0 ? accessibleIds : ['__none__'] },
      }

  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 4, 0)
  const dateInRange = { gte: from, lte: to }

  const [projectRows, meetings, milestones, tasks] = await Promise.all([
    prisma.project.findMany({
      where: projectFilter,
      orderBy: { updatedAt: 'desc' },
      take: 24,
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        client: { select: { name: true } },
        milestones: {
          orderBy: { sortOrder: 'asc' },
          take: 6,
          select: { id: true, name: true, status: true, dueDate: true },
        },
      },
    }),
    prisma.meeting.findMany({
      where: { scheduledAt: dateInRange, project: projectFilter },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        duration: true,
        projectId: true,
        host: { select: { id: true, role: true } },
        project: { select: { id: true, name: true, leadId: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.milestone.findMany({
      where: { dueDate: dateInRange, project: projectFilter },
      select: {
        id: true,
        name: true,
        dueDate: true,
        projectId: true,
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.task.findMany({
      where: { dueDate: dateInRange, project: projectFilter },
      select: {
        id: true,
        title: true,
        dueDate: true,
        status: true,
        projectId: true,
        project: { select: { id: true, name: true } },
      },
      take: 200,
    }),
  ])

  const visibleMeetings = meetings.filter((meeting) => {
    if (user.role === 'ADMIN' || meeting.project.leadId === user.id) return true
    return meeting.host.role !== 'CLIENT'
  })

  const { projects, events } = buildCalendarPayload({
    projectRows,
    meetings: visibleMeetings,
    milestones,
    tasks,
    projectHref: (id) => `/team/projects/${id}`,
  })

  return (
    <div className="acalv-page">
      <AdminCalendar projects={projects} events={events} />
    </div>
  )
}
