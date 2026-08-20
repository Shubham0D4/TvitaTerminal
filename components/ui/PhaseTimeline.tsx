import React from 'react'
import { CheckCircle2, Clock, Circle } from 'lucide-react'

export interface TimelinePhase {
  id: string
  title: string
  description?: string | null
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PLANNED'
  dueDate?: string | null
}

interface PhaseTimelineProps {
  phases: TimelinePhase[]
}

export function PhaseTimeline({ phases }: PhaseTimelineProps) {
  if (!phases || phases.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
      {phases.map((phase, idx) => {
        const isLast = idx === phases.length - 1
        const isDone = phase.status === 'COMPLETED'
        const isActive = phase.status === 'IN_PROGRESS'

        const iconColor = isDone ? '#1E6B50' : isActive ? '#8A6A0B' : 'var(--text-disabled)'
        const iconBg = isDone ? '#DFF0E8' : isActive ? '#FFF3D6' : 'var(--bg-muted)'

        return (
          <div key={phase.id} style={{ display: 'flex', gap: 'var(--space-4)', position: 'relative' }}>
            {/* Timeline Vertical Track & Marker */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: iconBg,
                  color: iconColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  flexShrink: 0,
                }}
              >
                {isDone ? (
                  <CheckCircle2 size={16} />
                ) : isActive ? (
                  <Clock size={16} />
                ) : (
                  <Circle size={14} />
                )}
              </div>
              {!isLast && (
                <div
                  style={{
                    width: '2px',
                    flex: 1,
                    minHeight: '28px',
                    backgroundColor: isDone ? '#1E6B50' : 'var(--border-subtle)',
                    margin: '4px 0',
                  }}
                />
              )}
            </div>

            {/* Content Body */}
            <div style={{ paddingBottom: isLast ? 0 : 'var(--space-6)', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                <h4
                  style={{
                    fontSize: 'var(--text-base)',
                    fontWeight: isDone || isActive ? 'var(--font-bold)' : 'var(--font-medium)',
                    color: isDone ? '#1E6B50' : isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    margin: 0,
                  }}
                >
                  {phase.title}
                </h4>
                {phase.dueDate && (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {new Date(phase.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              {phase.description && (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
                  {phase.description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
