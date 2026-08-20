import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { FolderKanban, Plus } from 'lucide-react'

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
    select: {
      id: true,
      name: true,
      status: true,
      progress: true,
      banner: true,
    },
    orderBy: { createdAt: 'desc' },
  })
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/admin/projects/${project.id}`}
              className="card hover-lift"
              style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                padding: 0,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  height: 120,
                  backgroundImage: `url(${project.banner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {/* Project Name */}
                <div
                  style={{
                    fontSize: 'var(--text-md)',
                    fontWeight: 'var(--font-semibold)',
                    color: 'var(--text-primary)',
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                  }}
                >
                  {project.name}
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${project.progress}%` }} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
