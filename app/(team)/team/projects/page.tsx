import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FolderKanban, CheckCircle2, Clock, Calendar, Building2 } from 'lucide-react'

export const metadata = {
  title: 'My Projects — Tvita Team',
  description: 'View active project allocations and lead assignments.',
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

export default async function TeamProjectsPage() {
  const user = await getServerUser()
  if (!user) redirect('/login')

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { leadId: user.id },
        { members: { some: { profileId: user.id } } },
      ],
    },
    include: {
      client: { select: { name: true } },
      lead: { select: { name: true } },
      _count: { select: { tasks: true, members: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Assigned Projects</h1>
          <p className="page-header__subtitle">
            {projects.length} project allocations assigned to you.
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FolderKanban size={28} />
            <div className="empty-state__title">No active project assignments</div>
            <div className="empty-state__desc">Projects led by or assigned to you will appear here.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--space-6)' }}>
          {projects.map((project) => (
            <div key={project.id} className="card hover-lift" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
              <div style={{ height: 120, backgroundImage: `url(${project.banner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800'})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/team/projects/${project.id}`}
                      style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', textDecoration: 'none' }}
                    >
                      {project.name}
                    </Link>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                      Client: {project.client.name} · Lead: {project.lead?.name ?? 'Unassigned'}
                    </div>
                  </div>

                  <span className={`badge badge--${project.status.toLowerCase().replace('_', '-')}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    <span>Completion</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${project.progress}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border-subtle)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>Tasks: {project._count.tasks} · Members: {project._count.members}</span>
                  <span>Due: {formatDate(project.endDate)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
