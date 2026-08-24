'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Clock, Tag } from 'lucide-react'
import toast from 'react-hot-toast'

interface QuoteRequestModalProps {
  open: boolean
  onClose: () => void
}

/** Matches the transition duration in globals.css. */
const TRANSITION_MS = 320
type Step = 'details' | 'pricing'
type Pricing = 'hourly' | 'fixed'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const MONTH_YEAR = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' })
const SHORT_DATE = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
const LONG_DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
const MONEY = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

/** Monday-first offset for the 1st of the month. */
function leadingBlanks(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function isBeforeToday(date: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

export default function QuoteRequestModal({ open, onClose }: QuoteRequestModalProps) {
  // `rendered` keeps the sheet in the DOM while it animates out; `visible`
  // drives the transition.
  const [rendered, setRendered] = useState(open)
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<Step>('details')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState<Date | null>(null)
  const [pricing, setPricing] = useState<Pricing>('fixed')
  const [budget, setBudget] = useState('')
  const [hours, setHours] = useState('')
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
      setDeadline(null)
      setPricing('fixed')
      setBudget('')
      setHours('')
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

  const amount = Number(budget.replace(/[^\d]/g, '')) || 0
  const hourCount = Number(hours.replace(/[^\d]/g, '')) || 0
  const detailsReady = title.trim().length > 0 && description.trim().length > 0
  const pricingReady = pricing === 'hourly' || amount > 0

  const submit = async () => {
    if (!detailsReady || !pricingReady) return
    setSubmitting(true)
    try {
      // The quote record has no deadline or pricing-mode column, so both ride
      // along in the opening message the agency reads.
      const notes = [
        pricing === 'hourly'
          ? `Pricing: pay by hours${hourCount > 0 ? ` (~${hourCount} hrs estimated)` : ''}.`
          : `Pricing: fixed budget of ${MONEY.format(amount)}.`,
        deadline ? `Preferred deadline: ${LONG_DATE.format(deadline)}.` : null,
      ].filter(Boolean)

      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          budget: pricing === 'hourly' ? 0 : amount,
          currency: 'INR',
          message: notes.join(' '),
        }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) throw new Error(data?.error ?? 'Request failed')

      toast.success('Quote request sent')
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
      aria-label="Request a quote"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="sheet__panel">
        {step === 'details' ? (
          <>
            <div className="sheet__head">
              <h2 className="sheet__title">Request a quote</h2>
              <p className="sheet__lede">Share your idea — we’ll come back with an estimate.</p>
            </div>

            <div className="sheet__cols">
              {/* Left: what the work is */}
              <div className="sheet__col">
                <div className="sheet__field">
                  <label className="sheet__label" htmlFor="quote-title">Title</label>
                  <input
                    id="quote-title"
                    className="sheet__input"
                    placeholder="e.g. Fleet manager mobile app"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    autoFocus
                  />
                </div>

                <div className="sheet__field">
                  <label className="sheet__label" htmlFor="quote-desc">Description</label>
                  <textarea
                    id="quote-desc"
                    className="sheet__input sheet__input--area"
                    placeholder="Scope, features — anything that shapes the estimate."
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={6}
                  />
                </div>
              </div>

              {/* Right: when it is needed by */}
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
                    const selected = deadline?.toDateString() === date.toDateString()
                    const isToday = date.toDateString() === today.toDateString()
                    return (
                      <button
                        key={date.toISOString()}
                        type="button"
                        className={`cal__day${selected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}`}
                        disabled={isBeforeToday(date)}
                        // Tapping the chosen day again clears it — the deadline is optional.
                        onClick={() => setDeadline(selected ? null : date)}
                      >
                        {index + 1}
                      </button>
                    )
                  })}
                </div>

                <p className="cal__note">
                  {deadline ? `Deadline · ${SHORT_DATE.format(deadline)}` : 'Deadline optional'}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="sheet__cta"
              disabled={!detailsReady}
              onClick={() => setStep('pricing')}
            >
              {detailsReady ? 'Continue' : 'Add a title and description'}
            </button>
          </>
        ) : (
          <div className="sheet__step">
            <div className="sheet__head">
              <h2 className="sheet__title">Pricing</h2>
              <p className="sheet__lede">
                {deadline ? `Needed by ${SHORT_DATE.format(deadline)}.` : 'How would you like this billed?'}
              </p>
            </div>

            <div className="pricing" role="radiogroup" aria-label="Pricing model">
              {/* Divs, not buttons — a button may not contain a form field. */}
              <div
                role="radio"
                tabIndex={0}
                aria-checked={pricing === 'hourly'}
                className={`pricing__opt${pricing === 'hourly' ? ' is-selected' : ''}`}
                onClick={() => setPricing('hourly')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setPricing('hourly')
                  }
                }}
              >
                <span className="pricing__check" aria-hidden="true" />
                <span className="pricing__icon"><Clock size={20} /></span>
                <span className="pricing__name">Pay by hours</span>
                <span className="pricing__hint">We bill the time actually worked.</span>

                <div className="pricing__entry">
                  <input
                    className="pricing__field"
                    inputMode="numeric"
                    placeholder="0"
                    value={hours}
                    // Focusing the field is another way of choosing the card.
                    onFocus={() => setPricing('hourly')}
                    onChange={(event) => setHours(event.target.value.replace(/[^\d]/g, ''))}
                    aria-label="Estimated hours"
                  />
                  <span className="pricing__unit">hrs</span>
                </div>
              </div>

              <div
                role="radio"
                tabIndex={0}
                aria-checked={pricing === 'fixed'}
                className={`pricing__opt${pricing === 'fixed' ? ' is-selected' : ''}`}
                onClick={() => setPricing('fixed')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setPricing('fixed')
                  }
                }}
              >
                <span className="pricing__check" aria-hidden="true" />
                <span className="pricing__icon"><Tag size={20} /></span>
                <span className="pricing__name">Fixed budget</span>
                <span className="pricing__hint">We scope the work to your number.</span>

                <div className="pricing__entry">
                  <span className="pricing__unit">₹</span>
                  <input
                    className="pricing__field"
                    inputMode="numeric"
                    placeholder="0"
                    value={budget}
                    onFocus={() => setPricing('fixed')}
                    onChange={(event) => setBudget(event.target.value.replace(/[^\d]/g, ''))}
                    aria-label="Budget in rupees"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              className="sheet__cta"
              disabled={submitting || !pricingReady}
              onClick={submit}
            >
              {submitting
                ? 'Sending…'
                : pricing === 'hourly'
                  ? 'Request quote · pay by hours'
                  : amount > 0
                    ? `Request quote · ${MONEY.format(amount)}`
                    : 'Enter a budget'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
