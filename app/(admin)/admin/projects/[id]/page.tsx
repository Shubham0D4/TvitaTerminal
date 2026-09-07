import { prisma } from '@/lib/prisma'
import { getServerUser, redirectToLogin } from '@/lib/auth/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Building2, Plus, Receipt, FileText } from 'lucide-react'
import AdminProjectLeadSelector from '@/app/components/projects/AdminProjectLeadSelector'
import ProjectTeamManager from '@/app/components/projects/ProjectTeamManager'
import ProjectWorkspaceTabs from '@/app/components/projects/ProjectWorkspaceTabs'
import ProjectBannerUpload from '@/app/components/projects/ProjectBannerUpload'
import AdminProjectStatusSelector from '@/app/components/projects/AdminProjectStatusSelector'
import PublishUpdateTrigger from '@/app/components/projects/PublishUpdateTrigger'
import ProcessTree, { STAGES } from '@/app/components/client/ProcessTree'
import { currentPhaseName, progressFromMilestones, stageIndexFromMilestones, withLeadAssignee } from '@/lib/process/stages'

export const metadata = {
  title: 'Project Workspace — Tvita Admin',
  description: 'Track project milestones, team allocation, approvals, and client updates.',
}

const FALLBACK_BANNER = '/banner.webp'

const STATUS_STYLES: Record<string, { label: string; tone: string }> = {
  PLANNED: { label: 'Planned', tone: 'slate' },
  IN_PROGRESS: { label: 'In progress', tone: 'amber' },
  ON_HOLD: { label: 'On hold', tone: 'orange' },
  CLIENT_REVIEW: { label: 'In review', tone: 'blue' },
  COMPLETED: { label: 'Completed', tone: 'green' },
  CANCELLED: { label: 'Cancelled', tone: 'slate' },
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

function shortDate(date: Date) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date)
}

