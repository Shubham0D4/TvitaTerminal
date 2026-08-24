'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Paperclip, ArrowUp, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

export type NoteAttachment = { name: string; url: string }

export type ClientNote = {
  id: string
  content: string
  author: string
  isMine: boolean
  createdAt: string
  attachments: NoteAttachment[]
}

export type NotesProject = {
  id: string
  name: string
  banner: string | null
  status: string
  notes: ClientNote[]
}

interface NotesWorkspaceProps {
  projects: NotesProject[]
  currentUserId: string
}

/** Scroll distance that folds the rail away, and the shorter one that
 *  brings it back — separate values so the two states can't chatter. */
const COLLAPSE_AT = 48
const RESTORE_AT = 12
/** Height the thread gains when the rail folds (keep in step with globals.css). */
const IMMERSED_GAIN = 68

const DAY = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })
const TIME = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' })
const DAY_FULL = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

/** Human label for a date separator. */
function dayLabel(date: Date) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return DAY_FULL.format(date)
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export default function NotesWorkspace({ projects }: NotesWorkspaceProps) {
  const router = useRouter()
  // Open on the first project that actually has notes, so the thread isn't
  // empty on arrival just because the newest project has none.
  const [activeId, setActiveId] = useState(
    projects.find((project) => project.notes.length > 0)?.id ?? projects[0]?.id ?? null,
  )
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [headerHidden, setHeaderHidden] = useState(false)

  const threadRef = useRef<HTMLDivElement>(null)
  const active = projects.find((project) => project.id === activeId) ?? null

  // Header and rail slide away once the thread scrolls, and return at the top.
  useEffect(() => {
    const thread = threadRef.current
    if (!thread) return

    let frame = 0
    const measure = () => {
      frame = 0
      const room = thread.scrollHeight - thread.clientHeight
      setHeaderHidden((hidden) => {
        // Folding hands the thread extra height, which eats into how far it
        // can scroll. If that would drop it back under the restore threshold
        // the two states flip against each other, so don't start at all.
        if (!hidden) {
          return room > IMMERSED_GAIN + COLLAPSE_AT && thread.scrollTop > COLLAPSE_AT
        }
        return thread.scrollTop > RESTORE_AT
      })
    }

    // Coalesce the burst of scroll events fired while the panes animate.
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(measure)
    }

    thread.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      thread.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  // Jump to the newest note whenever the thread changes.
  useEffect(() => {
    const thread = threadRef.current
    if (thread) thread.scrollTop = thread.scrollHeight
  }, [activeId, projects])

  const send = async () => {
    const content = draft.trim()
    if (!content || !active) return

    setSending(true)
    try {
      const res = await fetch(`/api/projects/${active.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: content.slice(0, 60),
          content,
          type: 'EXTERNAL_CLIENT',
        }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) throw new Error(data?.error ?? 'Request failed')

      setDraft('')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send the note.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="notes">
      <header className={`notes__header${headerHidden ? ' is-hidden' : ''}`}>
        <h1 className="notes__title">Notes</h1>
      </header>

      <div className={`notes__panes${headerHidden ? ' is-immersed' : ''}`}>
        {/* Left: one row per project */}
        <aside className="notes__list" aria-label="Projects" aria-hidden={headerHidden}>
          {projects.length === 0 ? (
            <p className="notes__empty">No projects to show notes for yet.</p>
          ) : (
            projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={`nrow${project.id === activeId ? ' is-active' : ''}`}
                onClick={() => setActiveId(project.id)}
                aria-current={project.id === activeId}
              >
                <span
                  className="nrow__avatar"
                  style={
                    project.banner ? { backgroundImage: `url(${project.banner})` } : undefined
                  }
                >
                  {!project.banner && initials(project.name)}
                </span>

                <span className="nrow__body">
                  <span className="nrow__top">
                    <span className="nrow__name">{project.name}</span>
                    {project.notes.length > 0 && (
                      <span className="nrow__when">
                        {DAY.format(new Date(project.notes[project.notes.length - 1].createdAt))}
                      </span>
                    )}
                  </span>
                  <span className="nrow__preview">
                    {project.notes.length === 0
                      ? 'No notes yet'
                      : project.notes[project.notes.length - 1].content}
                  </span>
                </span>

                <span className="nrow__status">{project.status}</span>
                <ChevronRight size={18} className="nrow__chevron" />
              </button>
            ))
          )}
        </aside>

        {/* Right: the selected project's thread */}
        <section className="notes__thread" aria-label="Notes thread">
          {active ? (
            <>
              <div className="thread__head">
                <span className="thread__name">{active.name}</span>
                <span className="thread__meta">
                  {active.notes.length} {active.notes.length === 1 ? 'note' : 'notes'}
                </span>
              </div>

              <div className="thread__scroll" ref={threadRef}>
                {active.notes.length === 0 ? (
                  <p className="notes__empty">No notes on this project yet.</p>
                ) : (
                  active.notes.map((note, index) => {
                    const date = new Date(note.createdAt)
                    const previous = active.notes[index - 1]
                    // A separator whenever the day changes.
                    const newDay =
                      !previous ||
                      new Date(previous.createdAt).toDateString() !== date.toDateString()
                    // Only label the author when the sender changes.
                    const newSender = !previous || previous.isMine !== note.isMine

                    return (
                      <div key={note.id} className="thread__item">
                        {newDay && <div className="thread__day">{dayLabel(date)}</div>}

                        <article className={`bubble${note.isMine ? ' bubble--mine' : ''}`}>
                          {!note.isMine && newSender && (
                            <span className="bubble__author">{note.author}</span>
                          )}

                          {note.attachments.map((file) => (
                            <a
                              key={file.name}
                              href={file.url}
                              className="bubble__file"
                              target="_blank"
                              rel="noreferrer"
                            >
                              <FileText size={15} />
                              {file.name}
                            </a>
                          ))}

                          {note.content && <p className="bubble__text">{note.content}</p>}
                          <time className="bubble__time" dateTime={note.createdAt}>
                            {TIME.format(date)}
                          </time>
                        </article>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="composer">
                <button type="button" className="composer__attach" aria-label="Attach a file">
                  <Paperclip size={17} />
                </button>

                <input
                  className="composer__input"
                  placeholder="Write a note…"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      send()
                    }
                  }}
                  aria-label="Write a note"
                />

                <button
                  type="button"
                  className="composer__send"
                  onClick={send}
                  disabled={sending || !draft.trim()}
                  aria-label="Send note"
                >
                  <ArrowUp size={18} strokeWidth={2.5} />
                </button>
              </div>
            </>
          ) : (
            <p className="notes__empty">Select a project to read its notes.</p>
          )}
        </section>
      </div>
    </div>
  )
}
