import { prisma } from '@/lib/prisma'
import { getServerUser, getClientSubTeamContext } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FolderKanban, Calendar, CheckCircle2, Clock, FileText } from 'lucide-react'

export const metadata = {
  title: 'My Projects — Tvita Client Portal',
  description: 'Track ongoing project deliverables, timelines, and milestones.',
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

export default async function ClientProjectsPage() {
  const user = await getServerUser()
  if (!user) redirect('/login')

  // Sub-team users resolve their client via the sub-team relation
  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx && !subTeamCtx.policy.projects) redirect('/client/dashboard')

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

  const projects = await prisma.project.findMany({
    where: { clientId: client.id },
    include: {
      lead: { select: { name: true } },
      milestones: {
        where: { clientVisible: true },
        orderBy: { sortOrder: 'asc' },
      },
      updates: {
        where: { clientVisible: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
      _count: { select: { tasks: { where: { clientVisible: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">My Projects</h1>
          <p className="page-header__subtitle">
            Deliverables and milestone status for {client.name}.
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FolderKanban size={28} />
            <div className="empty-state__title">No active projects</div>
            <div className="empty-state__desc">You have no active projects registered with us at this time.</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="card hover-lift" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/client/projects/${project.id}`}
                    style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', textDecoration: 'none' }}
                  >
                    {project.name}
                  </Link>
                  {project.lead && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                      Project Lead: {project.lead.name}
                    </div>
                  )}
                </div>

                <span className={`badge badge--${project.status.toLowerCase().replace('_', '-')}`}>
                  {project.status.replace('_', ' ')}
                </span>
              </div>

              {project.description && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {project.description}
                </p>
              )}

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>Overall Completion</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${project.progress}%` }} />
                </div>
              </div>

              {/* Timeline */}
              <div className="grid grid-cols-2 gap-3" style={{ background: 'var(--bg-overlay)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Start Date: </span>
                  <span style={{ color: 'var(--text-primary)' }}>{formatDate(project.startDate)}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Target Date: </span>
                  <span style={{ color: 'var(--text-primary)' }}>{formatDate(project.endDate)}</span>
                </div>
              </div>

              {/* Milestones preview */}
              {project.milestones.length > 0 && (
                <div style={{ paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                    Key Milestones
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {project.milestones.map((m) => (
                      <div key={m.id} className="flex items-center justify-between" style={{ fontSize: 'var(--text-xs)' }}>
                        <span style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                        <span className={`badge badge--${m.status.toLowerCase().replace('_', '-')}`} style={{ fontSize: 9 }}>
                          {m.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
