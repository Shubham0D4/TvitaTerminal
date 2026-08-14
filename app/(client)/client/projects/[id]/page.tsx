import { prisma } from '@/lib/prisma'
import { getClientSubTeamContext, getServerUser } from '@/lib/auth/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Clock } from 'lucide-react'
import CircularProgress from '@/components/ui/CircularProgress'
import ApprovalsPanel from '@/components/projects/ApprovalsPanel'

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

export default async function ClientProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getServerUser()
  if (!user) redirect('/login')

  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx) {
    if (!subTeamCtx.policy.projects) redirect('/client/dashboard')
    if (subTeamCtx.allowedProjectIds.length > 0 && !subTeamCtx.allowedProjectIds.includes(id)) {
      redirect('/client/projects')
    }
  }

  const client = await prisma.client.findFirst({
    where: subTeamCtx
      ? { id: subTeamCtx.clientId }
      : { OR: [{ profileId: user.id }, { email: user.email }] },
  })
  if (!client) redirect('/client/dashboard')

  const project = await prisma.project.findFirst({
    where: { id, clientId: client.id },
    include: {
      lead: { select: { name: true } },
      milestones: {
        where: { status: 'COMPLETED' },  // client sees ONLY completed milestones
        orderBy: { completedDate: 'desc' },
        select: { id: true, name: true, description: true, status: true, completedDate: true },
      },
      updates: {
        where: { clientVisible: true },
        orderBy: { createdAt: 'desc' },
      },
      approvals: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!project) notFound()

  // Compute progress from ALL milestones (not just completed ones visible here)
  const allMilestones = await prisma.milestone.findMany({ where: { projectId: id } })
  const totalMilestones = allMilestones.length
  const completedMilestones = allMilestones.filter((m) => m.status === 'COMPLETED').length
  const progressPct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : project.progress

  const pendingApprovals = project.approvals.filter((a) => a.status === 'PENDING').length

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/client/projects" className="btn btn--ghost btn--icon">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-header__title">{project.name}</h1>
              <span className={`badge badge--${project.status.toLowerCase().replace(/_/g, '-')}`}>
                {project.status.replace(/_/g, ' ')}
              </span>
              {pendingApprovals > 0 && (
                <span style={{ fontSize: 11, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 10px', borderRadius: 20, fontWeight: 700 }}>
                  {pendingApprovals} approval{pendingApprovals !== 1 ? 's' : ''} pending
                </span>
              )}
            </div>
            <p className="page-header__subtitle">
              Lead: {project.lead?.name ?? '—'} · {formatDate(project.startDate)} → {formatDate(project.endDate)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: circular ring + completion info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* Circular Progress Ring */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-6)' }}>
            <CircularProgress
              percent={progressPct}
              size={160}
              strokeWidth={14}
              color="#6366f1"
              trackColor="rgba(99,102,241,0.1)"
              label="Complete"
            />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {completedMilestones} of {totalMilestones} milestone{totalMilestones !== 1 ? 's' : ''} complete
              </div>
              {project.endDate && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                  Deadline: {formatDate(project.endDate)}
                </div>
              )}
            </div>
          </div>

          {/* Project description */}
          {project.description && (
            <div className="card">
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
                About this Project
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {project.description}
              </p>
            </div>
          )}
        </div>

        {/* Right 2 cols: Milestones + Approvals + Updates */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* Completed Milestones */}
          <div className="card">
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              Completed Milestones
            </h2>
            {project.milestones.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                <Clock size={24} />
                <div className="empty-state__title">No milestones completed yet</div>
                <div className="empty-state__desc">Completed milestones will appear here as your team progresses.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {project.milestones.map((m) => (
                  <div key={m.id} style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span style={{ fontSize: 14, color: '#10b981' }}>✓</span>
                          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                            {m.name}
                          </span>
                        </div>
                        {m.description && (
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginLeft: 22 }}>
                            {m.description}
                          </p>
                        )}
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {m.completedDate ? `Done ${formatDate(m.completedDate)}` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approvals */}
          <ApprovalsPanel
            projectId={id}
            isLead={false}
            isClient={true}
            approvals={project.approvals}
          />

          {/* Project Updates */}
          {project.updates.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
                Project Updates
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {project.updates.map((u) => (
                  <div key={u.id} style={{ background: 'var(--bg-elevated)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles size={12} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{u.title}</div>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{u.content}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{formatDate(u.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
