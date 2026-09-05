import { prisma } from '@/lib/prisma'
import { getServerUser, redirectToLogin } from '@/lib/auth/server'
import AdminCalendar, {
  type CalendarEvent,
  type CalendarProject,
  type CalendarTone,
} from '@/app/components/admin/AdminCalendar'

export const metadata = {
  title: 'Calendar — Tvita Admin',
  description: 'Meetings, due dates, and project milestones across the agency.',
}

function dateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toneFor(id: string, index: number): CalendarTone {
  // Stable-ish hash + index fallback into 0..5
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return ((h + index) % 6) as CalendarTone
}

function shortCode(prefix: string, id: string, n: number) {
  return `${prefix}-${String(n).padStart(2, '0')}`
}

function addDaysKey(key: string, days: number) {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  return dateKey(dt)
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

  const toneByProject = new Map<string, CalendarTone>()
  const projects: CalendarProject[] = projectRows.map((p, i) => {
    const tone = toneFor(p.id, i)
    toneByProject.set(p.id, tone)
    return {
      id: p.id,
      name: p.name,
      tone,
      items: p.milestones.map((m, mi) => ({
        id: m.id,
        title: m.name,
        code: shortCode('MS', m.id, mi + 1),
        done: m.status === 'COMPLETED',
        href: `/admin/projects/${p.id}`,
      })),
    }
  })

  const events: CalendarEvent[] = []
  let codeSeq = 1

  for (const p of projectRows) {
    if (!p.startDate && !p.endDate) continue
    const start = dateKey(p.startDate ?? p.endDate!)
    const end = dateKey(p.endDate ?? p.startDate!)
    events.push({
      id: `proj-${p.id}`,
      title: p.name,
      code: shortCode('PR', p.id, codeSeq++),
      start,
      end: end < start ? start : end,
      projectId: p.id,
      tone: toneByProject.get(p.id) ?? 0,
      type: 'project',
      href: `/admin/projects/${p.id}`,
    })
  }

  for (const m of meetings) {
    const start = dateKey(m.scheduledAt)
    // Meetings spanning longer than a day from duration (minutes)
    const daySpan = Math.max(0, Math.ceil(m.duration / (60 * 24)) - 1)
    const end = addDaysKey(start, daySpan)
    events.push({
      id: `meet-${m.id}`,
      title: m.title,
      code: shortCode('MT', m.id, codeSeq++),
      start,
      end,
      projectId: m.projectId,
      tone: toneByProject.get(m.projectId) ?? toneFor(m.projectId, 3),
      type: 'meeting',
      href: `/admin/projects/${m.project.id}`,
    })
  }

  for (const m of milestones) {
    if (!m.dueDate) continue
    const key = dateKey(m.dueDate)
    events.push({
      id: `ms-${m.id}`,
      title: m.name,
      code: shortCode('MS', m.id, codeSeq++),
      start: key,
      end: key,
      projectId: m.projectId,
      tone: toneByProject.get(m.projectId) ?? 1,
      type: 'milestone',
      href: `/admin/projects/${m.project.id}`,
    })
  }

  for (const t of tasks) {
    if (!t.dueDate) continue
    const key = dateKey(t.dueDate)
    events.push({
      id: `task-${t.id}`,
      title: t.title,
      code: shortCode('TK', t.id, codeSeq++),
      start: key,
      end: key,
      projectId: t.projectId,
      tone: toneByProject.get(t.projectId) ?? 4,
      type: 'task',
      href: `/admin/projects/${t.project.id}`,
    })
  }

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
