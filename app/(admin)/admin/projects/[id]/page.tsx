import { prisma } from '@/lib/prisma'
import { getServerUser, redirectToLogin } from '@/lib/auth/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Plus, CreditCard } from 'lucide-react'
import AdminProjectLeadSelector from '@/app/components/projects/AdminProjectLeadSelector'
import ProjectTeamManager from '@/app/components/projects/ProjectTeamManager'
import PublishUpdateTrigger from '@/app/components/projects/PublishUpdateTrigger'
import ProjectWorkspaceTabs from '@/app/components/projects/ProjectWorkspaceTabs'
import ProjectBannerUpload from '@/app/components/projects/ProjectBannerUpload'

export const metadata = {
  title: 'Project Workspace — Tvita Admin',
  description: 'Track project milestones, team allocation, approvals, and client updates.',
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}
function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount))
}

type PageProps = { params: Promise<{ id: string }> }

export default async function AdminProjectDetailPage({ params }: PageProps) {
  const { id } = await params
  const user = await getServerUser()
  if (!user) redirectToLogin()

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      lead: true,
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
      members: { include: { profile: true } },
      invoices: { orderBy: { createdAt: 'desc' } },
      updates: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!project) notFound()

  const isLead = user.role === 'ADMIN' || project.leadId === user.id

  const [availableLeads, agencyStaff] = await Promise.all([
    prisma.profile.findMany({
      where: { isActive: true, role: { in: ['ADMIN', 'TEAM_MEMBER'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.profile.findMany({
      where: { isActive: true, role: { in: ['ADMIN', 'TEAM_MEMBER'] } },
      select: { id: true, name: true, teamRole: true, role: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const completedMilestones = project.milestones.filter((m: any) => m.status === 'COMPLETED').length
  const totalMilestones = project.milestones.length

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/admin/projects" className="btn btn--ghost btn--icon">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-header__title">{project.name}</h1>
              <span className={`badge badge--${project.status.toLowerCase().replace('_', '-')}`}>
                {project.status.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-2" style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              <Building2 size={13} />
              <span>Client:</span>
              <Link href={`/admin/clients/${project.client.id}`} style={{ color: 'var(--accent-primary)' }}>
                {project.client.name}
              </Link>
            </div>
          </div>
        </div>
        <div className="page-header__actions flex items-center gap-2">
          <PublishUpdateTrigger projectId={project.id} />
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
          <ProjectBannerUpload projectId={project.id} canUpload={true} />
        </div>
      </div>

      {/* Overview Bar */}
      <div className="card mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Milestone Progress</div>
            <div className="flex items-center gap-2" style={{ marginTop: 'var(--space-1)' }}>
              <div className="progress-bar-container" style={{ flex: 1 }}>
                <div className="progress-bar-fill" style={{ width: `${project.progress}%` }} />
              </div>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                {project.progress}%
              </span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              {completedMilestones}/{totalMilestones} milestones
            </div>
          </div>
          <div>
            <AdminProjectLeadSelector
              projectId={project.id}
              currentLeadId={project.leadId}
              availableLeads={availableLeads}
            />
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Start Date</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginTop: 'var(--space-1)' }}>{formatDate(project.startDate)}</div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Target Completion</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginTop: 'var(--space-1)' }}>{formatDate(project.endDate)}</div>
          </div>
        </div>
        {project.description && (
          <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {project.description}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main: Milestones + Approvals */}
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

          {/* Published Updates */}
          {project.updates.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                  Published Updates ({project.updates.length})
                </h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {project.updates.map((u: any) => (
                  <div key={u.id} style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{u.title}</span>
                      <span className={`badge badge--${u.clientVisible ? 'active' : 'inactive'}`} style={{ fontSize: 9 }}>
                        {u.clientVisible ? 'Client Visible' : 'Internal'}
                      </span>
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>{u.content}</p>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{formatDate(u.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Team + Invoices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <ProjectTeamManager
            projectId={project.id}
            currentMembers={project.members}
            availableAgencyStaff={agencyStaff}
            isLeadOrAdmin={true}
          />

          {/* Invoices */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                Invoices ({project.invoices.length})
              </h2>
              <Link href={`/admin/billing/new?projectId=${project.id}&clientId=${project.clientId}`} className="btn btn--ghost btn--xs">
                <Plus size={12} />
              </Link>
            </div>
            {project.invoices.length === 0 ? (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>No invoices linked yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {project.invoices.map((inv: any) => (
                  <Link key={inv.id} href={`/admin/billing/${inv.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2) 0', textDecoration: 'none' }}>
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--accent-primary)', fontWeight: 'var(--font-medium)' }}>{inv.invoiceNo}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{formatCurrency(Number(inv.amount))}</div>
                    </div>
                    <span className={`badge badge--${inv.status.toLowerCase()}`}>{inv.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
