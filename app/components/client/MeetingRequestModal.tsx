'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

export type MeetingProject = { id: string; name: string }

interface MeetingRequestModalProps {
  open: boolean
  onClose: () => void
  projects: MeetingProject[]
}

/** Matches the transition duration in globals.css. */
const TRANSITION_MS = 320
type Step = 'details' | 'time'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** Bookable window, in minutes from midnight, and the slot interval. */
const DAY_START = 9 * 60
const DAY_END = 18 * 60
const SLOT_MINUTES = 30

const TIME_SLOTS = Array.from(
  { length: (DAY_END - DAY_START) / SLOT_MINUTES },
  (_, index) => DAY_START + index * SLOT_MINUTES,
)

function formatSlot(minutes: number) {
  const hours24 = Math.floor(minutes / 60)
  const mins = minutes % 60
  const meridiem = hours24 < 12 ? 'AM' : 'PM'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return `${hours12}:${String(mins).padStart(2, '0')} ${meridiem}`
}

const MONTH_YEAR = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' })
const SHORT_DATE = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

/** Monday-first offset for the 1st of the month. */
function leadingBlanks(year: number, month: number) {
  const weekday = new Date(year, month, 1).getDay()
  return (weekday + 6) % 7
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function isBeforeToday(date: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

export default function MeetingRequestModal({ open, onClose, projects }: MeetingRequestModalProps) {
  // `rendered` keeps the sheet in the DOM while it animates out; `visible`
  // drives the transition.
  const [rendered, setRendered] = useState(open)
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<Step>('details')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  // No picker any more — the request attaches to the most recent project.
  const projectId = projects[0]?.id ?? ''
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [slot, setSlot] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const today = useMemo(() => new Date(), [])
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const closeTimer = useRef<number | undefined>(undefined)

  // Adjusting derived state during render, rather than in an effect, avoids a
  // second render pass just to mount.
  if (open && !rendered) setRendered(true)

  // Every state change below is deferred into a frame or timer callback —
  // setting state synchronously inside an effect cascades renders.
  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }

    const frame = requestAnimationFrame(() => setVisible(false))
    closeTimer.current = window.setTimeout(() => {
      setRendered(false)
      // Reset only once it has animated out, so the last step isn't seen changing.
      setStep('details')
      setTitle('')
      setDescription('')
      setSelectedDate(null)
      setSlot(null)
    }, TRANSITION_MS)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(closeTimer.current)
    }
  }, [open])

  useEffect(() => {
    if (!rendered) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const { overflow, paddingRight } = document.body.style
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
    }
  }, [rendered, onClose])

  const scheduledAt = useMemo(() => {
    if (!selectedDate || slot === null) return null
    const date = new Date(selectedDate)
    date.setHours(Math.floor(slot / 60), slot % 60, 0, 0)
    return date
  }, [selectedDate, slot])

  const submit = async () => {
    if (!scheduledAt || !projectId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          scheduledAt: scheduledAt.toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) throw new Error(data?.error ?? 'Request failed')

      toast.success('Meeting request sent')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send the request.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!rendered) return null

  const blanks = leadingBlanks(viewYear, viewMonth)
  const dayCount = daysInMonth(viewYear, viewMonth)

  return createPortal(
    <div
      className={`sheet${visible ? ' is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Request a meeting"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="sheet__panel">
        {step === 'details' ? (
          <>
        <div className="sheet__head">
          <h2 className="sheet__title">Request a meeting</h2>
          <p className="sheet__lede">Schedule time with our team.</p>
        </div>

        <div className="sheet__cols">
          {/* Left: what the meeting is about */}
          <div className="sheet__col">
            <div className="sheet__field">
              <label className="sheet__label" htmlFor="meet-title">Title</label>
              <input
                id="meet-title"
                className="sheet__input"
                placeholder="e.g. Design review"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                autoFocus
              />
            </div>

            <div className="sheet__field">
              <label className="sheet__label" htmlFor="meet-desc">Description</label>
              <textarea
                id="meet-desc"
                className="sheet__input sheet__input--area"
                placeholder="Anything we should prepare? (optional)"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={6}
              />
            </div>
          </div>

          {/* Right: when it should happen */}
          <div className="sheet__col">
            <div className="cal__head">
              <span className="cal__month">{MONTH_YEAR.format(new Date(viewYear, viewMonth))}</span>

              <div className="cal__nav">
                <button
                  type="button"
                  className="cal__arrow"
                  aria-label="Previous month"
                  onClick={() => {
                    const date = new Date(viewYear, viewMonth - 1)
                    setViewYear(date.getFullYear())
                    setViewMonth(date.getMonth())
                  }}
                >
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  className="cal__arrow"
                  aria-label="Next month"
                  onClick={() => {
                    const date = new Date(viewYear, viewMonth + 1)
                    setViewYear(date.getFullYear())
                    setViewMonth(date.getMonth())
                  }}
                >
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="cal__grid" role="grid">
              {WEEKDAYS.map((day, index) => (
                <span key={`${day}-${index}`} className="cal__weekday">{day}</span>
              ))}

              {Array.from({ length: blanks }).map((_, index) => (
                <span key={`blank-${index}`} />
              ))}

              {Array.from({ length: dayCount }).map((_, index) => {
                const date = new Date(viewYear, viewMonth, index + 1)
                const disabled = isBeforeToday(date)
                const selected = selectedDate?.toDateString() === date.toDateString()
                const isToday = date.toDateString() === today.toDateString()
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    className={`cal__day${selected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}`}
                    disabled={disabled}
                    onClick={() => setSelectedDate(date)}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>

          </div>
        </div>

        <button
          type="button"
          className="sheet__cta"
          disabled={!title.trim() || !selectedDate || !projectId}
          onClick={() => setStep('time')}
        >
          {selectedDate ? 'Continue' : 'Pick a date to continue'}
        </button>
          </>
        ) : (
          <div className="sheet__step">
            <div className="sheet__head">
              <h2 className="sheet__title">Pick a time</h2>
              <p className="sheet__lede">
                {selectedDate ? SHORT_DATE.format(selectedDate) : ''}
              </p>
            </div>

            <div className="slots" role="group" aria-label="Available times">
              {TIME_SLOTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`slot${slot === value ? ' is-selected' : ''}`}
                  onClick={() => setSlot(value)}
                  aria-pressed={slot === value}
                >
                  {formatSlot(value)}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="sheet__cta"
              disabled={submitting || !selectedDate || slot === null}
              onClick={submit}
            >
              {submitting
                ? 'Sending…'
                : selectedDate && slot !== null
                  ? `Send request · ${SHORT_DATE.format(selectedDate)} at ${formatSlot(slot)}`
                  : 'Pick a time'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
