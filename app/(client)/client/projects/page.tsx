import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FolderKanban, Search, SlidersHorizontal, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'

import { prisma } from '@/lib/prisma'
import { getServerUser, getClientSubTeamContext, redirectToLogin } from '@/lib/auth/server'
import ProjectCarousel from '@/app/components/client/ProjectCarousel'

export const metadata = {
  title: 'Projects — Tvita Client Portal',
  description: 'Track ongoing project deliverables, timelines, and milestones.',
}

/** Used when a project has no banner of its own. */
const FALLBACK_BANNER = '/menu%20img.webp'

/** Finished work lives under History rather than in the active deck. */
const CLOSED = ['COMPLETED', 'CANCELLED']

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

interface ClientProjectsPageProps {
  searchParams: Promise<{ search?: string; status?: string }>
}

const STATUS_STYLES: Record<string, { label: string; tone: string }> = {
  PLANNED: { label: 'Planned', tone: 'slate' },
  IN_PROGRESS: { label: 'In progress', tone: 'amber' },
  ON_HOLD: { label: 'On hold', tone: 'orange' },
  CLIENT_REVIEW: { label: 'In review', tone: 'blue' },
  COMPLETED: { label: 'Completed', tone: 'green' },
  CANCELLED: { label: 'Cancelled', tone: 'slate' },
}

