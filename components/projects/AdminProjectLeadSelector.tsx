'use client'

import { useState } from 'react'
import { apiClient } from '@/shared/utilities/api-client'
import toast from 'react-hot-toast'

interface AdminProjectLeadSelectorProps {
  projectId: string
  currentLeadId: string | null
  availableLeads: { id: string; name: string }[]
}

export default function AdminProjectLeadSelector({
  projectId,
  currentLeadId,
  availableLeads,
}: AdminProjectLeadSelectorProps) {
  const [selectedLeadId, setSelectedLeadId] = useState(currentLeadId || '')
  const [updating, setUpdating] = useState(false)

  const handleChangeLead = async (newLeadId: string) => {
    setSelectedLeadId(newLeadId)
    if (!newLeadId) return

    setUpdating(true)
    try {
      const res = await apiClient(`/api/team/projects/${projectId}/lead`, {
        method: 'PUT',
        body: JSON.stringify({ leadId: newLeadId }),
      })
      if (res.success) {
        toast.success('Project lead updated.')
        window.location.reload()
      } else {
        toast.error(res.error?.message || 'Failed to update project lead.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update project lead.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Project Lead</div>
      <select
        className="form-select"
        value={selectedLeadId}
        onChange={(e) => handleChangeLead(e.target.value)}
        disabled={updating}
        style={{ fontSize: 'var(--text-xs)', marginTop: 4, padding: '4px 8px' }}
      >
        <option value="">Select Project Lead</option>
        {availableLeads.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>
    </div>
  )
}
