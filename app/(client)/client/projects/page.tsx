import { prisma } from '@/lib/prisma'
import { getServerUser, getClientSubTeamContext } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FolderKanban } from 'lucide-react'

export const metadata = {
  title: 'My Projects — Tvita Client Portal',
  description: 'Track ongoing project deliverables, timelines, and milestones.',
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
    where: {
      clientId: client.id,
      ...(subTeamCtx && subTeamCtx.allowedProjectIds.length > 0
        ? { id: { in: subTeamCtx.allowedProjectIds } }
        : {}),
    },
    select: {
      id: true,
      name: true,
      progress: true,
      banner: true,
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/client/projects/${project.id}`}
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
