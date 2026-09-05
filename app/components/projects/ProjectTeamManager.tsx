'use client'

import { useState } from 'react'
import { UserPlus, UserMinus } from 'lucide-react'
import { apiClient } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import BentoClamp from '@/app/components/ui/BentoClamp'

interface TeamMemberRow {
  id: string
  profileId: string
  role: string
  profile: { id: string; name: string; email: string | null }
}

interface AgencyStaffRow {
  id: string
  name: string
  role: string
  teamRole: string | null
}

interface ProjectTeamManagerProps {
  projectId: string
  currentMembers: TeamMemberRow[]
  availableAgencyStaff: AgencyStaffRow[]
  isLeadOrAdmin: boolean
}

const SUBROLES = [
  { value: 'TEAM_LEAD', label: 'Team Lead' },
  { value: 'MEMBER', label: 'Team Member' },
]

const roleStyle = (role: string) => {
  switch (role) {
    case 'TEAM_LEAD':
      return { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }
    default:
      return { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' }
  }
}

export default function ProjectTeamManager({
  projectId,
  currentMembers,
  availableAgencyStaff,
  isLeadOrAdmin,
}: ProjectTeamManagerProps) {
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedRole, setSelectedRole] = useState('MEMBER')
  const [submitting, setSubmitting] = useState(false)

  const handleAddMember = async () => {
    if (!selectedMemberId) return
    setSubmitting(true)
    try {
      const res = await apiClient(`/api/admin/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({ profileId: selectedMemberId, role: selectedRole }),
      })
      if (res.success) {
        toast.success('Project member added.')
        setSelectedMemberId('')
        setSelectedRole('MEMBER')
        window.location.reload()
      } else {
        toast.error(res.error?.message || 'Failed to add member.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add member.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveMember = async (profileId: string) => {
    if (!confirm('Are you sure you want to remove this member from the project?')) {
      return
    }
    setSubmitting(true)
    try {
      const res = await apiClient(
        `/api/admin/projects/${projectId}/members?profileId=${profileId}`,
        { method: 'DELETE' }
      )
      if (res.success) {
        toast.success('Project member removed.')
        window.location.reload()
      } else {
        toast.error(res.error?.message || 'Failed to remove member.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove member.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateMemberRole = async (profileId: string, newRole: string) => {
    setSubmitting(true)
    try {
      const res = await apiClient(`/api/admin/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({ profileId, role: newRole }),
      })
      if (res.success) {
        toast.success('Member role updated.')
        window.location.reload()
      } else {
        toast.error(res.error?.message || 'Failed to update role.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update role.')
    } finally {
      setSubmitting(false)
    }
  }

  const memberProfileIds = new Set(currentMembers.map((m) => m.profileId))
  const unassignedStaff = availableAgencyStaff.filter((s) => !memberProfileIds.has(s.id))

  return (
    <div className="card pteam">
      <div className="flex items-center justify-between mb-4">
        <h2
          style={{
            fontSize: 'var(--text-md)',
            fontWeight: 'var(--font-semibold)',
            color: 'var(--text-primary)',
          }}
        >
          Project Team ({currentMembers.length})
        </h2>
      </div>

      {isLeadOrAdmin && unassignedStaff.length > 0 && (
        <div className="pteam__add">
          <div className="pteam__add-label">Add Member</div>
          <div className="flex gap-2 flex-col">
            <select
              className="form-select"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              style={{ fontSize: 'var(--text-xs)' }}
              disabled={submitting}
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
                disabled={submitting}
              >
                {SUBROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
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
        <BentoClamp maxHeight={220} moreLabel="Show more">
          <div className="pteam__list">
            {currentMembers.map((m) => {
              const rs = roleStyle(m.role)
              return (
                <div key={m.id} className="pteam__row">
                  <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                    <div className="pteam__avatar" aria-hidden>
                      {m.profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="pteam__name">{m.profile.name}</div>
                      {isLeadOrAdmin ? (
                        <select
                          className="form-select"
                          value={m.role}
                          disabled={submitting}
                          onChange={(e) => handleUpdateMemberRole(m.profileId, e.target.value)}
                          style={{
                            fontSize: '10px',
                            padding: '2px 18px 2px 6px',
                            height: 'auto',
                            width: 'auto',
                            background: '#ffffff',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: '1px solid var(--border-default)',
                            borderRadius: '8px',
                            fontFamily: 'inherit',
                            marginTop: 2,
                          }}
                        >
                          <option value="TEAM_LEAD">Team Lead</option>
                          <option value="MEMBER">Team Member</option>
                        </select>
                      ) : (
                        <span
                          className="badge"
                          style={{ fontSize: 9, background: rs.bg, color: rs.color, marginTop: 2 }}
                        >
                          {m.role.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {isLeadOrAdmin && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.profileId)}
                      disabled={submitting}
                      className="btn btn--ghost btn--xs"
                      style={{ color: 'var(--color-danger)', flexShrink: 0 }}
                      title="Remove from project"
                    >
                      <UserMinus size={14} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </BentoClamp>
      )}
    </div>
  )
}
