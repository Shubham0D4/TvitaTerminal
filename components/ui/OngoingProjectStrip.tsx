import React from 'react'
import Link from 'next/link'
import { TagChip } from './TagChip'
import { ChevronRight, CheckCircle2, Clock } from 'lucide-react'

interface MilestoneStep {
  id: string
  title: string
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PLANNED'
}

interface OngoingProjectStripProps {
  id: string
  name: string
  clientName?: string
  progress: number
  banner?: string | null
  statusLabel?: string
  steps?: MilestoneStep[]
  href?: string
}

export function OngoingProjectStrip({
  id,
  name,
  clientName,
  progress,
  banner,
  statusLabel = 'IN PROGRESS',
  steps = [],
  href,
}: OngoingProjectStripProps) {
  const targetHref = href || `/client/projects/${id}`

  return (
    <Link
      href={targetHref}
      style={{
        display: 'block',
        textDecoration: 'none',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-subtle)',
        padding: 'var(--space-6)',
        boxShadow: 'var(--shadow-md)',
        transition: 'all var(--transition-base)',
      }}
      className="hover-lift"
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </h3>
            <TagChip label={statusLabel} variant="in_progress" size="sm" />
          </div>
          {clientName && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
              Client: {clientName}
            </p>
          )}
        </div>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
          <ChevronRight size={18} />
        </div>
      </div>

      {/* Banner preview if available */}
      {banner && (
        <div style={{ height: '100px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 'var(--space-4)', position: 'relative' }}>
          <img src={banner} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* Progress meter */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
          <span>Overall Completion</span>
          <span style={{ fontWeight: 'var(--font-bold)', color: 'var(--accent-primary)' }}>{progress}%</span>
        </div>
        <div style={{ height: '8px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, Math.max(0, progress))}%`,
              background: 'var(--accent-gradient)',
              borderRadius: 'var(--radius-full)',
              transition: 'width 400ms ease',
            }}
          />
        </div>
      </div>

      {/* Phase step checklist snippet */}
      {steps.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
          {steps.slice(0, 3).map((step) => (
            <div
              key={step.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                background: step.status === 'COMPLETED' ? '#DFF0E8' : step.status === 'IN_PROGRESS' ? '#FFF3D6' : 'var(--bg-base)',
                fontSize: '11px',
                color: step.status === 'COMPLETED' ? '#1E6B50' : step.status === 'IN_PROGRESS' ? '#8A6A0B' : 'var(--text-muted)',
              }}
            >
              {step.status === 'COMPLETED' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
              <span style={{ fontWeight: 'var(--font-medium)' }}>{step.title}</span>
            </div>
          ))}
        </div>
      )}
    </Link>
  )
}
