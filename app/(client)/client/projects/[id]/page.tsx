import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FileText, Sparkles, Receipt } from 'lucide-react'

import { prisma } from '@/lib/prisma'
import { getClientSubTeamContext, getServerUser } from '@/lib/auth/server'
import ProcessTree, { STAGES, stageIndex } from '@/app/components/client/ProcessTree'
import ProjectActions from '@/app/components/client/ProjectActions'
import ProjectWorkspaceTabs from '@/app/components/projects/ProjectWorkspaceTabs'
import ProjectBannerUpload from '@/app/components/projects/ProjectBannerUpload'

const FALLBACK_BANNER = '/banner.webp'

const STATUS_STYLES: Record<string, { label: string; tone: string }> = {
  PLANNED: { label: 'Planned', tone: 'slate' },
  IN_PROGRESS: { label: 'In progress', tone: 'amber' },
  ON_HOLD: { label: 'On hold', tone: 'orange' },
  CLIENT_REVIEW: { label: 'In review', tone: 'blue' },
  COMPLETED: { label: 'Completed', tone: 'green' },
  CANCELLED: { label: 'Cancelled', tone: 'slate' },
}

/** Client requests against this project, shown as revisions. */
const REVISION_STYLES: Record<string, { label: string; tone: string }> = {
  OPEN: { label: 'Queued', tone: 'slate' },
  IN_PROGRESS: { label: 'In progress', tone: 'amber' },
  RESOLVED: { label: 'Done', tone: 'green' },
  CLOSED: { label: 'Done', tone: 'green' },
}

function formatDate(date: Date | null) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

