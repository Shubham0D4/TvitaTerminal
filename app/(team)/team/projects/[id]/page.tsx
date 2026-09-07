import { prisma } from '@/lib/prisma'
import { getServerUser, redirectToLogin } from '@/lib/auth/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Building2, FileText } from 'lucide-react'
import ProjectWorkspaceTabs from '@/app/components/projects/ProjectWorkspaceTabs'
import ProjectBannerUpload from '@/app/components/projects/ProjectBannerUpload'
import PublishUpdateTrigger from '@/app/components/projects/PublishUpdateTrigger'
import ProcessTree, { STAGES } from '@/app/components/client/ProcessTree'
import { currentPhaseName, progressFromMilestones, stageIndexFromMilestones, withLeadAssignee } from '@/lib/process/stages'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = await prisma.project.findUnique({ where: { id }, select: { name: true } })
  return {
    title: project ? `${project.name} — Tvita Team` : 'Project — Tvita Team',
    description: 'Project workspace: process, notes, tickets, and meetings.',
  }
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
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function shortDate(date: Date) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date)
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('')
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
      lead: { select: { id: true, name: true, email: true, avatarUrl: true } },
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
        orderBy: { createdAt: 'desc' },
        take: 8,
      },
    },
  })

  if (!project) notFound()

  const isLead = project.leadId === user.id || user.role === 'ADMIN'
  const myMembership = project.members.find((m) => m.profileId === user.id)
  const myRole = isLead ? 'Project lead' : (myMembership?.role ?? 'MEMBER').replace(/_/g, ' ')
  const status = STATUS_STYLES[project.status] ?? { label: project.status.replace(/_/g, ' '), tone: 'slate' }
  const progress = progressFromMilestones(project.milestones)
  const stage = stageIndexFromMilestones(project.milestones, project.status)
  const phase = currentPhaseName(project.milestones, project.status)
  const banner = project.banner || FALLBACK_BANNER
  const clientUpdates = project.updates.filter((u) => u.clientVisible)

  return (
    <div className="pdetail">
      <div className="apdetail__nav">
        <Link href="/team/projects" className="btn btn--ghost btn--sm">
          <ArrowLeft size={16} /> Projects
        </Link>
        <span className="apdetail__client-link">
          <Building2 size={14} />
          {project.client.name}
        </span>
      </div>

      <div className="pdetail__top">
        <section className={`phero phero--${status.tone}`}>
          <div className="phero__banner" style={{ backgroundImage: `url(${banner})` }}>
            {isLead && (
              <div className="phero__upload">
                <ProjectBannerUpload projectId={project.id} canUpload={true} />
              </div>
            )}
          </div>

          <div className="phero__info">
            <div className="phero__head">
              <span className="phero__thumb" style={{ backgroundImage: `url(${banner})` }} aria-hidden="true" />
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
              {' · '}
              Your role: {myRole}
            </p>
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
                {project.lead?.email && <span className="plead__email">{project.lead.email}</span>}
              </span>
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

          <div className="pside__card">
            <h2 className="pdetail__h" style={{ marginBottom: 12 }}>Team</h2>
            <ul className="team-roster">
              {project.lead && (
                <li className="team-roster__row">
                  <span className="team-roster__avatar">{initials(project.lead.name)}</span>
                  <span className="team-roster__name">{project.lead.name}</span>
                  <span className="badge">Lead</span>
                </li>
              )}
              {project.members.filter((m) => m.profileId !== project.leadId).map((m) => (
                <li key={m.id} className="team-roster__row">
                  <span className="team-roster__avatar">{initials(m.profile.name)}</span>
                  <span className="team-roster__name">{m.profile.name}</span>
                  <span className="badge">{m.role.replace(/_/g, ' ')}</span>
                </li>
              ))}
              {project.members.length === 0 && !project.lead && (
                <li className="pdetail__empty">No members assigned yet.</li>
              )}
            </ul>
          </div>
        </aside>
      </div>

      <section className="pdetail__proc" aria-label="Process">
        <h2 className="pdetail__h">Process</h2>
        <div className="pdetail__panel">
          <ProcessTree
            status={project.status}
            progress={progress}
            milestones={project.milestones}
            updates={clientUpdates.slice(0, 3).map((u) => ({
              id: u.id,
              content: u.content,
              createdAt: u.createdAt.toISOString(),
            }))}
          />
        </div>
      </section>

      <div className="pdetail__bottom pdetail__bottom--single">
        <section className="revs" aria-label="Client-visible updates">
          <div className="pdetail__hrow">
            <h2 className="pdetail__h">Revisions</h2>
            {isLead && <PublishUpdateTrigger projectId={project.id} />}
          </div>
          {project.updates.length === 0 ? (
            <p className="pdetail__empty">
              {isLead ? 'No revisions published yet. Share a client-visible update here.' : 'No published revisions yet.'}
            </p>
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
      </div>

      <ProjectWorkspaceTabs
        projectId={id}
        clientId={project.clientId}
        userRole={user.role}
        userTeamRole={isLead ? 'TEAM_LEAD' : user.teamRole}
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
