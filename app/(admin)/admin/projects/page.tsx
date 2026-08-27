import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { FolderKanban, Plus, Search, Building2, User, Calendar, CheckCircle2 } from 'lucide-react'

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
      startDate: true,
      endDate: true,
      description: true,
      client: { select: { name: true } },
      lead: { select: { name: true } },
      milestones: {
        where: { status: { in: ['IN_PROGRESS', 'PLANNED'] } },
        orderBy: { sortOrder: 'asc' },
        take: 1,
        select: { name: true },
      },
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

  const STATUS_STYLES: Record<string, { label: string; tone: string }> = {
    PLANNED: { label: 'Planned', tone: 'slate' },
    IN_PROGRESS: { label: 'In progress', tone: 'amber' },
    ON_HOLD: { label: 'On hold', tone: 'orange' },
    CLIENT_REVIEW: { label: 'In review', tone: 'blue' },
    COMPLETED: { label: 'Completed', tone: 'green' },
    CANCELLED: { label: 'Cancelled', tone: 'slate' },
  }

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
          <Link href="/admin/projects/new" className="btn btn--primary btn--sm">
            <Plus size={16} />
            New Project
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
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
        </form>

        {(['ALL', 'IN_PROGRESS', 'PLANNED', 'ON_HOLD', 'COMPLETED', 'CLIENT_REVIEW'] as const).map((s) => (
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
            <Link href="/admin/projects/new" className="btn btn--primary btn--sm mt-4">
              <Plus size={14} />
              Create Project
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
          {projects.map((project) => {
            const statusStyle = STATUS_STYLES[project.status] ?? { label: project.status, tone: 'slate' }
            const activePhase = project.milestones[0]?.name
            const isCompleted = project.status === 'COMPLETED'
            
            return (
              <Link
                key={project.id}
                href={`/admin/projects/${project.id}`}
                className="card hover-lift"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-5)',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  background: '#ffffff',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.015), 0 1px 3px rgba(0,0,0,0.005)'
                }}
              >
                {/* Client & Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {project.client.name}
                  </span>
                  <span className={`badge badge--${statusStyle.tone}`} style={{ fontSize: '10px' }}>
                    {statusStyle.label}
                  </span>
                </div>

                {/* Project Title & Description */}
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      fontSize: 'var(--text-md)',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      lineHeight: 1.3,
                      margin: 0
                    }}
                  >
                    {project.name}
                  </h3>
                  {project.description && (
                    <p 
                      style={{ 
                        fontSize: 'var(--text-xs)', 
                        color: 'var(--text-secondary)', 
                        marginTop: '4px', 
                        display: '-webkit-box', 
                        WebkitLineClamp: 2, 
                        WebkitBoxOrient: 'vertical', 
                        overflow: 'hidden', 
                        lineHeight: 1.4 
                      }}
                    >
                      {project.description}
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: 'var(--space-1) 0' }} />

                {/* Active Milestone / Phase */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <FolderKanban size={13} style={{ color: 'var(--accent-primary)' }} />
                  <span className="truncate" style={{ fontWeight: 500 }}>
                    {activePhase ? `Active Stage: ${activePhase}` : 'All stages complete'}
                  </span>
                </div>

                {/* Lead and End Date */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {project.lead ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div 
                        style={{ 
                          width: '18px', 
                          height: '18px', 
                          borderRadius: '50%', 
                          background: 'var(--bg-elevated)', 
                          border: '1px solid var(--border-default)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '9px', 
                          fontWeight: 600,
                          color: 'var(--text-primary)'
                        }}
                      >
                        {project.lead.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="truncate" style={{ maxWidth: '110px' }}>{project.lead.name}</span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                  )}
                  
                  {project.endDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={11} style={{ color: 'var(--text-muted)' }} />
                      <span>Due {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(project.endDate))}</span>
                    </div>
                  )}
                </div>

                {/* Progress Bar Indicator */}
                <div style={{ marginTop: 'var(--space-1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    <span>Milestone Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div style={{ height: '4px', width: '100%', background: 'var(--bg-elevated)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${project.progress}%`, 
                        background: isCompleted ? '#10b981' : 'var(--accent-primary)', 
                        borderRadius: '2px', 
                        transition: 'width 0.3s ease' 
                      }} 
                    />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