function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount))
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
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
      lead: { select: { id: true, name: true, email: true, avatarUrl: true } },
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
      members: {
        include: { profile: { select: { id: true, name: true, email: true } } },
      },
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

  const status = STATUS_STYLES[project.status] ?? { label: project.status.replace(/_/g, ' '), tone: 'slate' }
  const progress = progressFromMilestones(project.milestones)
  const stage = stageIndexFromMilestones(project.milestones, project.status)
  const phase = currentPhaseName(project.milestones, project.status)
  const banner = project.banner || FALLBACK_BANNER
  const invoiceTotal = project.invoices.reduce((sum, inv) => sum + Number(inv.amount), 0)

  return (
    <div className="pdetail apdetail">
      <div className="apdetail__nav">
        <Link href="/admin/projects" className="btn btn--ghost btn--sm">
          <ArrowLeft size={16} /> Projects
        </Link>
        <Link href={`/admin/clients/${project.client.id}`} className="apdetail__client-link">
          <Building2 size={14} />
          {project.client.name}
        </Link>
      </div>

      {/* Hero + side — mirrors Client project layout */}
      <div className="pdetail__top">
        <section className={`phero phero--${status.tone}`}>
          <div
            className="phero__banner"
            style={{ backgroundImage: `url(${banner})` }}
          >
            <div className="phero__upload">
              <ProjectBannerUpload projectId={project.id} canUpload={true} />
            </div>
          </div>

          <div className="phero__info">
            <div className="phero__head">
              <span
                className="phero__thumb"
                style={{ backgroundImage: `url(${banner})` }}
                aria-hidden="true"
              />
              <span className="phero__body">
                <h1 className="phero__name">{project.name}</h1>
                {phase && <span className="phero__phase">{phase}</span>}
              </span>
              <span className="phero__status">{status.label}</span>
            </div>

            {project.description && <p className="phero__desc">{project.description}</p>}

            <div className="phero__meter">
              <span className="phero__bar" aria-hidden="true">
                <span className="phero__fill" style={{ width: `${progress}%` }} />
              </span>
              <span className="phero__pct">{progress}%</span>
            </div>

            <p className="phero__phases">
              {Math.min(stage, STAGES.length)} of {STAGES.length} phases ·{' '}
              {project.milestones.filter((m) => m.status === 'COMPLETED').length}/
              {project.milestones.length} milestones
            </p>

            <div className="apdetail__controls">
              <AdminProjectStatusSelector
                projectId={project.id}
                currentStatus={project.status}
                isLeadOrAdmin={true}
              />
            </div>
          </div>
        </section>

        <aside className="pside">
          <div className="pside__card">
            <div className="plead">
              {project.lead?.avatarUrl ? (
                <Image
                  src={project.lead.avatarUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="plead__avatar"
                />
              ) : (
                <span className="plead__avatar plead__avatar--text" aria-hidden="true">
                  {initials(project.lead?.name ?? 'Un')}
                </span>
              )}
              <span className="plead__body">
                <span className="plead__name">{project.lead?.name ?? 'Unassigned lead'}</span>
                {project.lead?.email && (
                  <span className="plead__email">{project.lead.email}</span>
                )}
              </span>
            </div>

            <div className="apdetail__lead-edit">
              <AdminProjectLeadSelector
                projectId={project.id}
                currentLeadId={project.leadId}
                availableLeads={availableLeads}
              />
            </div>

            <dl className="pdates">
              <div className="pdates__row">
                <dt>Started</dt>
                <dd>{formatDate(project.startDate)}</dd>
              </div>
              <div className="pdates__row">
                <dt>Due</dt>
                <dd>{formatDate(project.endDate)}</dd>
              </div>
            </dl>
          </div>

          <ProjectTeamManager
            projectId={project.id}
            currentMembers={project.members.map((m) => ({
              id: m.id,
              profileId: m.profileId,
              role: m.role,
              profile: {
                id: m.profile.id,
                name: m.profile.name,
                email: m.profile.email,
              },
            }))}
            availableAgencyStaff={agencyStaff.map((s) => ({
              id: s.id,
              name: s.name,
              role: s.role,
              teamRole: s.teamRole,
            }))}
            isLeadOrAdmin={true}
          />
        </aside>
      </div>

      {/* Process tree */}
      <section className="pdetail__proc" aria-label="Process">
        <h2 className="pdetail__h">Process</h2>
        <div className="pdetail__panel">
          <ProcessTree
            status={project.status}
            progress={progress}
            milestones={project.milestones}
            updates={project.updates
              .filter((u) => u.clientVisible)
              .slice(0, 3)
              .map((u) => ({
                id: u.id,
                content: u.content,
                createdAt: u.createdAt.toISOString(),
              }))}
          />
        </div>
      </section>

      {/* Published revisions + Payment */}
      <div className="pdetail__bottom">
        <section className="revs" aria-label="Published revisions">
          <div className="pdetail__hrow">
            <h2 className="pdetail__h">Published Revisions</h2>
            <PublishUpdateTrigger projectId={project.id} />
          </div>

          {project.updates.length === 0 ? (
            <p className="pdetail__empty">No revisions published yet. Share a client-visible update here.</p>
          ) : (
            <ul className="revs__list">
              {project.updates.map((u) => (
                <li key={u.id} className="rev">
                  <span className={`rev__icon rev__icon--${u.clientVisible ? 'green' : 'slate'}`}>
                    <FileText size={15} />
                  </span>
                  <span className="rev__body">
                    <span className="rev__title">{u.title}</span>
                    <span className="rev__when">{shortDate(u.createdAt)}</span>
                    <span className="apdetail__rev-content">{u.content}</span>
                  </span>
                  <span className={`rev__badge rev__badge--${u.clientVisible ? 'green' : 'slate'}`}>
                    {u.clientVisible ? 'Client visible' : 'Internal'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="pay" aria-label="Invoices">
          <div className="pdetail__hrow">
            <h2 className="pdetail__h">Invoices</h2>
            <Link
              href={`/admin/billing/new?projectId=${project.id}&clientId=${project.clientId}`}
              className="btn btn--ghost btn--xs"
            >
              <Plus size={12} /> New
            </Link>
          </div>

          <div className="pdetail__panel">
            {project.invoices.length === 0 ? (
              <p className="pdetail__empty">No invoices linked yet.</p>
            ) : (
              <>
                <ul className="pay__list">
                  {project.invoices.map((invoice) => (
                    <li key={invoice.id} className="payrow">
                      <span className="payrow__icon">
                        <Receipt size={16} />
                      </span>
                      <span className="payrow__body">
                        <Link href={`/admin/billing/${invoice.id}`} className="payrow__no">
                          {invoice.invoiceNo}
                        </Link>
                        <span className="payrow__when">{formatCurrency(Number(invoice.amount))}</span>
                      </span>
                      <span className={`payrow__badge${invoice.status === 'PAID' ? ' is-paid' : ''}`}>
                        {invoice.status === 'PAID' ? 'Paid' : invoice.status}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="pay__total">
                  <span>Total</span>
                  <strong>{formatCurrency(invoiceTotal)}</strong>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Workspace tabs */}
      <ProjectWorkspaceTabs
        projectId={id}
        clientId={project.clientId}
        userRole={user.role}
        userTeamRole={user.teamRole}
        userId={user.id}
        milestones={JSON.parse(JSON.stringify(project.milestones))}
        projectMembers={withLeadAssignee(
          project.members.map((m) => ({
            profileId: m.profileId,
            role: m.role,
            profile: { id: m.profile.id, name: m.profile.name },
          })),
          project.lead
        )}
        isLead={isLead}
        projectLeadId={project.leadId}
      />
    </div>
  )
}
