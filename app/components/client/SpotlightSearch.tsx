'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Search, CornerDownLeft } from 'lucide-react'

export type SearchableProject = {
  id: string
  name: string
  status: string
  phase?: string
}

interface SpotlightSearchProps {
  projects: SearchableProject[]
  urlPrefix?: string
}

const MAX_RESULTS = 6

/** Must match the transition duration in globals.css (.spot / .spot__panel). */
const TRANSITION_MS = 380

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'In progress',
  ON_HOLD: 'On hold',
  CLIENT_REVIEW: 'In review',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export default function SpotlightSearch({ projects, urlPrefix = '/client/projects' }: SpotlightSearchProps) {
  // `mounted` keeps the overlay in the DOM while it animates out; `open`
  // drives the transition. Unmounting immediately would skip the exit.
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)

  const openSearch = () => {
    window.clearTimeout(closeTimer.current)
    setMounted(true)
    // Next frame, so the element paints in its closed state first and the
    // transition actually runs.
    requestAnimationFrame(() => setOpen(true))
  }

  const closeSearch = () => {
    setOpen(false)
    closeTimer.current = window.setTimeout(() => {
      setMounted(false)
      setQuery('')
    }, TRANSITION_MS)
  }

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return projects.slice(0, MAX_RESULTS)
    return projects
      .filter(
        (project) =>
          project.name.toLowerCase().includes(term) ||
          project.phase?.toLowerCase().includes(term),
      )
      .slice(0, MAX_RESULTS)
  }, [projects, query])

  // Escape closes; ⌘K / Ctrl+K opens from anywhere on the page.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSearch()
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openSearch()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // Focus the field once the overlay is up, and stop the page scrolling behind it.
  useEffect(() => {
    if (!mounted) return
    inputRef.current?.focus()

    // Hiding overflow removes the scrollbar, which widens the page and makes
    // everything jump sideways. Pad by exactly the width it occupied.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const { overflow, paddingRight } = document.body.style
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
    }
  }, [mounted])

  return (
    <>
      <button type="button" className="hsearch" onClick={openSearch}>
        <Search size={18} className="hsearch__icon" aria-hidden="true" />
        <span className="hsearch__placeholder">Search projects…</span>
        <kbd className="hsearch__kbd">⌘K</kbd>
      </button>

      {mounted &&
        createPortal(
          <div
            className={`spot${open ? ' is-open' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Search projects"
            onMouseDown={(event) => {
              // Only a click on the backdrop itself closes it.
              if (event.target === event.currentTarget) closeSearch()
            }}
          >
          <div className="spot__panel">
            <div className="spot__field">
              <Search size={20} className="spot__icon" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                className="spot__input"
                placeholder="Search projects…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search projects"
              />
              <kbd className="spot__kbd">esc</kbd>
            </div>

            <div className="spot__results">
              {results.length === 0 ? (
                <p className="spot__empty">No projects match “{query.trim()}”.</p>
              ) : (
                <ul className="spot__list">
                  {results.map((project) => (
                    <li key={project.id}>
                      <Link
                        href={`${urlPrefix}/${project.id}`}
                        className="spot__item"
                        onClick={closeSearch}
                      >
                        <span className="spot__item-main">
                          <span className="spot__item-name">{project.name}</span>
                          {project.phase && (
                            <span className="spot__item-phase">{project.phase}</span>
                          )}
                        </span>
                        <span className="spot__item-status">
                          {STATUS_LABELS[project.status] ?? project.status}
                        </span>
                        <CornerDownLeft size={15} className="spot__item-enter" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          </div>,
          document.body,
        )}
    </>
  )
}