function shortDate(date: Date) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date)
}

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export default async function ClientProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getServerUser()
  if (!user) redirect('/login')

  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx) {
    if (!subTeamCtx.policy.projects) redirect('/client/home')
    if (subTeamCtx.allowedProjectIds.length > 0 && !subTeamCtx.allowedProjectIds.includes(id)) {
      redirect('/client/projects')
    }
  }

  const client = await prisma.client.findFirst({
    where: subTeamCtx
      ? { id: subTeamCtx.clientId }
      : { OR: [{ profileId: user.id }, { email: user.email }] },
  })
  if (!client) redirect('/client/home')

  const project = await prisma.project.findFirst({
    where: { id, clientId: client.id },
    include: {
      lead: { select: { name: true, email: true, avatarUrl: true } },
      milestones: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      },
      updates: {
        where: { clientVisible: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true, content: true, createdAt: true },
      },
      // Client requests double as the revision list.
      tickets: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, status: true, createdAt: true },
      },
      invoices: {
        orderBy: { issuedDate: 'desc' },
        select: {
          id: true,
          invoiceNo: true,
          amount: true,
          currency: true,
          status: true,
          issuedDate: true,
          pdfUrl: true,
        },
      },
    },
  })
  if (!project) redirect('/client/projects')

  const status = STATUS_STYLES[project.status] ?? { label: project.status, tone: 'slate' }
  const stage = stageIndex(project.status, project.progress)
  const phase = project.milestones.find((m) => m.status !== 'COMPLETED')?.name

  const revisionsDone = project.tickets.filter((t) =>
    ['RESOLVED', 'CLOSED'].includes(t.status),
  ).length

  const currency = project.invoices[0]?.currency ?? 'INR'
  const invoiceTotal = project.invoices.reduce((sum, inv) => sum + Number(inv.amount), 0)
  const latestInvoice = project.invoices[0]

  const canUseNotes = subTeamCtx ? subTeamCtx.policy.notes !== false : true

  return (
    <div className="pdetail">
      {/* ── Overview and who's running it ─────────────────────── */}
      <div className="pdetail__top">
        <section className={`phero phero--${status.tone}`}>
          <div
            className="phero__banner"
            style={{ backgroundImage: `url(${project.banner || FALLBACK_BANNER})` }}
          >
            <div className="phero__upload">
              <ProjectBannerUpload projectId={project.id} canUpload={true} />
            </div>
          </div>

          <div className="phero__info">
            <div className="phero__head">
              <span
                className="phero__thumb"
                style={{ backgroundImage: `url(${project.banner || FALLBACK_BANNER})` }}
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
                <span className="phero__fill" style={{ width: `${project.progress}%` }} />
              </span>
              <span className="phero__pct">{project.progress}%</span>
            </div>

            <p className="phero__phases">
              {Math.min(stage, STAGES.length)} of {STAGES.length} phases complete
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
                  {initials(project.lead?.name ?? 'Tvita')}
                </span>
              )}

              <span className="plead__body">
                <span className="plead__name">{project.lead?.name ?? 'Tvita team'}</span>
                {project.lead?.email && (
                  <span className="plead__email">{project.lead.email}</span>
                )}
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

          <ProjectActions
            project={{ id: project.id, name: project.name }}
            canUseNotes={canUseNotes}
          />
        </aside>
      </div>

      {/* ── Where the work has got to ─────────────────────────── */}
      <section className="pdetail__proc" aria-label="Process">
        <h2 className="pdetail__h">Process</h2>
        <div className="pdetail__panel">
          <ProcessTree
            status={project.status}
            progress={project.progress}
            updates={project.updates.map((u) => ({
              id: u.id,
              content: u.content,
              createdAt: u.createdAt.toISOString(),
            }))}
          />
        </div>
      </section>

      {/* ── Revisions and money ───────────────────────────────── */}
      <div className="pdetail__bottom">
        <section className="revs" aria-label="Revisions">
          <div className="pdetail__hrow">
            <h2 className="pdetail__h">Revisions</h2>
            {project.tickets.length > 0 && (
              <span className="revs__count">
                {revisionsDone} of {project.tickets.length} done
              </span>
            )}
          </div>

          {project.tickets.length === 0 ? (
            <p className="pdetail__empty">No revisions requested yet.</p>
          ) : (
            <ul className="revs__list">
              {project.tickets.map((ticket) => {
                const tone = REVISION_STYLES[ticket.status] ?? {
                  label: ticket.status,
                  tone: 'slate',
                }

                return (
                  <li key={ticket.id} className="rev">
                    <span className={`rev__icon rev__icon--${tone.tone}`}>
                      <Sparkles size={15} />
                    </span>

                    <span className="rev__body">
                      <span className="rev__title">{ticket.title}</span>
                      <span className="rev__when">{shortDate(ticket.createdAt)}</span>
                    </span>

                    <span className={`rev__badge rev__badge--${tone.tone}`}>{tone.label}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="pay" aria-label="Payment">
          <h2 className="pdetail__h">Payment</h2>

          <div className="pdetail__panel">
            {project.invoices.length === 0 ? (
              <p className="pdetail__empty">No invoices raised for this project yet.</p>
            ) : (
              <>
                <ul className="pay__list">
                  {project.invoices.map((invoice) => (
                    <li key={invoice.id} className="payrow">
                      <span className="payrow__icon">
                        <Receipt size={16} />
                      </span>

                      <span className="payrow__body">
                        <span className="payrow__no">{invoice.invoiceNo}</span>
                        <span className="payrow__when">{shortDate(invoice.issuedDate)}</span>
                      </span>

                      <span
                        className={`payrow__badge${invoice.status === 'PAID' ? ' is-paid' : ''}`}
                      >
                        {invoice.status === 'PAID' ? 'Paid' : 'Due'}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="pay__total">
                  <span>Total</span>
                  <strong>{money(invoiceTotal, currency)}</strong>
                </div>

                <Link
                  href={latestInvoice?.pdfUrl ?? '/client/invoices'}
                  className="pay__cta"
                  {...(latestInvoice?.pdfUrl ? { target: '_blank', rel: 'noreferrer' } : {})}
                >
                  <FileText size={16} />
                  View invoice
                </Link>
              </>
            )}
          </div>
        </section>
      </div>

      {/* ── Milestones and approvals, unchanged ───────────────── */}
      <ProjectWorkspaceTabs
        projectId={id}
        clientId={client.id}
        userRole={user.role}
        userTeamRole={null}
        userId={user.id}
        clientPolicy={
          subTeamCtx
            ? {
                milestones: subTeamCtx.policy.milestones !== false,
                notes: subTeamCtx.policy.notes !== false,
              }
            : { milestones: true, notes: true }
        }
        milestones={project.milestones}
        projectMembers={[]}
        isLead={false}
      />
    </div>
  )
}
