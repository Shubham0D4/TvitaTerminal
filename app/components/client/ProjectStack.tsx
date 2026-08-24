'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

/** Tint per project status, keyed to the pill and the progress bar. */
const STATUS_STYLES: Record<string, { label: string; tone: string }> = {
  PLANNED: { label: 'Planned', tone: 'slate' },
  IN_PROGRESS: { label: 'In progress', tone: 'amber' },
  ON_HOLD: { label: 'On hold', tone: 'orange' },
  CLIENT_REVIEW: { label: 'In review', tone: 'blue' },
  COMPLETED: { label: 'Completed', tone: 'green' },
  CANCELLED: { label: 'Cancelled', tone: 'slate' },
}

/** Cards visible behind the top one while collapsed. */
const MAX_PEEKING = 2

export type StackProject = {
  id: string
  name: string
  banner: string | null
  status: string
  progress: number
  phase?: string
}

interface ProjectStackProps {
  projects: StackProject[]
  /** Used when a project has no banner of its own. */
  fallbackImage: string
}

export default function ProjectStack({ projects, fallbackImage }: ProjectStackProps) {
  const [expanded, setExpanded] = useState(false)
  const stackRef = useRef<HTMLDivElement>(null)

  // Clicking anywhere outside — or pressing Escape — returns it to the deck.
  useEffect(() => {
    if (!expanded) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!stackRef.current?.contains(event.target as Node)) setExpanded(false)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [expanded])

  if (projects.length === 0) return null

  const isDeck = !expanded && projects.length > 1

  /** Clicking the cards themselves opens the deck, or closes it again. */
  const handleClick = () => {
    if (projects.length < 2) return
    setExpanded((open) => !open)
  }

  return (
    <div
      ref={stackRef}
      className={`pstack${isDeck ? ' pstack--deck' : ' pstack--open'}`}
      style={{ '--pstack-count': projects.length } as React.CSSProperties}
      onClick={handleClick}
      role={projects.length > 1 ? 'button' : undefined}
      tabIndex={projects.length > 1 ? 0 : undefined}
      aria-expanded={projects.length > 1 ? expanded : undefined}
      onKeyDown={(event) => {
        if (projects.length < 2) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          setExpanded((open) => !open)
        }
      }}
    >
      {projects.map((project, index) => {
        const status = STATUS_STYLES[project.status] ?? { label: project.status, tone: 'slate' }
        // Only a couple of cards peek out behind the top one.
        const hiddenInDeck = isDeck && index > MAX_PEEKING

        return (
          <div
            key={project.id}
            className={`pstack__card pstack__card--${status.tone}${hiddenInDeck ? ' is-buried' : ''}`}
            style={
              {
                zIndex: projects.length - index,
                '--pstack-i': index,
              } as React.CSSProperties
            }
            aria-hidden={isDeck && index > 0}
          >
            <span
              className="pstack__thumb"
              style={{ backgroundImage: `url(${project.banner || fallbackImage})` }}
              aria-hidden="true"
            />

            <span className="pstack__body">
              <span className="pstack__head">
                {/* Navigates like the arrow; the rest of the card toggles. */}
                <Link
                  href={`/client/projects/${project.id}`}
                  className="pstack__name"
                  onClick={(event) => event.stopPropagation()}
                  tabIndex={isDeck && index > 0 ? -1 : 0}
                >
                  {project.name}
                </Link>
                <span className="pstack__status">{status.label}</span>
              </span>
              {project.phase && <span className="pstack__phase">{project.phase}</span>}
            </span>

            {/* The only part that navigates; the rest of the card toggles. */}
            <Link
              href={`/client/projects/${project.id}`}
              className="pstack__open"
              onClick={(event) => event.stopPropagation()}
              tabIndex={isDeck && index > 0 ? -1 : 0}
              aria-label={`Open ${project.name}`}
            >
              <ChevronRight size={20} className="pstack__chevron" />
            </Link>

            <span className="pstack__track" aria-hidden="true">
              <span className="pstack__fill" style={{ width: `${project.progress}%` }} />
            </span>
          </div>
        )
      })}
    </div>
  )
}
