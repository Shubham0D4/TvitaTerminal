'use client'

import { useTransition } from 'react'
import { PlayCircle, CheckCircle2, PauseCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { updateMilestoneStatus } from '@/app/(admin)/admin/projects/milestoneActions'

interface Props {
  milestoneId: string
  currentStatus: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'
}

export default function MilestoneStatusButton({ milestoneId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition()

  const update = (status: Parameters<typeof updateMilestoneStatus>[1]) => {
    startTransition(async () => {
      const res = await updateMilestoneStatus(milestoneId, status)
      if (res.success) toast.success(res.message)
      else toast.error(res.message)
    })
  }

  if (currentStatus === 'COMPLETED') {
    return <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>✓ Done</span>
  }

  return (
    <div className="flex items-center gap-1">
      {currentStatus === 'PLANNED' && (
        <button
          className="btn btn--ghost btn--xs"
          onClick={() => update('IN_PROGRESS')}
          disabled={isPending}
          title="Start working"
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: '#f59e0b' }}
        >
          <PlayCircle size={13} /> Start
        </button>
      )}
      {currentStatus === 'IN_PROGRESS' && (
        <>
          <button
            className="btn btn--ghost btn--xs"
            onClick={() => update('PLANNED')}
            disabled={isPending}
            title="Pause"
            style={{ fontSize: 'var(--text-xs)', color: '#64748b' }}
          >
            <PauseCircle size={13} />
          </button>
          <button
            className="btn btn--ghost btn--xs"
            onClick={() => update('COMPLETED')}
            disabled={isPending}
            title="Mark complete"
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: '#10b981' }}
          >
            <CheckCircle2 size={13} /> Complete
          </button>
        </>
      )}
    </div>
  )
}
