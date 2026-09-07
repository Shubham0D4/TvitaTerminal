import { prisma } from '@/lib/prisma'
import { getServerUser, redirectToLogin } from '@/lib/auth/server'
import { CheckCircle2, Clock, PlayCircle } from 'lucide-react'
import Link from 'next/link'
import MilestoneStatusButton from './MilestoneStatusButton'

export const metadata = {
  title: 'My Milestones — Tvita Team',
  description: 'View and update your assigned milestones across all projects.',
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

const STATUS_COLORS: Record<string, string> = {
  PLANNED: '#64748b', IN_PROGRESS: '#f59e0b', COMPLETED: '#10b981', BLOCKED: '#ef4444',
}

interface MilestoneItem {
  id: string
  name: string
  description: string | null
  status: string
  dueDate: Date | null
  imageUrls: string[]
  project: {
    id: string
    name: string
    client: {
      name: string
    }
  }
}

function MilestoneCard({ m }: { m: MilestoneItem }) {
  const color = STATUS_COLORS[m.status] ?? '#64748b'
  return (
    <div className="ms-card" style={{ borderLeftColor: color }}>
      <div className="flex items-start justify-between gap-3">
        <div style={{ flex: 1 }}>
          <div className="ms-card__title">{m.name}</div>
          {m.description && <div className="ms-card__desc">{m.description}</div>}
          {m.imageUrls && m.imageUrls.length > 0 && (
            <div className="ms-card__thumbs">
              {m.imageUrls.map((url, idx) => (
                <a key={idx} href={url} target="_blank" rel="noreferrer" className="ms-card__thumb" title="View attachment">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Attachment ${idx + 1}`} />
                </a>
              ))}
            </div>
          )}
          <div className="ms-card__meta">
            <Link href={`/team/projects/${m.project.id}`}>{m.project.name}</Link>
            <span>· {m.project.client.name}</span>
            {m.dueDate && <span>· Due {formatDate(m.dueDate)}</span>}
          </div>
        </div>
        <MilestoneStatusButton milestoneId={m.id} currentStatus={m.status as 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'} />
      </div>
    </div>
  )
}

function Section({ title, items, icon }: { title: string; items: MilestoneItem[]; icon: React.ReactNode }) {
  if (items.length === 0) return null
  return (
    <section className="card ms-section">
      <div className="ms-section__head">
        {icon}
        <h2>{title}</h2>
        <span className="badge">{items.length}</span>
      </div>
      <div className="ms-section__list">
        {items.map((m) => <MilestoneCard key={m.id} m={m} />)}
      </div>
    </section>
  )
}

export default async function TeamMilestonesPage() {
  const user = await getServerUser()
  if (!user) redirectToLogin()

  const milestones = await prisma.milestone.findMany({
    where: { assigneeId: user.id },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    include: {
      project: { select: { id: true, name: true, client: { select: { name: true } } } },
    },
  })

  const active  = milestones.filter((m) => m.status === 'IN_PROGRESS') as unknown as MilestoneItem[]
  const pending = milestones.filter((m) => m.status === 'PLANNED') as unknown as MilestoneItem[]
  const done    = milestones.filter((m) => m.status === 'COMPLETED') as unknown as MilestoneItem[]
  const blocked = milestones.filter((m) => m.status === 'BLOCKED') as unknown as MilestoneItem[]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">My Milestones</h1>
          <p className="page-header__subtitle">
            {milestones.length === 0
              ? 'No milestones assigned to you yet.'
              : `${active.length} in progress · ${pending.length} planned · ${done.length} completed`}
          </p>
        </div>
      </div>

      {milestones.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <CheckCircle2 size={28} />
            <div className="empty-state__title">No milestones assigned</div>
            <div className="empty-state__desc">Your project lead will assign milestones to you once they're created.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          <Section title="In Progress" items={active} icon={<PlayCircle size={18} style={{ color: '#f59e0b' }} />} />
          <Section title="Planned" items={pending} icon={<Clock size={18} style={{ color: '#64748b' }} />} />
          <Section title="Blocked" items={blocked} icon={<Clock size={18} style={{ color: '#ef4444' }} />} />
          <Section title="Completed" items={done} icon={<CheckCircle2 size={18} style={{ color: '#10b981' }} />} />
        </div>
      )}
    </div>
  )
}
