'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Edit,
  Trash2,
  Check,
  X,
  Lock,
  Mail,
  Briefcase,
  FolderKanban,
  FileText,
  CreditCard,
  Sparkles,
  Settings,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@/shared/utilities/api-client'
import type { AccessPolicy } from '@/lib/auth/server'

type ProjectItem = {
  id: string
  name: string
  status: string
}

type RoleItem = {
  id: string
  name: string
  description?: string | null
  permissions: AccessPolicy
}

type MemberItem = {
  id: string
  subTeamId: string
  profileId?: string | null
  name: string
  email: string
  designation?: string | null
  roleId?: string | null
  customPolicy?: AccessPolicy | null
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  role?: RoleItem | null
}

type SubTeamDetail = {
  id: string
  clientId: string
  name: string
  description?: string | null
  email: string
  status: 'ACTIVE' | 'INACTIVE'
  revokedByAdmin: boolean
  accessPolicy: AccessPolicy
  allowedProjects: string[]
  createdAt: string
  roles: RoleItem[]
  members: MemberItem[]
}

const ACCESS_COMPONENTS: { key: keyof AccessPolicy; label: string; description: string; icon: any }[] = [
  { key: 'projects', label: 'Project Visibility', description: 'View assigned project overview & details', icon: FolderKanban },
  { key: 'milestones', label: 'Milestones & Tasks', description: 'View project timelines and milestone status', icon: ShieldCheck },
  { key: 'approvals', label: 'Deliverable Approvals', description: 'Review and approve milestone deliverables', icon: Check },
  { key: 'invoices', label: 'Billing & Invoices', description: 'View invoices and payment receipts', icon: CreditCard },
  { key: 'subscriptions', label: 'Subscriptions & Plans', description: 'View subscription plan details', icon: Sparkles },
  { key: 'billing', label: 'Payment Settings', description: 'View payment methods and billing info', icon: CreditCard },
  { key: 'issues', label: 'Issue Tracking', description: 'View and report project issues', icon: ShieldAlert },
  { key: 'notes', label: 'Notes System', description: 'View and create project notes', icon: FileText },
]