export default async function ClientProjectsPage({ searchParams }: ClientProjectsPageProps) {
  const { search, status } = await searchParams
  const query = search?.trim() ?? ''
  const statusFilter = status?.trim()?.toUpperCase() ?? 'ALL'

  const user = await getServerUser()
  if (!user) redirectToLogin()

  // Sub-team users resolve their client via the sub-team relation.
  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx && !subTeamCtx.policy.projects) redirect('/client/home')

  const client = await prisma.client.findFirst({
    where: subTeamCtx
      ? { id: subTeamCtx.clientId }
      : { OR: [{ profileId: user.id }, { email: user.email }] },
  })

  if (!client) {
    return (
      <div className="card">
        <div className="empty-state">
          <FolderKanban size={28} />
          <div className="empty-state__title">No Client Account Linked</div>
          <div className="empty-state__desc">
            Your user account is not linked to a client organization yet. Please contact agency support.
          </div>
        </div>
      </div>
    )
  }

  // 1. Query status counts for live chips
  const statusCountsGroup = await prisma.project.groupBy({
    by: ['status'],
    where: {
      clientId: client.id,
      ...(subTeamCtx && subTeamCtx.allowedProjectIds.length > 0
        ? { id: { in: subTeamCtx.allowedProjectIds } }
        : {}),
    },
    _count: {
      id: true,
    },
  })

  const counts: Record<string, number> = {
    ALL: 0,
    ACTIVE: 0,
    HISTORY: 0,
    PLANNED: 0,
    IN_PROGRESS: 0,
    ON_HOLD: 0,
    CLIENT_REVIEW: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  }

  statusCountsGroup.forEach((group) => {
    const s = group.status
    const count = group._count.id
    counts[s] = count
    counts.ALL += count
    if (CLOSED.includes(s)) {
      counts.HISTORY += count
      if (s === 'COMPLETED') counts.COMPLETED += count
      if (s === 'CANCELLED') counts.CANCELLED += count
    } else {
      counts.ACTIVE += count
      if (s === 'PLANNED') counts.PLANNED += count
      if (s === 'IN_PROGRESS') counts.IN_PROGRESS += count
      if (s === 'ON_HOLD') counts.ON_HOLD += count
      if (s === 'CLIENT_REVIEW') counts.CLIENT_REVIEW += count
    }
  })

  // 2. Fetch projects based on search & status filter
  const projects = await prisma.project.findMany({
    where: {
      clientId: client.id,
      ...(subTeamCtx && subTeamCtx.allowedProjectIds.length > 0
        ? { id: { in: subTeamCtx.allowedProjectIds } }
        : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { description: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(statusFilter === 'ALL'
        ? {}
        : statusFilter === 'ACTIVE'
        ? { status: { notIn: CLOSED } }
        : statusFilter === 'HISTORY'
        ? { status: { in: CLOSED } }
        : { status: statusFilter as any }),
    },
    select: {
      id: true,
      name: true,
      description: true,
      banner: true,
      status: true,
      progress: true,
      endDate: true,
      updatedAt: true,
      milestones: {
        where: { clientVisible: true },
        orderBy: { sortOrder: 'asc' },
        select: { name: true, status: true },
      },
      updates: {
        where: { clientVisible: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, title: true, content: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Filter projects depending on selected chips
  const active = projects.filter((project) => !CLOSED.includes(project.status))
  const history = projects.filter((project) => CLOSED.includes(project.status))

  const showGridProjects = statusFilter === 'ALL' ? active : statusFilter === 'ACTIVE' ? active : projects
  const showHistorySection = statusFilter === 'ALL' && history.length > 0
  const isEmpty = showGridProjects.length === 0 && !showHistorySection

  const makeFilterLink = (s: string) => {
    const params = new URLSearchParams()
    if (query) params.set('search', query)
    if (s !== 'ALL') params.set('status', s)
    return `/client/projects?${params.toString()}`
  }

  const filterOptions = [
    { label: 'All', value: 'ALL', count: counts.ALL },
    { label: 'Active', value: 'ACTIVE', count: counts.ACTIVE },
    { label: 'Planned', value: 'PLANNED', count: counts.PLANNED },
    { label: 'In Progress', value: 'IN_PROGRESS', count: counts.IN_PROGRESS },
    { label: 'In Review', value: 'CLIENT_REVIEW', count: counts.CLIENT_REVIEW },
    { label: 'Completed', value: 'COMPLETED', count: counts.COMPLETED },
    { label: 'On Hold', value: 'ON_HOLD', count: counts.ON_HOLD },
  ]

  return (
    <div className="projects">
      <style>{`
        .client-projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: var(--space-6);
        }
        .filter-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .filter-chip:hover {
          border-color: var(--border-strong);
          color: var(--text-primary);
        }
        .filter-chip--active {
          background: var(--accent-primary-muted);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }
        .filter-chip__count {
          font-size: 10px;
          opacity: 0.7;
          background: rgba(0, 0, 0, 0.05);
          padding: 1px 5px;
          border-radius: 10px;
        }
        .filter-chip--active .filter-chip__count {
          background: rgba(35, 64, 184, 0.12);
        }
        .project-search-input:focus {
          border-color: var(--accent-primary) !important;
          outline: none;
          box-shadow: 0 0 0 2px rgba(35, 64, 184, 0.15);
        }
      `}</style>

      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Projects</h1>
          <p className="page-header__subtitle">
            Deliverables and milestone status for {client.name}.
          </p>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col gap-4 mb-6" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex gap-4 items-center flex-wrap">
          {/* Search bar */}
          <form className="flex-1 max-w-md relative" method="GET">
            <input
              name="search"
              className="form-input project-search-input"
              style={{
                paddingLeft: '38px',
                height: '40px',
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                width: '100%',
              }}
              placeholder="Search project name or scope..."
              defaultValue={query}
            />
            {statusFilter !== 'ALL' && <input type="hidden" name="status" value={statusFilter} />}
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none' }}>
              <Search size={15} />
            </span>
          </form>

          {/* Filter Status Icon */}
          <div className="flex items-center gap-1 text-xs text-muted" style={{ fontWeight: 600 }}>
            <SlidersHorizontal size={14} />
            <span>Filter Status</span>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {filterOptions.map((opt) => {
            const isActive = statusFilter === opt.value
            return (
              <Link
                key={opt.value}
                href={makeFilterLink(opt.value)}
                className={`filter-chip${isActive ? ' filter-chip--active' : ''}`}
              >
                {opt.label}
                <span className="filter-chip__count">{opt.count}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Project Display Grid ── */}
      {isEmpty ? (
        <div className="card">
          <div className="empty-state">
            <FolderKanban size={28} />
            <div className="empty-state__title">
              {query ? 'No matching projects found' : 'No projects found'}
            </div>
            <div className="empty-state__desc">
              {query
                ? 'Try matching other words or keywords.'
                : 'No projects match the selected status filter.'}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {showGridProjects.length > 0 && (
            <div className="client-projects-grid">
              {showGridProjects.map((project) => {
                const statusStyle = STATUS_STYLES[project.status] ?? {
                  label: project.status,
                  tone: 'slate',
                }
                const activeMilestone = project.milestones.find((m) => m.status !== 'COMPLETED')?.name

                return (
                  <div
                    key={project.id}
                    className="card hover-lift"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      padding: 0,
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                    }}
                  >
                    {/* Project Banner with status overlay */}
                    <div
                      style={{
                        height: 130,
                        backgroundImage: `url(${project.banner || FALLBACK_BANNER})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative',
                      }}
                    >
                      <span
                        className={`badge badge--${statusStyle.tone}`}
                        style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          border: '1px solid rgba(0,0,0,0.05)',
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {statusStyle.label}
                      </span>
                    </div>

                    {/* Project Card Body */}
                    <div
                      style={{
                        padding: 'var(--space-4)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-4)',
                        flex: 1,
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            fontSize: 'var(--text-md)',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            margin: '0 0 4px 0',
                          }}
                        >
                          <Link
                            href={`/client/projects/${project.id}`}
                            style={{ color: 'inherit', textDecoration: 'none' }}
                          >
                            {project.name}
                          </Link>
                        </h3>
                        {activeMilestone && (
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                            Current Phase:{' '}
                            <strong style={{ color: 'var(--accent-primary)' }}>{activeMilestone}</strong>
                          </p>
                        )}
                      </div>

                      {project.description && (
                        <p
                          style={{
                            fontSize: 'var(--text-sm)',
                            color: 'var(--text-secondary)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            margin: 0,
                            lineHeight: 1.4,
                          }}
                        >
                          {project.description}
                        </p>
                      )}

                      {/* Progress bar section */}
                      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                        <div
                          className="flex justify-between items-center mb-1 text-xs"
                          style={{ fontWeight: 600, marginBottom: 4 }}
                        >
                          <span style={{ color: 'var(--text-muted)' }}>Progress</span>
                          <span style={{ color: 'var(--text-primary)' }}>{project.progress}%</span>
                        </div>
                        <div
                          className="progress-bar-container"
                          style={{
                            height: 6,
                            background: 'rgba(0,0,0,0.04)',
                            borderRadius: 3,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${project.progress}%`,
                              height: '100%',
                              background:
                                statusStyle.tone === 'slate'
                                  ? '#64748b'
                                  : statusStyle.tone === 'amber'
                                  ? '#2340b8'
                                  : statusStyle.tone === 'orange'
                                  ? '#8a6a0b'
                                  : statusStyle.tone === 'blue'
                                  ? '#2340b8'
                                  : '#1e6b50',
                            }}
                          />
                        </div>
                      </div>

                      {/* Latest update snippet */}
                      {project.updates && project.updates.length > 0 && (
                        <div
                          style={{
                            background: 'var(--bg-base)',
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <p
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: 'var(--text-muted)',
                              margin: '0 0 4px 0',
                              letterSpacing: '0.05em',
                            }}
                          >
                            Latest Update
                          </p>
                          <p
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              margin: '0 0 2px 0',
                            }}
                          >
                            {project.updates[0].title}
                          </p>
                          <p
                            style={{
                              fontSize: 11,
                              color: 'var(--text-secondary)',
                              margin: 0,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {project.updates[0].content}
                          </p>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <Link
                          href={`/client/projects/${project.id}`}
                          className="btn btn--primary btn--sm"
                          style={{
                            flex: 1,
                            textAlign: 'center',
                            display: 'block',
                            textDecoration: 'none',
                          }}
                        >
                          Open Project
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── History Section (Only shown when filter is ALL) ── */}
          {showHistorySection && (
            <section className="phist" aria-label="Project history">
              <h2 className="phist__title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                History
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: 'rgba(0,0,0,0.05)',
                  }}
                >
                  {history.length}
                </span>
              </h2>

              <ul className="phist__list">
                {history.map((project) => (
                  <li key={project.id} className="phrow">
                    <Link href={`/client/projects/${project.id}`} className="phrow__link">
                      <span className="phrow__avatar" aria-hidden="true">
                        {initials(project.name)}
                      </span>

                      <span className="phrow__body">
                        <span className="phrow__name">
                          {project.name}
                          {project.status === 'COMPLETED' && (
                            <Image
                              src="/check.png"
                              alt="Completed"
                              width={17}
                              height={17}
                              className="phrow__check"
                            />
                          )}
                        </span>
                        {project.description && (
                          <span className="phrow__desc">{project.description}</span>
                        )}
                      </span>

                      <span className="phrow__year">
                        {(project.endDate ?? project.updatedAt).getFullYear()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

