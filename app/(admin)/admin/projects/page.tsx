import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import {
  FolderKanban,
  Plus,
  Building2,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react'

export const metadata = {
  title: 'Projects — Tvita Admin',
  description: 'Overview of all active, planned, and completed client projects.',
}

async function getProjects(search?: string, status?: string) {
  return prisma.project.findMany({
    where: {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { client: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
      ...(status && status !== 'ALL' && { status: status as any }),
    },
    include: {
      client: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { tasks: true, invoices: true, members: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

type SearchParams = Promise<{ search?: string; status?: string }>

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const projects = await getProjects(params.search, params.status)

  const inProgressCount = projects.filter((p) => p.status === 'IN_PROGRESS').length
  const completedCount = projects.filter((p) => p.status === 'COMPLETED').length

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Projects</h1>
          <p className="page-header__subtitle">
            {projects.length} total · {inProgressCount} in progress · {completedCount} completed
          </p>
        </div>
        <div className="page-header__actions">
          <Link href="/admin/projects/new" className="btn btn--primary">
            <Plus size={16} />
            New Project
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <form className="filter-bar__search" method="GET">
          <FolderKanban size={15} className="filter-bar__search-icon" />
          <input
            name="search"
            className="filter-bar__search-input"
            placeholder="Search projects or clients..."
            defaultValue={params.search ?? ''}
          />
          {params.status && <input type="hidden" name="status" value={params.status} />}
        </form>

        {(['ALL', 'IN_PROGRESS', 'PLANNED', 'ON_HOLD', 'COMPLETED'] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/projects?${params.search ? `search=${params.search}&` : ''}status=${s}`}
            className={`filter-chip${(!params.status && s === 'ALL') || params.status === s ? ' filter-chip--active' : ''}`}
          >
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
          </Link>
        ))}
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state__icon"><FolderKanban size={28} /></div>
            <div className="empty-state__title">No projects found</div>
            <div className="empty-state__desc">
              {params.search
                ? `No projects matching "${params.search}".`
                : 'Create your first project to start tracking deliverables.'}
            </div>
            <Link href="/admin/projects/new" className="btn btn--primary btn--sm">
              <Plus size={14} />
              Create Project
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="card hover-lift" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="flex items-start justify-between gap-3">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link
                    href={`/admin/projects/${project.id}`}
                    style={{
                      fontSize: 'var(--text-md)',
                      fontWeight: 'var(--font-semibold)',
                      color: 'var(--text-primary)',
                      textDecoration: 'none',
                    }}
                  >
                    {project.name}
                  </Link>
                  <div className="flex items-center gap-2" style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    <Building2 size={12} />
                    <Link href={`/admin/clients/${project.client.id}`} style={{ color: 'var(--text-muted)' }}>
                      {project.client.name}
                    </Link>
                  </div>
                </div>

                <span className={`badge badge--${project.status.toLowerCase().replace('_', '-')}`}>
                  {project.status.replace('_', ' ')}
                </span>
              </div>

              {project.description && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {project.description}
                </p>
              )}

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${project.progress}%` }} />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border-subtle)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                <div className="flex items-center gap-3">
                  {project.lead && (
                    <div className="flex items-center gap-1">
                      <User size={12} />
                      <span>{project.lead.name.split(' ')[0]}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>{project._count.tasks} tasks</span>
                  </div>
                </div>

                {project.endDate && (
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>Due {formatDate(project.endDate)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
