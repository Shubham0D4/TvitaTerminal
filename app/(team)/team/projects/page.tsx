import { prisma } from '@/lib/prisma'
import { getServerUser, redirectToLogin } from '@/lib/auth/server'
import Link from 'next/link'
import { FolderKanban, Search, ArrowUpRight } from 'lucide-react'
import AdminViewToggle, { type AdminViewMode } from '@/app/components/admin/AdminViewToggle'
import { currentPhaseName, progressFromMilestones } from '@/lib/process/stages'

export const metadata = {
  title: 'Projects — Tvita Team',
  description: 'Projects you lead or are assigned to.',
}

const FALLBACK_BANNER = '/banner.webp'
const CLOSED = ['COMPLETED', 'CANCELLED'] as const

const STATUS_STYLES: Record<string, { label: string; tone: string }> = {
  PLANNED: { label: 'Planned', tone: 'slate' },
  IN_PROGRESS: { label: 'In progress', tone: 'amber' },
  ON_HOLD: { label: 'On hold', tone: 'orange' },
  CLIENT_REVIEW: { label: 'In review', tone: 'blue' },
  COMPLETED: { label: 'Completed', tone: 'green' },
  CANCELLED: { label: 'Cancelled', tone: 'slate' },
}

type SearchParams = Promise<{ search?: string; status?: string; view?: string }>

function buildHref(params: { search?: string; status?: string }, view: AdminViewMode) {
  const sp = new URLSearchParams()
  if (params.search) sp.set('search', params.search)
  if (params.status && params.status !== 'ALL') sp.set('status', params.status)
  if (view === 'list') sp.set('view', 'list')
  const q = sp.toString()
  return q ? `/team/projects?${q}` : '/team/projects'
}

