'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface AdminProjectStatusSelectorProps {
  projectId: string
  currentStatus: string
  isLeadOrAdmin: boolean
}

const STATUS_OPTIONS = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'CLIENT_REVIEW', label: 'In Review' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function AdminProjectStatusSelector({
  projectId,
  currentStatus,
  isLeadOrAdmin,
}: AdminProjectStatusSelectorProps) {
  const [status, setStatus] = useState(currentStatus)
  const [updating, setUpdating] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus)
    setUpdating(true)
    try {
      await apiClient(`/api/admin/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      })
      toast.success('Project status updated successfully.')
      window.location.reload()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update project status.')
    } finally {
      setUpdating(false)
    }
  }

  if (!isLeadOrAdmin) {
    const label = STATUS_OPTIONS.find((opt) => opt.value === currentStatus)?.label || currentStatus
    const tone = currentStatus === 'COMPLETED' ? 'green' : currentStatus === 'IN_PROGRESS' ? 'amber' : 'slate'
    return (
      <span className={`badge badge--${tone}`} style={{ fontSize: 'var(--text-xs)', padding: '6px 12px', borderRadius: '12px' }}>
        {label}
      </span>
    )
  }

  return (
    <select
      className="form-select"
      value={status}
      onChange={(e) => handleStatusChange(e.target.value)}
      disabled={updating}
      style={{
        fontSize: 'var(--text-xs)',
        padding: '4px 24px 4px 12px',
        borderRadius: '12px',
        height: 'auto',
        width: 'auto',
        background: '#ffffff',
        fontWeight: 600,
        cursor: 'pointer',
        border: '1px solid var(--border-default)',
        fontFamily: 'inherit',
      }}
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