export default function TeamDetailsManager({
  subTeam: initialSubTeam,
  clientProjects = [],
}: {
  subTeam: SubTeamDetail
  clientProjects: ProjectItem[]
}) {
  const router = useRouter()
  const [team, setTeam] = useState<SubTeamDetail>(initialSubTeam)
  const [isPending, setIsPending] = useState(false)

  // Edit Team Modal
  const [showEditTeamModal, setShowEditTeamModal] = useState(false)
  const [editName, setEditName] = useState(team.name)
  const [editDescription, setEditDescription] = useState(team.description || '')
  const [enableProjectAccess, setEnableProjectAccess] = useState(team.accessPolicy?.projects !== false)
  const [enableFinancialAccess, setEnableFinancialAccess] = useState(Boolean(team.accessPolicy?.invoices || team.accessPolicy?.subscriptions || team.accessPolicy?.billing))
  const [selectedAllowedProjects, setSelectedAllowedProjects] = useState<string[]>(team.allowedProjects || [])

  // Add Member Modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [memberName, setMemberName] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberDesignation, setMemberDesignation] = useState('')
  const [memberRoleId, setMemberRoleId] = useState<string>('')
  const [memberCustomPolicy, setMemberCustomPolicy] = useState<AccessPolicy>({
    projects: true,
    milestones: true,
    approvals: true,
    invoices: false,
    subscriptions: false,
    billing: false,
    issues: true,
    notes: true,
  })

  // Edit Member Access Scope Modal
  const [editingMember, setEditingMember] = useState<MemberItem | null>(null)
  const [editMemberPolicy, setEditMemberPolicy] = useState<AccessPolicy>({
    projects: true,
    milestones: true,
    approvals: true,
    invoices: false,
    subscriptions: false,
    billing: false,
    issues: true,
    notes: true,
  })

  // --- Handlers ---

  const handleUpdateTeamSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editName.trim()) {
      toast.error('Team name is required')
      return
    }

    setIsPending(true)
    try {
      const updatedPolicy: AccessPolicy = {
        projects: enableProjectAccess,
        milestones: enableProjectAccess,
        approvals: enableProjectAccess,
        invoices: enableProjectAccess && enableFinancialAccess,
        subscriptions: enableProjectAccess && enableFinancialAccess,
        billing: enableProjectAccess && enableFinancialAccess,
        issues: enableProjectAccess,
        notes: enableProjectAccess,
      }

      const updated = await apiClient.patch<SubTeamDetail>(`/api/client/team/${team.id}`, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        policy: updatedPolicy,
        allowedProjects: enableProjectAccess ? selectedAllowedProjects : [],
      })

      setTeam((prev) => ({
        ...prev,
        name: updated.name,
        description: updated.description,
        accessPolicy: updated.accessPolicy || updatedPolicy,
        allowedProjects: updated.allowedProjects || selectedAllowedProjects,
      }))

      toast.success('Team settings updated successfully')
      setShowEditTeamModal(false)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to update team settings')
    } finally {
      setIsPending(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberName.trim() || !memberEmail.trim()) {
      toast.error('Member name and email are required')
      return
    }

    setIsPending(true)
    try {
      const created = await apiClient.post<MemberItem>(`/api/client/team/${team.id}/members`, {
        name: memberName.trim(),
        email: memberEmail.trim().toLowerCase(),
        designation: memberDesignation.trim() || null,
        roleId: memberRoleId || null,
        customPolicy: memberCustomPolicy,
      })

      setTeam((prev) => ({
        ...prev,
        members: [created, ...(prev.members || [])],
      }))

      toast.success(`Member invited! Magic link sent to ${memberEmail}`)
      setShowAddMemberModal(false)
      setMemberName('')
      setMemberEmail('')
      setMemberDesignation('')
      setMemberRoleId('')
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to invite team member')
    } finally {
      setIsPending(false)
    }
  }

  const handleOpenEditMemberAccess = (m: MemberItem) => {
    setEditingMember(m)
    setEditMemberPolicy({
      projects: m.customPolicy?.projects !== false,
      milestones: m.customPolicy?.milestones !== false,
      approvals: m.customPolicy?.approvals !== false,
      invoices: Boolean(m.customPolicy?.invoices),
      subscriptions: Boolean(m.customPolicy?.subscriptions),
      billing: Boolean(m.customPolicy?.billing),
      issues: m.customPolicy?.issues !== false,
      notes: m.customPolicy?.notes !== false,
    })
  }

  const handleSaveMemberAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember) return

    setIsPending(true)
    try {
      const updated = await apiClient.put<MemberItem>(`/api/client/team/${team.id}/members/${editingMember.id}`, {
        customPolicy: editMemberPolicy,
      })

      setTeam((prev) => ({
        ...prev,
        members: prev.members.map((m) => (m.id === editingMember.id ? { ...m, ...updated, customPolicy: editMemberPolicy } : m)),
      }))

      toast.success(`Access scope updated for ${editingMember.name}`)
      setEditingMember(null)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to update member access scope')
    } finally {
      setIsPending(false)
    }
  }

  const handleToggleMemberStatus = async (m: MemberItem) => {
    const nextStatus = m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const actionName = nextStatus === 'INACTIVE' ? 'revoke access for' : 'restore access for'

    if (!confirm(`Are you sure you want to ${actionName} "${m.name}"?`)) return

    setIsPending(true)
    try {
      const updated = await apiClient.put<MemberItem>(`/api/client/team/${team.id}/members/${m.id}`, {
        status: nextStatus,
      })

      setTeam((prev) => ({
        ...prev,
        members: prev.members.map((mem) => (mem.id === m.id ? { ...mem, ...updated, status: nextStatus } : mem)),
      }))

      toast.success(`Member status set to ${nextStatus}`)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to update member status')
    } finally {
      setIsPending(false)
    }
  }

  const handleDeleteMember = async (m: MemberItem) => {
    if (!confirm(`Soft remove member "${m.name}" from this team?\n\nTheir history and activity logs will be preserved. You can re-invite them to any team later.`)) return

    setIsPending(true)
    try {
      await apiClient.delete(`/api/client/team/${team.id}/members/${m.id}`)
      setTeam((prev) => ({
        ...prev,
        members: prev.members.map((mem) => (mem.id === m.id ? { ...mem, status: 'INACTIVE' } : mem)),
      }))

      toast.success(`Member "${m.name}" soft removed. You can re-invite them to any team later.`)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to remove member')
    } finally {
      setIsPending(false)
    }
  }

  const isFinancialEnabled = Boolean(team.accessPolicy?.invoices || team.accessPolicy?.subscriptions || team.accessPolicy?.billing)
  const isProjectAccessEnabled = team.accessPolicy?.projects !== false

  return (
    <div className="space-y-6">
      {/* Top Header / Breadcrumb */}
      <div>
        <Link href="/client/teams" className="btn btn--ghost btn--sm mb-3" style={{ paddingLeft: 0 }}>
          <ArrowLeft size={16} /> Back to Teams
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-primary">{team.name}</h1>
              {team.revokedByAdmin ? (
                <span className="badge badge--danger"><ShieldAlert size={12} /> Revoked by Admin</span>
              ) : (
                <span className={`badge badge--${team.status === 'ACTIVE' ? 'success' : 'warning'}`}>
                  {team.status}
                </span>
              )}
            </div>
            {team.description && (
              <p className="text-sm text-secondary mt-1">{team.description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowEditTeamModal(true)}
            className="btn btn--secondary btn--sm"
          >
            <Settings size={15} /> Edit Team Scope
          </button>
        </div>
      </div>

      {/* Scope Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Project Access Boundary */}
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 font-semibold text-primary" style={{ fontSize: 'var(--text-sm)' }}>
              <FolderKanban size={18} style={{ color: 'var(--accent-primary)' }} />
              Project Access Boundary
            </div>
            <span className={`badge badge--${isProjectAccessEnabled ? 'success' : 'neutral'}`}>
              {isProjectAccessEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <p className="text-xs text-secondary mb-3">
            {isProjectAccessEnabled
              ? team.allowedProjects && team.allowedProjects.length > 0
                ? `Restricted to ${team.allowedProjects.length} selected project(s)`
                : 'Granted access to ALL client projects'
              : 'No project visibility granted to this team.'}
          </p>

          {isProjectAccessEnabled && team.allowedProjects && team.allowedProjects.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {team.allowedProjects.map((pId) => {
                const proj = clientProjects.find((p) => p.id === pId)
                return (
                  <span key={pId} className="badge" style={{ background: 'var(--bg-overlay)', color: 'var(--text-primary)', fontSize: 10 }}>
                    {proj ? proj.name : pId}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* Financial Data Access */}
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 font-semibold text-primary" style={{ fontSize: 'var(--text-sm)' }}>
              <CreditCard size={18} style={{ color: isFinancialEnabled ? 'var(--accent-success)' : 'var(--text-muted)' }} />
              Financial Data Access
            </div>
            <span className={`badge badge--${isFinancialEnabled ? 'warning' : 'neutral'}`}>
              {isFinancialEnabled ? 'Financial Data Accessible' : 'Restricted (Hidden)'}
            </span>
          </div>

          <p className="text-xs text-secondary">
            {isFinancialEnabled
              ? 'Members of this team can view client billing, invoices, and subscription plans.'
              : 'Sensitive financial information (Invoices, Subscriptions, Payments) is strictly hidden from this team.'}
          </p>
        </div>
      </div>

      {/* Team Members List Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-md font-semibold text-primary flex items-center gap-2">
              <Users size={18} /> Team Members ({team.members?.length || 0})
            </h2>
            <p className="text-xs text-secondary mt-1">
              Members invited to this sub-team log in via magic links sent to their email IDs and inherit this team’s access rules.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddMemberModal(true)}
            className="btn btn--primary btn--sm"
          >
            <UserPlus size={15} /> Add Team Member
          </button>
        </div>

        {!team.members || team.members.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
            <Users size={32} style={{ color: 'var(--text-muted)' }} />
            <div className="empty-state__title" style={{ fontSize: 'var(--text-sm)' }}>No team members added yet</div>
            <div className="empty-state__desc" style={{ fontSize: 'var(--text-xs)' }}>
              Click &quot;Add Team Member&quot; to insert member email IDs and send magic link invites.
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Login Email</th>
                  <th>Designation</th>
                  <th>Access Scope</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {team.members.map((m) => {
                  const policy = (m.customPolicy as Record<string, boolean> | null) || {}
                  const activePerms = ACCESS_COMPONENTS.filter((comp) => Boolean(policy[comp.key]))

                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="font-medium text-primary">{m.name}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-xs text-secondary">
                          <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                          {m.email}
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-secondary">{m.designation || '—'}</span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1" style={{ maxWidth: 260 }}>
                          {activePerms.map((p) => {
                            const Icon = p.icon
                            return (
                              <span
                                key={p.key}
                                className="badge"
                                style={{
                                  background: 'var(--bg-overlay)',
                                  color: 'var(--text-secondary)',
                                  fontSize: 9,
                                  padding: '1px 6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                }}
                              >
                                <Icon size={10} /> {p.label}
                              </span>
                            )
                          })}
                          {activePerms.length === 0 && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Inherit Team Scope</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge--${m.status === 'ACTIVE' ? 'success' : 'warning'}`}>
                          {m.status === 'ACTIVE' ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditMemberAccess(m)}
                            className="btn btn--ghost btn--xs"
                            title="Configure Component Access Scope"
                          >
                            <Settings size={13} /> Access Scope
                          </button>

                          {m.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              onClick={() => handleToggleMemberStatus(m)}
                              className="btn btn--secondary btn--xs text-warning"
                              disabled={isPending}
                              title="Revoke Member Access"
                            >
                              <ShieldOff size={13} /> Revoke
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleMemberStatus(m)}
                              className="btn btn--secondary btn--xs text-success"
                              disabled={isPending}
                              title="Restore Member Access"
                            >
                              <ShieldCheck size={13} /> Restore
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteMember(m)}
                            className="btn btn--ghost btn--xs text-danger"
                            disabled={isPending}
                            title="Delete Member"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Edit Team Scope */}
      {showEditTeamModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Team Access Scope</h2>
              <button type="button" onClick={() => setShowEditTeamModal(false)} className="btn btn--ghost btn--icon">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateTeamSettings}>
              <div className="modal-body space-y-4">
                <div className="form-group">
                  <label className="form-label">Team Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="form-input"
                    style={{ background: '#ffffff', color: '#0f172a' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="form-input"
                    style={{ background: '#ffffff', color: '#0f172a' }}
                    placeholder="e.g. QA testing & deliverable review team"
                  />
                </div>

                {/* 1. Project Access Decision */}
                <div style={{ padding: 'var(--space-3)', background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-primary text-xs">
                    <input
                      type="checkbox"
                      checked={enableProjectAccess}
                      onChange={(e) => setEnableProjectAccess(e.target.checked)}
                      style={{ accentColor: 'var(--accent-primary)', width: 16, height: 16 }}
                    />
                    Enable Project Access for this Team
                  </label>
                  <p className="text-xs text-secondary mt-1">
                    Allows members of this team to view project information and deliverables.
                  </p>

                  {enableProjectAccess && (
                    <div className="mt-3 space-y-2">
                      <label className="text-xs font-semibold text-secondary">Restrict to Specific Projects:</label>
                      <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {clientProjects.map((p) => {
                          const isChecked = selectedAllowedProjects.includes(p.id)
                          return (
                            <label key={p.id} className="flex items-center gap-2 text-xs text-primary cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAllowedProjects((prev) => [...prev, p.id])
                                  } else {
                                    setSelectedAllowedProjects((prev) => prev.filter((id) => id !== p.id))
                                  }
                                }}
                              />
                              <span>{p.name}</span>
                            </label>
                          )
                        })}
                        {clientProjects.length === 0 && (
                          <div className="text-xs text-muted">No projects created yet.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Financial Access Decision */}
                {enableProjectAccess && (
                  <div style={{ padding: 'var(--space-3)', background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-primary text-xs">
                      <input
                        type="checkbox"
                        checked={enableFinancialAccess}
                        onChange={(e) => setEnableFinancialAccess(e.target.checked)}
                        style={{ accentColor: 'var(--accent-primary)', width: 16, height: 16 }}
                      />
                      Enable Financial Data Access (Invoices, Subscriptions, Billing)
                    </label>
                    <p className="text-xs text-secondary mt-1">
                      If checked, team members can view payment receipts, invoices, and billing history.
                    </p>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowEditTeamModal(false)} className="btn btn--secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isPending} className="btn btn--primary">
                  {isPending ? 'Saving...' : 'Save Scope Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Team Member & Send Magic Link */}
      {showAddMemberModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2 className="modal-title flex items-center gap-2">
                <UserPlus size={18} /> Add Team Member
              </h2>
              <button type="button" onClick={() => setShowAddMemberModal(false)} className="btn btn--ghost btn--icon">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddMember}>
              <div className="modal-body space-y-4">
                <div className="form-group">
                  <label className="form-label">Member Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="form-input"
                    style={{ background: '#ffffff', color: '#0f172a' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Member Email Address * (Magic Link Delivered Here)</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. sarah@company.com"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    className="form-input"
                    style={{ background: '#ffffff', color: '#0f172a' }}
                  />
                  <p className="form-hint">
                    A personalized login magic link will be automatically sent to this email address.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Designation / Role Title</label>
                  <input
                    type="text"
                    placeholder="e.g. QA Lead / Designer"
                    value={memberDesignation}
                    onChange={(e) => setMemberDesignation(e.target.value)}
                    className="form-input"
                    style={{ background: '#ffffff', color: '#0f172a' }}
                  />
                </div>

                {/* Component Access Scope for Member */}
                <div className="form-group">
                  <label className="form-label">Member Component Access Scope</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                    {ACCESS_COMPONENTS.map((comp) => {
                      const Icon = comp.icon
                      const isChecked = Boolean(memberCustomPolicy[comp.key])
                      return (
                        <label
                          key={comp.key}
                          className="flex items-center gap-2 p-2 rounded cursor-pointer border text-xs"
                          style={{
                            borderColor: isChecked ? 'var(--accent-primary)' : 'var(--border-subtle)',
                            background: isChecked ? 'rgba(99, 102, 241, 0.08)' : '#ffffff',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              setMemberCustomPolicy((prev) => ({
                                ...prev,
                                [comp.key]: e.target.checked,
                              }))
                            }}
                          />
                          <Icon size={14} style={{ color: 'var(--accent-primary)' }} />
                          <span className="font-medium text-primary">{comp.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddMemberModal(false)} className="btn btn--secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isPending} className="btn btn--primary">
                  {isPending ? 'Sending Invite...' : 'Invite Member & Send Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Member Component Access Scope */}
      {editingMember && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="modal-title">Configure Member Access — {editingMember.name}</h2>
              <button type="button" onClick={() => setEditingMember(null)} className="btn btn--ghost btn--icon">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveMemberAccess}>
              <div className="modal-body space-y-3">
                <p className="text-xs text-secondary">
                  Specify which parts of the workspace and project components <strong>{editingMember.name}</strong> can access:
                </p>

                <div className="space-y-2">
                  {ACCESS_COMPONENTS.map((comp) => {
                    const Icon = comp.icon
                    const isChecked = Boolean(editMemberPolicy[comp.key])
                    return (
                      <label
                        key={comp.key}
                        className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer"
                        style={{
                          borderColor: isChecked ? 'var(--accent-primary)' : 'var(--border-subtle)',
                          background: isChecked ? 'rgba(99, 102, 241, 0.06)' : '#ffffff',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setEditMemberPolicy((prev) => ({
                              ...prev,
                              [comp.key]: e.target.checked,
                            }))
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-medium text-primary text-xs">
                            <Icon size={14} style={{ color: 'var(--accent-primary)' }} />
                            {comp.label}
                          </div>
                          <div className="text-xs text-muted mt-0.5">{comp.description}</div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setEditingMember(null)} className="btn btn--secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isPending} className="btn btn--primary">
                  {isPending ? 'Saving...' : 'Update Member Scope'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
