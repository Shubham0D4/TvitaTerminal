'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { AlertCircle, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

export type TicketProject = { id: string; name: string }

interface TicketRequestModalProps {
  open: boolean
  onClose: () => void
  projects: TicketProject[]
}

/** Matches the transition duration in globals.css. */
const TRANSITION_MS = 320

export default function TicketRequestModal({ open, onClose, projects }: TicketRequestModalProps) {
  const router = useRouter()

  // `rendered` keeps the sheet in the DOM while it animates out; `visible`
  // drives the transition.
  const [rendered, setRendered] = useState(open)
  const [visible, setVisible] = useState(false)

  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      // Reset only once it has animated out, so nothing is seen changing.
      setTitle('')
      setDescription('')
      setProjectId(projects[0]?.id ?? '')
    }, TRANSITION_MS)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(closeTimer.current)
    }
  }, [open, projects])

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

  const ready = Boolean(projectId) && title.trim().length > 0

  const submit = async () => {
    if (!ready) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority: 'MEDIUM',
        }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) throw new Error(data?.error ?? 'Request failed')

      toast.success('Ticket created')
      onClose()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the ticket.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!rendered) return null

  return createPortal(
    <div
      className={`sheet${visible ? ' is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Report an issue"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="sheet__panel sheet__panel--sm">
        <div className="issue__head">
          <span className="issue__mark"><AlertCircle size={20} /></span>
          <div className="sheet__head">
            <h2 className="sheet__title">Report an issue</h2>
            <p className="sheet__lede">We’ll open a ticket for the team.</p>
          </div>
        </div>

        <div className="issue__form">
          <div className="sheet__field">
            <label className="sheet__label" htmlFor="ticket-project">Project</label>
            <div className="issue__select">
              <select
                id="ticket-project"
                className="sheet__input"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
              >
                {projects.length === 0 && <option value="">No projects available</option>}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <ChevronDown size={18} className="issue__caret" aria-hidden="true" />
            </div>
          </div>

          <div className="sheet__field">
            <label className="sheet__label" htmlFor="ticket-title">Issue title</label>
            <input
              id="ticket-title"
              className="sheet__input"
              placeholder="What went wrong?"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
            />
          </div>

          <div className="sheet__field">
            <label className="sheet__label" htmlFor="ticket-desc">Description</label>
            <textarea
              id="ticket-desc"
              className="sheet__input sheet__input--area"
              placeholder="Any detail that helps us reproduce it. (optional)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
            />
          </div>
        </div>

        <div className="issue__actions">
          <button type="button" className="issue__cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="sheet__cta issue__submit"
            disabled={submitting || !ready}
            onClick={submit}
          >
            {submitting ? 'Creating…' : 'Create ticket'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
