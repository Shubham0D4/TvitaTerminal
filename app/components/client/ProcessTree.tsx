import { Search, Brush, FileText, Code2, Rocket } from 'lucide-react'

export type ProcessUpdate = { id: string; content: string; createdAt: string }

/** Every project runs the same five stages, so the tracker reads the same way
 *  wherever it appears — the projects list and a single project alike. */
export const STAGES = [
  { name: 'Discovery & research', Icon: Search },
  { name: 'Design', Icon: Brush },
  { name: 'Quote & planning', Icon: FileText },
  { name: 'Crafting the Backend', Icon: Code2 },
  { name: 'Testing & launch', Icon: Rocket },
] as const

/** Which stage a project sits in, from its status and how far along it is. */
export function stageIndex(status: string, progress: number) {
  if (status === 'COMPLETED') return STAGES.length
  if (status === 'CLIENT_REVIEW') return 4
  if (progress >= 85) return 4
  if (progress >= 45) return 3
  if (progress >= 30) return 2
  if (progress >= 12) return 1
  return 0
}

/** Plain words for each stage — colour alone shouldn't carry the state. */
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
  /** Shown above the tree; hidden where the surrounding card already says it. */
  showHeading?: boolean
}

export default function ProcessTree({
  status,
  progress,
  updates,
  showHeading = true,
}: ProcessTreeProps) {
  const here = stageIndex(status, progress)

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
            // Finished stages shrink to their icon, which is what buys the
            // live stage room for a full-size title.
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
                key={stage.name}
                className={`pstep is-${key}`}
                aria-current={key === 'here' ? 'step' : undefined}
              >
                <span className="pstep__mark">
                  <Icon size={18} aria-hidden="true" />
                </span>

                {/* Done stages carry no visible title, so the state has to
                    reach a screen reader some other way. */}
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

          {/* The stage underway carries the three most recent updates. */}
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
