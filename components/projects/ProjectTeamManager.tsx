'use client'

import { useState } from 'react'
import { UserPlus, UserMinus } from 'lucide-react'
import { apiClient } from '@/shared/utilities/api-client'
import toast from 'react-hot-toast'

interface ProjectTeamManagerProps {
  projectId: string
  currentMembers: any[]
  availableAgencyStaff: any[]
  isLeadOrAdmin: boolean
}

const SUBROLES = [
  { value: 'TEAM_LEAD', label: 'Team Lead' },
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'TESTER', label: 'QA Tester' },
  { value: 'MEMBER', label: 'Member' },
]

const roleStyle = (role: string) => {
  switch (role) {
    case 'TEAM_LEAD': return { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }
    case 'DEVELOPER': return { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' }
    case 'TESTER': return { bg: 'rgba(16,185,129,0.15)', color: '#10b981' }
    default: return { bg: 'rgba(107,114,128,0.12)', color: '#64748b' }
  }
}

export default function ProjectTeamManager({
  projectId,
  currentMembers,
  availableAgencyStaff,
  isLeadOrAdmin,
}: ProjectTeamManagerProps) {
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedRole, setSelectedRole] = useState('DEVELOPER')
  const [submitting, setSubmitting] = useState(false)

  const handleAddMember = async () => {
    if (!selectedMemberId) return
    setSubmitting(true)
    const res = await apiClient(`/api/team/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ profileId: selectedMemberId, role: selectedRole }),
    })
    setSubmitting(false)

    if (res.success) {
      toast.success('Project member added.')
      setSelectedMemberId('')
      setSelectedRole('DEVELOPER')
      window.location.reload()
    } else {
      toast.error(res.error?.message || 'Failed to add member.')
    }
  }

  const handleRemoveMember = async (profileId: string) => {
    setSubmitting(true)
    const res = await apiClient(`/api/team/projects/${projectId}/members?profileId=${profileId}`, {
      method: 'DELETE',
    })
    setSubmitting(false)

    if (res.success) {
      toast.success('Project member removed.')
      window.location.reload()
    } else {
      toast.error(res.error?.message || 'Failed to remove member.')
    }
  }

  // Filter members who are not yet on this project team
  const memberProfileIds = new Set(currentMembers.map((m) => m.profileId))
  const unassignedStaff = availableAgencyStaff.filter((s) => !memberProfileIds.has(s.id))

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
          Project Team ({currentMembers.length})
        </h2>
      </div>

      {/* Add Member Panel (Lead / Admin only) */}
      {isLeadOrAdmin && unassignedStaff.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Add Member
          </div>
          <div className="flex gap-2 flex-col">
            <select
              className="form-select"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              style={{ fontSize: 'var(--text-xs)' }}
            >
              <option value="">Select member to add…</option>
              {unassignedStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role === 'ADMIN' ? 'Admin' : 'Member'})
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <select
                className="form-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{ fontSize: 'var(--text-xs)', flex: 1 }}
              >
                {SUBROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={handleAddMember}
                disabled={!selectedMemberId || submitting}
              >
                <UserPlus size={14} />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {currentMembers.length === 0 ? (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          No members assigned to this project yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {currentMembers.map((m) => {
            const rs = roleStyle(m.role)
            return (
              <div key={m.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'var(--accent-primary-muted)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--font-bold)',
                      flexShrink: 0,
                    }}
                  >
                    {m.profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                      {m.profile.name}
                    </div>
                    <span className="badge" style={{ fontSize: 9, background: rs.bg, color: rs.color, marginTop: 2 }}>
                      {m.role.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {isLeadOrAdmin && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(m.profileId)}
                    disabled={submitting}
                    className="btn btn--ghost btn--xs"
                    style={{ color: 'var(--color-danger)' }}
                    title="Remove from project"
                  >
                    <UserMinus size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
