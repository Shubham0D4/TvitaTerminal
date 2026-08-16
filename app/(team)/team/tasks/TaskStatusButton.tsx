'use client'

import { useState } from 'react'
import { apiClient } from '@/shared/utilities/api-client'
import toast from 'react-hot-toast'
import type { TaskStatus } from '@prisma/client'

interface TaskStatusButtonProps {
  taskId: string
  currentStatus: TaskStatus
  userRole?: string
  teamRole?: string | null
}

const ALL_STATUSES: { label: string; value: TaskStatus }[] = [
  { label: 'To Do', value: 'TODO' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Ready For Testing', value: 'READY_FOR_TESTING' },
  { label: 'In Testing', value: 'IN_TESTING' },
  { label: 'Changes Required', value: 'CHANGES_REQUIRED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Blocked', value: 'BLOCKED' },
]

export default function TaskStatusButton({
  taskId,
  currentStatus,
  userRole,
  teamRole,
}: TaskStatusButtonProps) {
  const [isPending, setIsPending] = useState(false)

  const handleStatusChange = async (nextStatus: TaskStatus) => {
    setIsPending(true)
    const res = await apiClient(`/api/team/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: nextStatus }),
    })
    setIsPending(false)

    if (res.success) {
      toast.success('Task status updated.')
      window.location.reload()
    } else {
      toast.error(res.error?.message || 'Failed to update task status.')
    }
  }

  // Developer Quick Controls
  if (teamRole === 'DEVELOPER') {
    return (
      <div style={{ display: 'flex', gap: '4px' }}>
        {currentStatus === 'TODO' && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleStatusChange('IN_PROGRESS')}
            className="btn btn--primary btn--xs"
            style={{ fontSize: 10, padding: '2px 6px' }}
          >
            Start Work
          </button>
        )}
        {(currentStatus === 'IN_PROGRESS' || currentStatus === 'CHANGES_REQUIRED') && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleStatusChange('READY_FOR_TESTING')}
            className="btn btn--primary btn--xs"
            style={{ fontSize: 10, padding: '2px 6px', background: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}
          >
            Submit to QA →
          </button>
        )}
      </div>
    )
  }

  // Tester Quick Controls
  if (teamRole === 'TESTER') {
    return (
      <div style={{ display: 'flex', gap: '4px' }}>
        {currentStatus === 'READY_FOR_TESTING' && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleStatusChange('IN_TESTING')}
            className="btn btn--primary btn--xs"
            style={{ fontSize: 10, padding: '2px 6px' }}
          >
            Start Testing
          </button>
        )}
        {currentStatus === 'IN_TESTING' && (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleStatusChange('COMPLETED')}
              className="btn btn--success btn--xs"
              style={{ fontSize: 10, padding: '2px 6px', background: 'var(--color-success)', color: '#fff' }}
            >
              ✓ Pass QA
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleStatusChange('CHANGES_REQUIRED')}
              className="btn btn--danger btn--xs"
              style={{ fontSize: 10, padding: '2px 6px', background: 'var(--color-danger)', color: '#fff' }}
            >
              ✕ Fail QA
            </button>
          </>
        )}
      </div>
    )
  }

  // Admin / Team Lead Dropdown Control
  return (
    <select
      value={currentStatus}
      disabled={isPending}
      onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
      className="form-input"
      style={{
        fontSize: 11,
        padding: '2px 6px',
        height: 'auto',
        width: 'auto',
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {ALL_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  )
}
