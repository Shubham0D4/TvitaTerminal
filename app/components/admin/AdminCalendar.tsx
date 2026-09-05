'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
} from 'lucide-react'

export type CalendarTone = 0 | 1 | 2 | 3 | 4 | 5

export type CalendarProjectItem = {
  id: string
  title: string
  code: string
  done: boolean
  href?: string
}

export type CalendarProject = {
  id: string
  name: string
  tone: CalendarTone
  items: CalendarProjectItem[]
}

export type CalendarEvent = {
  id: string
  title: string
  code: string
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD inclusive
  projectId: string | null
  tone: CalendarTone
  type: 'meeting' | 'milestone' | 'project' | 'invoice' | 'task'
  href?: string
}

type ViewMode = 'week' | 'month'

const MAX_VISIBLE = 2

function toKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function startOfWeek(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - x.getDay())
  return x
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(year, month, 1)
  )
}

function weekLabel(start: Date) {
  const end = addDays(start, 6)
  const sameMonth = start.getMonth() === end.getMonth()
  if (sameMonth) {
    return `${new Intl.DateTimeFormat('en-US', { month: 'long' }).format(start)} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`
  }
  return `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(start)} – ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(end)}`
}

function daysBetween(a: string, b: string) {
  const ms = parseKey(b).getTime() - parseKey(a).getTime()
  return Math.round(ms / 86400000)
}

