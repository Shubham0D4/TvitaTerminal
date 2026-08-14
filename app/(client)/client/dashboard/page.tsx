import { getServerUser, getClientSubTeamContext } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import {
  FolderKanban,
  CreditCard,
  FileText,
  Boxes,
} from 'lucide-react'

export const metadata = {
  title: 'Dashboard — Tvita Client Portal',
}

export default async function ClientDashboardPage() {
  const user = await getServerUser()
  if (!user) return null

  const subTeamCtx = await getClientSubTeamContext(user.id)

  // Get the client record — sub-team resolves via clientId, primary client via profileId
  const client = await prisma.client.findFirst({
    where: subTeamCtx
      ? { id: subTeamCtx.clientId }
      : { profileId: user.id },
    include: {
      subscriptions: {
        where: { status: 'ACTIVE' },
        take: 1,
        include: { plan: true },
      },
    },
  })

  const showFinancials = !subTeamCtx

  const [projectCount, pendingInvoices, openDocs] = await Promise.all([
    client
      ? prisma.project.count({ where: { clientId: client.id, status: { in: ['IN_PROGRESS', 'PLANNED'] } } })
      : Promise.resolve(0),
    showFinancials && client
      ? prisma.invoice.count({ where: { clientId: client.id, status: { in: ['PENDING', 'OVERDUE'] } } })
      : Promise.resolve(0),
    client
      ? prisma.document.count({ where: { clientId: client.id, visibility: 'CLIENT_VISIBLE' } })
      : Promise.resolve(0),
  ])

  const recentProjects = client
    ? await prisma.project.findMany({
        where: { clientId: client.id },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      })
    : []

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const activePlan = client?.subscriptions[0]?.plan

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="page-header__subtitle">
            Welcome to your {client?.name ?? 'agency'} portal.
          </p>
        </div>
        {activePlan && (
          <div className="card" style={{ padding: 'var(--space-4) var(--space-6)', flexShrink: 0 }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
              Current Plan
            </div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--accent-primary)' }}>
              {activePlan.name}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">
            <FolderKanban size={20} />
          </div>
          <div>
            <div className="stat-card__value">{projectCount}</div>
            <div className="stat-card__label">Active Projects</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--yellow">
            <CreditCard size={20} />
          </div>
          <div>
            <div className="stat-card__value">{pendingInvoices}</div>
            <div className="stat-card__label">Pending Invoices</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">
            <FileText size={20} />
          </div>
          <div>
            <div className="stat-card__value">{openDocs}</div>
            <div className="stat-card__label">Documents</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
            Your Projects
          </h2>
          <a href="/client/projects" className="btn btn--ghost btn--sm">View all</a>
        </div>

        {recentProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon"><FolderKanban size={24} /></div>
            <div className="empty-state__title">No projects yet</div>
            <div className="empty-state__desc">Your projects will appear here once they&apos;re created.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {recentProjects.map((project: typeof recentProjects[number]) => (
              <a
                key={project.id}
                href={`/client/projects/${project.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  textDecoration: 'none',
                  transition: 'all var(--transition-fast)',
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)', marginBottom: 4 }}>
                    {project.name}
                  </div>
                  {project.description && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
                      {project.description}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>Progress</div>
                    <div className="flex items-center gap-2">
                      <div className="progress-bar-container" style={{ width: 60 }}>
                        <div className="progress-bar-fill" style={{ width: `${project.progress}%` }} />
                      </div>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {project.progress}%
                      </span>
                    </div>
                  </div>
                  <span className={`badge badge--${project.status.toLowerCase().replace('_', '-')}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
