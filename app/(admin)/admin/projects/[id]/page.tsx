import { prisma } from '@/lib/prisma'
import { getServerUser, redirectToLogin } from '@/lib/auth/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Building2, Plus, CreditCard, Clock, Layers } from 'lucide-react'
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

  const STATUS_STYLES: Record<string, { label: string; tone: string }> = {
    PLANNED: { label: 'Planned', tone: 'slate' },
    IN_PROGRESS: { label: 'In progress', tone: 'amber' },
    ON_HOLD: { label: 'On hold', tone: 'orange' },
    CLIENT_REVIEW: { label: 'In review', tone: 'blue' },
    COMPLETED: { label: 'Completed', tone: 'green' },
    CANCELLED: { label: 'Cancelled', tone: 'slate' },
  }

  const statusStyle = STATUS_STYLES[project.status] ?? { label: project.status, tone: 'slate' }
  const currentPhase = project.milestones.find((m) => m.status !== 'COMPLETED')?.name

  return (
    <div className="pdetail">
      {/* ── Overview & Side Actions Column ── */}
      <div className="pdetail__top">
        <section className={`phero phero--${statusStyle.tone}`}>
          <div
            className="phero__banner"
            style={{ backgroundImage: `url(${project.banner || '/banner.webp'})` }}
          >
            <div className="phero__upload">
              <ProjectBannerUpload projectId={project.id} canUpload={true} />
            </div>
          </div>

          <div className="phero__info">
            <div className="phero__head">
              <span
                className="phero__thumb"
                style={{ backgroundImage: `url(${project.banner || '/banner.webp'})` }}
                aria-hidden="true"
              />

              <span className="phero__body">
                <h1 className="phero__name">{project.name}</h1>
                {currentPhase && <span className="phero__phase">{currentPhase}</span>}
              </span>

              <span className="phero__status">{statusStyle.label}</span>
            </div>

            {project.description && <p className="phero__desc">{project.description}</p>}

            <div className="phero__meter">
              <span className="phero__bar" aria-hidden="true">
                <span className="phero__fill" style={{ width: `${project.progress}%` }} />
              </span>
              <span className="phero__pct">{project.progress}%</span>
            </div>

            <p className="phero__phases">
              {completedMilestones} of {totalMilestones} milestones complete
            </p>
          </div>
        </section>

        <aside className="pside">
          <div className="pside__card">
            {/* Linked Client */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>CLIENT ACCOUNT</span>
              <Link href={`/admin/clients/${project.client.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                <Building2 size={16} />
                {project.client.name}
              </Link>
            </div>

            {/* Lead Selector */}
            <AdminProjectLeadSelector
              projectId={project.id}
              currentLeadId={project.leadId}
              availableLeads={availableLeads}
            />

            {/* Timelines */}
            <dl className="pdates" style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)' }}>
              <div className="pdates__row">
                <dt>Started</dt>
                <dd>{formatDate(project.startDate)}</dd>
              </div>
              <div className="pdates__row">
                <dt>Due Date</dt>
                <dd>{formatDate(project.endDate)}</dd>
              </div>
            </dl>
          </div>

          <div style={{ marginTop: 'var(--space-3)' }}>
            <PublishUpdateTrigger projectId={project.id} />
          </div>
        </aside>
      </div>

      {/* ── Tabs, Team, and Billing Grid ── */}
      <div className="grid grid-cols-3 gap-6 mt-6">
        {/* Workspace tabs (Milestones, approving tasks, etc.) */}
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

          {/* Published Updates logs list */}
          {project.updates.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
                Published Updates ({project.updates.length})
              </h2>
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

        {/* Right side widgets: Team & Invoicing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <ProjectTeamManager
            projectId={project.id}
            currentMembers={project.members}
            availableAgencyStaff={agencyStaff}
            isLeadOrAdmin={true}
          />

          {/* Invoices raised */}
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
