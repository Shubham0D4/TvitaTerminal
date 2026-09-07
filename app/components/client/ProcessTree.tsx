import { Search, Brush, FileText, Code2, Rocket } from 'lucide-react'
import {
  PROCESS_STAGES,
  stageIndexFromMilestones,
  type StageMilestone,
} from '@/lib/process/stages'

export type ProcessUpdate = { id: string; content: string; createdAt: string }

export const STAGES = PROCESS_STAGES.map((stage, index) => ({
  ...stage,
  Icon: [Search, Brush, FileText, Code2, Rocket][index],
}))

/** Fallback when a page has not loaded milestones yet. Prefer `stageIndexFromMilestones`. */
export function stageIndex(status: string, progress: number) {
  if (status === 'COMPLETED') return STAGES.length
  if (status === 'CLIENT_REVIEW') return 4
  if (progress >= 85) return 4
  if (progress >= 45) return 3
  if (progress >= 30) return 2
  if (progress >= 12) return 1
  return 0
}

const STAGE_STATE = {
  done: 'Done',
  here: 'In progress',
  next: 'Not started',
} as const

const STAMP = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

interface ProcessTreeProps {
  status: string
  progress: number
  updates: ProcessUpdate[]
  milestones?: StageMilestone[]
  /** Shown above the tree; hidden where the surrounding card already says it. */
  showHeading?: boolean
}

export default function ProcessTree({
  status,
  progress,
  updates,
  milestones,
  showHeading = true,
}: ProcessTreeProps) {
  const here =
    milestones !== undefined
      ? stageIndexFromMilestones(milestones, status)
      : stageIndex(status, progress)

  return (
    <>
      {showHeading && (
        <p className="proc__stage">
          {here === STAGES.length
            ? 'All stages complete'
            : `Stage ${here + 1} of ${STAGES.length} · in progress`}
        </p>
      )}

      <div className="proc__scroll">
        <div
          className="proc__tree"
          style={{
            gridTemplateColumns: STAGES.map((_, position) =>
              position < here ? '62px' : 'minmax(0, 1fr)',
            ).join(' '),
          }}
        >
          {STAGES.map((stage, position) => {
            const key = position < here ? 'done' : position === here ? 'here' : 'next'
            const { Icon } = stage

            return (
              <div
                key={stage.key}
                className={`pstep is-${key}`}
                aria-current={key === 'here' ? 'step' : undefined}
              >
                <span className="pstep__mark">
                  <Icon size={18} aria-hidden="true" />
                </span>

                {key === 'done' ? (
                  <span className="pstep__sr">{stage.name} · Done</span>
                ) : (
                  <>
                    <span className="pstep__label">{stage.name}</span>
                    <span className="pstep__meta">{STAGE_STATE[key]}</span>
                  </>
                )}
              </div>
            )
          })}

          {here < STAGES.length && updates.length > 0 && (
            <div className="proc__branch" style={{ gridColumn: `${here + 1} / -1` }}>
              <ul className="proc__feed">
                {updates.slice(0, 3).map((update, order) => (
                  <li key={update.id} className={`upd${order === 0 ? ' is-latest' : ''}`}>
                    <span className="upd__text">{update.content}</span>
                    <time className="upd__time" dateTime={update.createdAt}>
                      {STAMP.format(new Date(update.createdAt))}
                    </time>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
