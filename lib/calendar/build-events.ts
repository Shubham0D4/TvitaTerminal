import type { CalendarEvent, CalendarProject, CalendarTone } from '@/app/components/admin/AdminCalendar'

export function dateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function toneFor(id: string, index: number): CalendarTone {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return ((h + index) % 6) as CalendarTone
}

export function shortCode(prefix: string, id: string, n: number) {
  return `${prefix}-${String(n).padStart(2, '0')}`
}

export function addDaysKey(key: string, days: number) {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  return dateKey(dt)
}

type ProjectRow = {
  id: string
  name: string
  startDate: Date | null
  endDate: Date | null
  milestones: { id: string; name: string; status: string; dueDate: Date | null }[]
}

type MeetingRow = {
  id: string
  title: string
  scheduledAt: Date
  duration: number
  projectId: string
  project: { id: string; name: string }
}

type DatedRow = {
  id: string
  name?: string
  title?: string
  dueDate: Date | null
  projectId: string
  project: { id: string; name: string }
}

export function buildCalendarPayload(input: {
  projectRows: ProjectRow[]
  meetings: MeetingRow[]
  milestones: DatedRow[]
  tasks: DatedRow[]
  projectHref: (projectId: string) => string
}): { projects: CalendarProject[]; events: CalendarEvent[] } {
  const toneByProject = new Map<string, CalendarTone>()
  const projects: CalendarProject[] = input.projectRows.map((p, i) => {
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
        href: input.projectHref(p.id),
      })),
    }
  })

  const events: CalendarEvent[] = []
  let codeSeq = 1

  for (const p of input.projectRows) {
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
      href: input.projectHref(p.id),
    })
  }

  for (const m of input.meetings) {
    const start = dateKey(m.scheduledAt)
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
      href: input.projectHref(m.project.id),
    })
  }

  for (const m of input.milestones) {
    if (!m.dueDate) continue
    const key = dateKey(m.dueDate)
    events.push({
      id: `ms-${m.id}`,
      title: m.name ?? m.title ?? 'Milestone',
      code: shortCode('MS', m.id, codeSeq++),
      start: key,
      end: key,
      projectId: m.projectId,
      tone: toneByProject.get(m.projectId) ?? 1,
      type: 'milestone',
      href: input.projectHref(m.project.id),
    })
  }

  for (const t of input.tasks) {
    if (!t.dueDate) continue
    const key = dateKey(t.dueDate)
    events.push({
      id: `task-${t.id}`,
      title: t.title ?? t.name ?? 'Task',
      code: shortCode('TK', t.id, codeSeq++),
      start: key,
      end: key,
      projectId: t.projectId,
      tone: toneByProject.get(t.projectId) ?? 4,
      type: 'task',
      href: input.projectHref(t.project.id),
    })
  }

  return { projects, events }
}