export default async function TeamProjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getServerUser()
  if (!user) redirectToLogin()

  const params = await searchParams
  const view: AdminViewMode = params.view === 'list' ? 'list' : 'grid'
  const search = params.search?.trim()
  const status = params.status

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { leadId: user.id },
        { members: { some: { profileId: user.id } } },
      ],
      ...(search
        ? {
            AND: [{
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { client: { name: { contains: search, mode: 'insensitive' } } },
              ],
            }],
          }
        : {}),
      ...(status && status !== 'ALL' ? { status: status as never } : {}),
    },
    select: {
      id: true,
      name: true,
      status: true,
      progress: true,
      banner: true,
      endDate: true,
      updatedAt: true,
      leadId: true,
      client: { select: { name: true } },
      lead: { select: { name: true } },
      milestones: {
        orderBy: { sortOrder: 'asc' },
        select: { name: true, status: true, stage: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const filteringClosed = status === 'COMPLETED' || status === 'CANCELLED'
  const active = filteringClosed
    ? []
    : projects.filter((p) => !CLOSED.includes(p.status as (typeof CLOSED)[number]))
  const history = filteringClosed
    ? projects
    : !status || status === 'ALL'
      ? projects.filter((p) => CLOSED.includes(p.status as (typeof CLOSED)[number]))
      : []

  const led = projects.filter((p) => p.leadId === user.id).length

  return (
    <div className="projects">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Projects</h1>
          <p className="page-header__subtitle">
            {projects.length} assigned · {led} you lead · {projects.filter((p) => p.status === 'IN_PROGRESS').length} in progress
          </p>
        </div>
        <div className="page-header__actions">
          <AdminViewToggle
            value={view}
            hrefFor={(v) => buildHref({ search: params.search, status: params.status }, v)}
          />
        </div>
      </div>

      <div className="filter-bar">
        <form className="filter-bar__search" method="GET">
          <Search size={15} className="filter-bar__search-icon" />
          <input
            name="search"
            className="filter-bar__search-input"
            placeholder="Search projects or clients..."
            defaultValue={params.search ?? ''}
          />
          {params.status && <input type="hidden" name="status" value={params.status} />}
          {view === 'list' && <input type="hidden" name="view" value="list" />}
        </form>

        {(['ALL', 'IN_PROGRESS', 'PLANNED', 'ON_HOLD', 'COMPLETED'] as const).map((s) => (
          <Link
            key={s}
            href={buildHref({ search: params.search, status: s === 'ALL' ? undefined : s }, view)}
            className={`filter-chip${(!params.status && s === 'ALL') || params.status === s ? ' filter-chip--active' : ''}`}
          >
            {s === 'ALL' ? 'All' : STATUS_STYLES[s]?.label ?? s.replace('_', ' ')}
          </Link>
        ))}
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state__icon">
              <FolderKanban size={28} />
            </div>
            <div className="empty-state__title">No projects found</div>
            <div className="empty-state__desc">
              {params.search
                ? `No assigned projects matching “${params.search}”.`
                : 'Projects you lead or join will appear here.'}
            </div>
          </div>
        </div>
      ) : view === 'list' ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Client</th>
                  <th>Your role</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Phase</th>
                  <th style={{ textAlign: 'right' }}>Open</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const st = STATUS_STYLES[project.status] ?? { label: project.status, tone: 'slate' }
                  const phase = currentPhaseName(project.milestones, project.status)
                  const progress = progressFromMilestones(project.milestones)
                  const youLead = project.leadId === user.id
                  return (
                    <tr key={project.id}>
                      <td>
                        <Link href={`/team/projects/${project.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {project.name}
                        </Link>
                      </td>
                      <td>{project.client.name}</td>
                      <td>{youLead ? 'Lead' : 'Member'}</td>
                      <td>
                        <span className={`badge badge--${project.status.toLowerCase().replace(/_/g, '-')}`}>
                          {st.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-bar-container" style={{ width: 72 }}>
                            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{progress}%</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{phase ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href={`/team/projects/${project.id}`} className="btn btn--ghost btn--xs">
                          Open <ArrowUpRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="projects__stack">
          {active.length > 0 && (
            <div className="aticket-grid">
              {active.map((project) => {
                const st = STATUS_STYLES[project.status] ?? { label: project.status, tone: 'slate' }
                const banner = project.banner || FALLBACK_BANNER
                const phase = currentPhaseName(project.milestones, project.status)
                const progress = progressFromMilestones(project.milestones)
                const youLead = project.leadId === user.id
                return (
                  <article key={project.id} className={`ticket ticket--${st.tone} aticket`}>
                    <div className="ticket__stub">
                      <span className="ticket__banner" style={{ backgroundImage: `url(${banner})` }} aria-hidden="true" />
                      <div className="ticket__info">
                        <div className="ticket__head">
                          <span className="ticket__thumb" style={{ backgroundImage: `url(${banner})` }} aria-hidden="true" />
                          <span className="ticket__body">
                            <Link href={`/team/projects/${project.id}`} className="ticket__name">
                              {project.name}
                            </Link>
                            {phase && <span className="ticket__phase">{phase}</span>}
                          </span>
                          <span className="ticket__status">{st.label}</span>
                        </div>
                        <div className="aticket__meta">
                          <span>{project.client.name}</span>
                          <span aria-hidden>·</span>
                          <span>{youLead ? 'You lead' : project.lead?.name.split(' ')[0] ?? 'Member'}</span>
                        </div>
                        <div className="ticket__meter">
                          <span className="ticket__bar" aria-hidden="true">
                            <span className="ticket__fill" style={{ width: `${progress}%` }} />
                          </span>
                          <span className="ticket__pct">{progress}%</span>
                        </div>
                        <Link href={`/team/projects/${project.id}`} className="ticket__open">
                          Open workspace
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {history.length > 0 && (
            <section className="phist" aria-label="Closed projects">
              <h2 className="phist__title">Closed</h2>
              <ul className="phist__list">
                {history.map((project) => (
                  <li key={project.id} className="phrow">
                    <Link href={`/team/projects/${project.id}`} className="phrow__link">
                      <span className="phrow__avatar" aria-hidden="true">
                        {project.name.split(' ').slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('')}
                      </span>
                      <span className="phrow__body">
                        <span className="phrow__name">{project.name}</span>
                        <span className="phrow__desc">{project.client.name}</span>
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
