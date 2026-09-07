import { prisma } from '@/lib/prisma'
import { getServerUser, redirectToLogin } from '@/lib/auth/server'
import AdminCalendar from '@/app/components/admin/AdminCalendar'
import { dateKey, shortCode, buildCalendarPayload } from '@/lib/calendar/build-events'

export const metadata = {
  title: 'Calendar — Tvita Admin',
  description: 'Meetings, due dates, and project milestones across the agency.',
}

export default async function AdminCalendarPage() {
  const user = await getServerUser()
  if (!user) redirectToLogin()

  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 4, 0)

  const [projectRows, meetings, milestones, invoices, tasks] = await Promise.all([
    prisma.project.findMany({
      where: { status: { notIn: ['CANCELLED'] } },
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
      where: { scheduledAt: { gte: from, lte: to } },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        duration: true,
        projectId: true,
        project: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.milestone.findMany({
      where: { dueDate: { gte: from, lte: to } },
      select: {
        id: true,
        name: true,
        dueDate: true,
        projectId: true,
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.invoice.findMany({
      where: {
        dueDate: { gte: from, lte: to },
        status: { in: ['PENDING', 'OVERDUE', 'DRAFT'] },
      },
      select: {
        id: true,
        invoiceNo: true,
        dueDate: true,
        client: { select: { name: true } },
      },
    }),
    prisma.task.findMany({
      where: { dueDate: { gte: from, lte: to } },
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

  const { projects, events } = buildCalendarPayload({
    projectRows,
    meetings,
    milestones,
    tasks,
    projectHref: (id) => `/admin/projects/${id}`,
  })

  let codeSeq = events.length + 1
  for (const inv of invoices) {
    const key = dateKey(inv.dueDate)
    events.push({
      id: `inv-${inv.id}`,
      title: `${inv.client.name} · #${inv.invoiceNo}`,
      code: shortCode('IN', inv.id, codeSeq++),
      start: key,
      end: key,
      projectId: null,
      tone: 5,
      type: 'invoice',
      href: `/admin/billing/${inv.id}`,
    })
  }

  return (
    <div className="acalv-page">
      <AdminCalendar projects={projects} events={events} />
    </div>
  )
}
