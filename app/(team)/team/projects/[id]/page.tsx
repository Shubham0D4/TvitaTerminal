import { prisma } from '@/lib/prisma'
import { getServerUser, redirectToLogin } from '@/lib/auth/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2 } from 'lucide-react'
import ProjectWorkspaceTabs from '@/app/components/projects/ProjectWorkspaceTabs'
import ProjectBannerUpload from '@/app/components/projects/ProjectBannerUpload'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = await prisma.project.findUnique({ where: { id }, select: { name: true } })
  return {
    title: project ? `${project.name} — Tvita Team` : 'Project — Tvita Team',
    description: 'Project milestones and approvals.',
  }
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

type PageProps = { params: Promise<{ id: string }> }

export default async function TeamProjectDetailPage({ params }: PageProps) {
  const { id } = await params
  const user = await getServerUser()
  if (!user) redirectToLogin()

  const project = await prisma.project.findFirst({
    where: {
      id,
      OR: [
        { leadId: user.id },
        { members: { some: { profileId: user.id } } },
      ],
    },
    include: {
      client: { select: { name: true } },
      lead: { select: { id: true, name: true } },
      members: { include: { profile: { select: { id: true, name: true } } } },
      milestones: {
        orderBy: { sortOrder: 'asc' },
        include: {
          assignee: { select: { name: true } },
          tasks: {
            include: {
              developer: { select: { name: true } },
              tester: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
      updates: {
        where: { clientVisible: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  })

  if (!project) notFound()

  const isLead = project.leadId === user.id || user.role === 'ADMIN'

  const roleColor = (role: string) => {
    switch (role) {
      case 'TEAM_LEAD': return { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }
      default:          return { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' }
    }
  }

  const myMembership = project.members.find((m) => m.profileId === user.id)
  const myRole = isLead ? 'TEAM_LEAD' : myMembership?.role ?? 'MEMBER'

  const completed = project.milestones.filter((m) => m.status === 'COMPLETED').length
  const total = project.milestones.length

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/team/projects" className="btn btn--ghost btn--icon">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-header__title">{project.name}</h1>
              <span className={`badge badge--${project.status.toLowerCase().replace(/_/g, '-')}`}>
                {project.status.replace(/_/g, ' ')}
              </span>
              <span className="badge" style={roleColor(myRole)}>
                {myRole.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center gap-2" style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              <Building2 size={12} />
              <span>{project.client.name}</span>
              {project.lead && <><span>·</span><span>Lead: {project.lead.name}</span></>}
            </div>
          </div>
        </div>
      </div>

      {/* Project Banner cover image */}
      <div 
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: '240px', 
          borderRadius: 'var(--radius-xl)', 
          overflow: 'hidden', 
          marginBottom: 'var(--space-6)',
          backgroundImage: `url(${project.banner || '/banner.webp'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <div style={{ position: 'absolute', right: 'var(--space-4)', bottom: 'var(--space-4)' }}>
          <ProjectBannerUpload projectId={project.id} canUpload={isLead} />
        </div>
      </div>

      {/* Progress bar */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Milestone Progress</div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
            {project.progress}% ({completed}/{total} milestones)
          </div>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${project.progress}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Start</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{formatDate(project.startDate)}</div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Deadline</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{formatDate(project.endDate)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main: Process & Roadmaps */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <ProjectWorkspaceTabs
            projectId={id}
            clientId={project.clientId}
            userRole={user.role}
            userTeamRole={user.teamRole}
            userId={user.id}
            milestones={project.milestones}
            projectMembers={project.members}
            isLead={isLead}
          />
        </div>

        {/* Right: Team + Updates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div className="card">
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              Team ({project.members.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {project.lead && (
                <div className="flex items-center gap-2" style={{ fontSize: 'var(--text-sm)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--text-xs)' }}>
                    {project.lead.name.charAt(0)}
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>{project.lead.name}</span>
                  <span className="badge" style={{ fontSize: 9, background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>Lead</span>
                </div>
              )}
              {project.members.filter((m) => m.profileId !== project.leadId).map((m) => (
                <div key={m.id} className="flex items-center gap-2" style={{ fontSize: 'var(--text-sm)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-primary-muted)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--text-xs)' }}>
                    {m.profile.name.charAt(0)}
                  </div>
                  <span style={{ color: 'var(--text-primary)' }}>{m.profile.name}</span>
                  <span className="badge" style={{ fontSize: 9, ...roleColor(m.role) }}>{m.role.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </div>

          {project.updates.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
                Recent Updates
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {project.updates.map((u) => (
                  <div key={u.id} style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{u.title}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>{u.content}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                      {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(u.createdAt))}
                    </div>
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
