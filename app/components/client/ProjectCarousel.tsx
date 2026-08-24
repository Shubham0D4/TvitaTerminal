'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import ProcessTree, { type ProcessUpdate } from './ProcessTree'

export type ProjectUpdate = ProcessUpdate & { title: string }

export type CarouselProject = {
  id: string
  name: string
  banner: string | null
  status: string
  progress: number
  phase?: string
  updates: ProjectUpdate[]
}

interface ProjectCarouselProps {
  projects: CarouselProject[]
  /** Used when a project has no banner of its own. */
  fallbackImage: string
}

/** Tint per status, keyed to the pill and the progress bar. Matches ProjectStack. */
const STATUS_STYLES: Record<string, { label: string; tone: string }> = {
  PLANNED: { label: 'Planned', tone: 'slate' },
  IN_PROGRESS: { label: 'In progress', tone: 'amber' },
  ON_HOLD: { label: 'On hold', tone: 'orange' },
  CLIENT_REVIEW: { label: 'In review', tone: 'blue' },
  COMPLETED: { label: 'Completed', tone: 'green' },
  CANCELLED: { label: 'Cancelled', tone: 'slate' },
}

export default function ProjectCarousel({ projects, fallbackImage }: ProjectCarouselProps) {
  const [index, setIndex] = useState(0)

  if (projects.length === 0) return null

  const many = projects.length > 1
  // Wraps at both ends, so the arrows never dead-end.
  const go = (step: number) =>
    setIndex((current) => (current + step + projects.length) % projects.length)

  return (
    <section className="pwork" aria-roledescription="carousel" aria-label="Projects">
      {many && (
        <div className="pwork__nav">
          <button
            type="button"
            className="pcar__arrow"
            onClick={() => go(-1)}
            aria-label="Previous project"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            className="pcar__arrow"
            onClick={() => go(1)}
            aria-label="Next project"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      )}

      <div className="pcar__view">
        <div
          className="pcar__track"
          // The gap has to be paid for per slide, or the track drifts.
          style={{ transform: `translateX(calc(${index} * (100% + var(--pcar-gap)) * -1))` }}
        >
          {projects.map((project, slide) => {
            const status = STATUS_STYLES[project.status] ?? {
              label: project.status,
              tone: 'slate',
            }
            const live = slide === index

            return (
              <div
                key={project.id}
                className="pcar__slide"
                role="group"
                aria-roledescription="slide"
                aria-label={`${slide + 1} of ${projects.length}`}
                aria-hidden={!live}
              >
                <article className={`ticket ticket--${status.tone}`}>
                  {/* Stub: which project this ticket is for */}
                  <div className="ticket__stub">
                    <span
                      className="ticket__banner"
                      style={{ backgroundImage: `url(${project.banner || fallbackImage})` }}
                      aria-hidden="true"
                    />

                    <div className="ticket__info">
                      <div className="ticket__head">
                        <span
                          className="ticket__thumb"
                          style={{ backgroundImage: `url(${project.banner || fallbackImage})` }}
                          aria-hidden="true"
                        />

                        <span className="ticket__body">
                          <Link
                            href={`/client/projects/${project.id}`}
                            className="ticket__name"
                            // Off-screen slides stay out of the tab order.
                            tabIndex={live ? 0 : -1}
                          >
                            {project.name}
                          </Link>
                          {project.phase && (
                            <span className="ticket__phase">{project.phase}</span>
                          )}
                        </span>

                        <span className="ticket__status">{status.label}</span>
                      </div>

                      <div className="ticket__meter">
                        <span className="ticket__bar" aria-hidden="true">
                          <span
                            className="ticket__fill"
                            style={{ width: `${project.progress}%` }}
                          />
                        </span>
                        <span className="ticket__pct">{project.progress}%</span>
                      </div>

                      <Link
                        href={`/client/projects/${project.id}`}
                        className="ticket__open"
                        tabIndex={live ? 0 : -1}
                      >
                        Open project
                      </Link>
                    </div>
                  </div>

                  {/* The tear line, notched top and bottom like a real stub */}
                  <span className="ticket__perf" aria-hidden="true" />

                  {/* Main: how far the work has got */}
                  <div className="ticket__main">
                    <ProcessTree
                      status={project.status}
                      progress={project.progress}
                      updates={project.updates}
                    />
                  </div>
                </article>
              </div>
            )
          })}
        </div>
      </div>

      <span className="pcar__live" aria-live="polite">
        {projects[index].name}
      </span>
    </section>
  )
}