function EventPill({
  event,
  compact,
  expandSpan,
}: {
  event: CalendarEvent
  compact?: boolean
  /** Extra columns to span while hovered (projects only) */
  expandSpan?: number
}) {
  const isProject = event.type === 'project'
  const canExpand = isProject && (expandSpan ?? 0) > 1

  const inner = (
    <>
      <span className={`acalv__pill-icon acalv__tone-${event.tone}`} aria-hidden>
        {event.type === 'meeting'
          ? 'M'
          : event.type === 'invoice'
            ? 'I'
            : event.type === 'milestone'
              ? 'S'
              : event.type === 'task'
                ? 'T'
                : event.code.slice(0, 1)}
      </span>
      {!compact && <span className="acalv__pill-code">{event.code}</span>}
      <span className="acalv__pill-title">{event.title}</span>
    </>
  )

  const className = [
    'acalv__pill',
    `acalv__tone-${event.tone}`,
    `acalv__pill--${event.type}`,
    canExpand ? 'acalv__pill--expandable' : '',
    compact ? 'acalv__pill--compact' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const style =
    canExpand && expandSpan
      ? ({ ['--acalv-expand-span' as string]: String(expandSpan) } as React.CSSProperties)
      : undefined

  if (event.href) {
    return (
      <Link
        href={event.href}
        className={className}
        style={style}
        title={event.title}
        onClick={(e) => e.stopPropagation()}
      >
        {inner}
      </Link>
    )
  }

  return (
    <div className={className} style={style} title={event.title}>
      {inner}
    </div>
  )
}

function DayCell({
  dayKey,
  dayNum,
  inMonth,
  isToday,
  events,
  weekKeys,
}: {
  dayKey: string
  dayNum: number
  inMonth: boolean
  isToday: boolean
  events: CalendarEvent[]
  weekKeys: string[]
}) {
  const col = weekKeys.indexOf(dayKey)
  const hidden = Math.max(0, events.length - MAX_VISIBLE)
  const preview = events.slice(0, MAX_VISIBLE)

  return (
    <div
      className={`acalv__cell${inMonth ? '' : ' is-out'}${isToday ? ' is-today' : ''}${
        events.length > MAX_VISIBLE ? ' has-overflow' : ''
      }`}
    >
      <span className="acalv__daynum">{dayNum}</span>

      <div className="acalv__cell-stack">
        {preview.map((event) => {
          const expandSpan =
            event.type === 'project' && col >= 0
              ? Math.min(
                  daysBetween(dayKey, event.end) + 1,
                  weekKeys.length - col
                )
              : 1
          return (
            <EventPill
              key={event.id}
              event={event}
              expandSpan={expandSpan > 1 ? expandSpan : undefined}
            />
          )
        })}
        {hidden > 0 && (
          <span className="acalv__more">+{hidden} more</span>
        )}
      </div>

      {/* Full list revealed on cell hover — does not reflow neighbors */}
      {events.length > MAX_VISIBLE && (
        <div className="acalv__cell-pop" role="presentation">
          <span className="acalv__daynum">{dayNum}</span>
          <div className="acalv__cell-stack">
            {events.map((event) => (
              <EventPill key={`pop-${event.id}`} event={event} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminCalendar({
  projects,
  events,
}: {
  projects: CalendarProject[]
  events: CalendarEvent[]
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = toKey(today)

  const [view, setView] = useState<ViewMode>('month')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  })
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today))
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(projects.slice(0, 3).map((p) => [p.id, true]))
  )
  const [enabledProjects, setEnabledProjects] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(projects.map((p) => [p.id, true]))
  )
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const p of projects) {
      for (const item of p.items) init[item.id] = item.done
    }
    return init
  })

  /** Events visible on the board for a given day key */
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()

    const push = (key: string, ev: CalendarEvent) => {
      const list = map.get(key) ?? []
      list.push(ev)
      map.set(key, list)
    }

    for (const ev of events) {
      // Project visibility toggle only gates project-type strips
      if (ev.type === 'project') {
        if (ev.projectId && enabledProjects[ev.projectId] === false) continue
        // Fit in the start-date block until hover expands
        push(ev.start, ev)
        continue
      }

      // Meetings / milestones / tasks / invoices always show (still respect project toggle for project-linked ones)
      if (ev.projectId && enabledProjects[ev.projectId] === false) continue

      // Place single-day (or each day for rare multi-day non-project)
      let cur = ev.start
      while (cur <= ev.end) {
        push(cur, ev)
        if (cur === ev.end) break
        cur = toKey(addDays(parseKey(cur), 1))
      }
    }

    // Prefer meetings/milestones before long project titles in the stack
    for (const [k, list] of map) {
      list.sort((a, b) => {
        const rank = (t: CalendarEvent['type']) =>
          t === 'meeting' ? 0 : t === 'milestone' ? 1 : t === 'task' ? 2 : t === 'invoice' ? 3 : 4
        return rank(a.type) - rank(b.type) || a.title.localeCompare(b.title)
      })
      map.set(k, list)
    }

    return map
  }, [events, enabledProjects])

  const monthWeeks = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1)
    const monthEnd = new Date(cursor.year, cursor.month + 1, 0)
    let cursorDay = startOfWeek(first)
    const weeks: string[][] = []
    while (true) {
      const week = Array.from({ length: 7 }, (_, i) => toKey(addDays(cursorDay, i)))
      weeks.push(week)
      const weekEnd = addDays(cursorDay, 6)
      cursorDay = addDays(cursorDay, 7)
      if (weekEnd >= monthEnd) break
      if (weeks.length > 6) break
    }
    return weeks
  }, [cursor])

  const weekKeys = useMemo(
    () => Array.from({ length: 7 }, (_, i) => toKey(addDays(weekStart, i))),
    [weekStart]
  )

  const shiftMonth = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  const shiftWeek = (delta: number) => {
    setWeekStart((w) => addDays(w, delta * 7))
  }

  const goToday = () => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    setCursor({ year: t.getFullYear(), month: t.getMonth() })
    setWeekStart(startOfWeek(t))
  }

  const headerLabel =
    view === 'month' ? monthLabel(cursor.year, cursor.month) : weekLabel(weekStart)

  const renderWeekRow = (week: string[], tall?: boolean) => (
    <div key={week[0]} className={`acalv__week${tall ? ' acalv__week--tall' : ''}`}>
      {week.map((key) => {
        const date = parseKey(key)
        const inMonth = view === 'week' || date.getMonth() === cursor.month
        return (
          <DayCell
            key={key}
            dayKey={key}
            dayNum={date.getDate()}
            inMonth={inMonth}
            isToday={key === todayKey}
            events={eventsByDay.get(key) ?? []}
            weekKeys={week}
          />
        )
      })}
    </div>
  )

  return (
    <div className={`acalv${sidebarOpen ? '' : ' acalv--collapsed'}`}>
      <aside className="acalv__rail" aria-label="Projects">
        <div className="acalv__rail-head">
          <span className="acalv__rail-title">Projects</span>
          <button
            type="button"
            className="acalv__icon-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Collapse projects panel"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>

        <div className="acalv__rail-body">
          {projects.length === 0 ? (
            <p className="acalv__rail-empty">No active projects</p>
          ) : (
            projects.map((project) => {
              const open = expanded[project.id] === true
              const enabled = enabledProjects[project.id] !== false
              return (
                <div key={project.id} className={`acalv__proj${!enabled ? ' is-off' : ''}`}>
                  <div className="acalv__proj-head">
                    <button
                      type="button"
                      className="acalv__proj-toggle"
                      onClick={() =>
                        setExpanded((p) => ({ ...p, [project.id]: !open }))
                      }
                      aria-expanded={open}
                    >
                      <ChevronDown
                        size={14}
                        className={`acalv__chevron${open ? ' is-open' : ''}`}
                      />
                      <span className={`acalv__proj-badge acalv__tone-${project.tone}`}>
                        {project.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="acalv__proj-name">{project.name}</span>
                    </button>
                    <label className="acalv__check" title="Show project on calendar">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() =>
                          setEnabledProjects((prev) => ({
                            ...prev,
                            [project.id]: !enabled,
                          }))
                        }
                      />
                    </label>
                  </div>

                  {open && (
                    <ul className="acalv__items">
                      {project.items.length === 0 ? (
                        <li className="acalv__item acalv__item--empty">No milestones</li>
                      ) : (
                        project.items.map((item) => {
                          const done = checkedItems[item.id]
                          return (
                            <li
                              key={item.id}
                              className={`acalv__item${done ? ' is-done' : ''}`}
                            >
                              <label className="acalv__item-check">
                                <input
                                  type="checkbox"
                                  checked={Boolean(done)}
                                  onChange={() =>
                                    setCheckedItems((p) => ({
                                      ...p,
                                      [item.id]: !p[item.id],
                                    }))
                                  }
                                />
                                <span className="acalv__item-text">
                                  {item.href ? (
                                    <Link href={item.href}>{item.title}</Link>
                                  ) : (
                                    item.title
                                  )}
                                </span>
                              </label>
                              <span className="acalv__item-code"># {item.code}</span>
                            </li>
                          )
                        })
                      )}
                    </ul>
                  )}
                </div>
              )
            })
          )}
        </div>
      </aside>

      <section className="acalv__workspace">
        <header className="acalv__top">
          <div className="acalv__top-left">
            {!sidebarOpen && (
              <button
                type="button"
                className="acalv__icon-btn"
                onClick={() => setSidebarOpen(true)}
                aria-label="Show projects panel"
              >
                <PanelLeft size={16} />
              </button>
            )}
            <h1 className="acalv__heading">Calendar</h1>
          </div>
          <div className="acalv__top-actions">
            <div className="acalv__seg" role="group" aria-label="Calendar view">
              <button
                type="button"
                className={`acalv__seg-btn${view === 'week' ? ' is-active' : ''}`}
                onClick={() => setView('week')}
              >
                Weekly
              </button>
              <button
                type="button"
                className={`acalv__seg-btn${view === 'month' ? ' is-active' : ''}`}
                onClick={() => setView('month')}
              >
                Monthly
              </button>
            </div>
            <button type="button" className="acalv__chip-btn" onClick={goToday}>
              Today
            </button>
          </div>
        </header>

        <div className="acalv__nav">
          <button
            type="button"
            className="acalv__nav-btn"
            onClick={() => (view === 'month' ? shiftMonth(-1) : shiftWeek(-1))}
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="acalv__period">{headerLabel}</h2>
          <button
            type="button"
            className="acalv__nav-btn"
            onClick={() => (view === 'month' ? shiftMonth(1) : shiftWeek(1))}
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="acalv__board">
          <div className="acalv__weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          {view === 'month'
            ? monthWeeks.map((week) => renderWeekRow(week))
            : renderWeekRow(weekKeys, true)}
        </div>
      </section>
    </div>
  )
}
