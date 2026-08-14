'use client'

import { useState } from 'react'
import { ShieldOff, ShieldCheck, Trash2, Plus, Users, FolderKanban, FileText, CreditCard, Sparkles, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import type { ClientSubTeam } from '@prisma/client'
import type { AccessPolicy } from '@/lib/auth/server'

const PERMISSION_TAGS: { key: keyof AccessPolicy; label: string; icon: typeof FolderKanban }[] = [
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'milestones', label: 'Milestones', icon: ShieldCheck },
  { key: 'approvals', label: 'Approvals', icon: ShieldCheck },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'invoices', label: 'Invoices', icon: CreditCard },
  { key: 'subscriptions', label: 'Subscriptions', icon: Sparkles },
  { key: 'billing', label: 'Billing', icon: CreditCard },
]

export default function AdminSubTeamsSection({
  clientId,
  subTeams: initialTeams = [],
}: {
  clientId?: string
  subTeams?: ClientSubTeam[]
}) {
  const [teams, setTeams] = useState<ClientSubTeam[]>(initialTeams)
  const [isPending, setIsPending] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')

  const cId = clientId || (teams.length > 0 ? teams[0].clientId : '')

  const handleRevoke = async (team: ClientSubTeam) => {
    if (!confirm(`Revoke access for sub-team "${team.name}"? This team member will be immediately suspended and barred from portal access.`)) return

    setIsPending(true)
    try {
      const updated = await apiClient.patch<ClientSubTeam>(`/api/admin/clients/${team.clientId}/subteams/${team.id}`, {
        revokedByAdmin: true,
      })

      setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, ...updated, revokedByAdmin: true, status: 'SUSPENDED' } : t)))
      toast.success(`Sub-team access for ${team.name} has been revoked.`)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to revoke sub-team access')
    } finally {
      setIsPending(false)
    }
  }

  const handleRestore = async (team: ClientSubTeam) => {
    if (!confirm(`Restore access for sub-team "${team.name}"? This will reactivate the account.`)) return

    setIsPending(true)
    try {
      const updated = await apiClient.patch<ClientSubTeam>(`/api/admin/clients/${team.clientId}/subteams/${team.id}`, {
        revokedByAdmin: false,
      })

      setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, ...updated, revokedByAdmin: false, status: 'ACTIVE' } : t)))
      toast.success(`Sub-team access for ${team.name} has been restored.`)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to restore sub-team access')
    } finally {
      setIsPending(false)
    }
  }

  const handleDelete = async (team: ClientSubTeam) => {
    if (!confirm(`Permanently delete sub-team record "${team.name}"?`)) return

    setIsPending(true)
    try {
      await apiClient.delete<{ deleted: boolean }>(`/api/admin/clients/${team.clientId}/subteams/${team.id}`)
      setTeams((prev) => prev.filter((t) => t.id !== team.id))
      toast.success('Sub-team record deleted.')
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to delete sub-team')
    } finally {
      setIsPending(false)
    }
  }

  const handleAddSubTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addName.trim() || !addEmail.trim() || !cId) {
      toast.error('Name and Email are required.')
      return
    }

    setIsPending(true)
    try {
      const created = await apiClient.post<ClientSubTeam>(`/api/admin/clients/${cId}/subteams`, {
        name: addName.trim(),
        email: addEmail.trim(),
      })

      setTeams((prev) => [created, ...prev])
      toast.success(`Sub-team account "${addName}" created for client. Invitation sent.`)
      setShowAddModal(false)
      setAddName('')
      setAddEmail('')
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to create sub-team')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
            Client Sub-Teams &amp; User Accounts ({teams.length})
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
            Sub-team accounts created by client or admin. Admins can revoke or restore access at any time.
          </p>
        </div>

        {cId && (
          <button type="button" onClick={() => setShowAddModal(true)} className="btn btn--ghost btn--sm">
            <Plus size={14} /> Add Sub-Team
          </button>
        )}
      </div>

      {teams.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
          <Users size={24} style={{ color: 'var(--text-muted)' }} />
          <div className="empty-state__title" style={{ fontSize: 'var(--text-sm)' }}>No sub-teams created</div>
          <div className="empty-state__desc" style={{ fontSize: 'var(--text-xs)' }}>
            The client has not created any sub-team accounts yet.
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Member Name</th>
                <th>Login Email</th>
                <th>Access Scope</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => {
                const policy = (team.accessPolicy as Partial<AccessPolicy>) ?? {}
                const activePerms = PERMISSION_TAGS.filter((pt) => Boolean(policy[pt.key]))

                return (
                  <tr key={team.id}>
                    <td>
                      <div style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>{team.name}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{team.email}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 260 }}>
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
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>None</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {team.revokedByAdmin ? (
                        <span className="badge badge--danger">Revoked by Admin</span>
                      ) : (
                        <span className={`badge badge--${team.status === 'ACTIVE' ? 'success' : 'warning'}`}>
                          {team.status.charAt(0) + team.status.slice(1).toLowerCase()}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        {team.revokedByAdmin ? (
                          <button
                            type="button"
                            className="btn btn--secondary btn--xs"
                            onClick={() => handleRestore(team)}
                            disabled={isPending}
                          >
                            <ShieldCheck size={12} /> Restore
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--danger btn--xs"
                            onClick={() => handleRevoke(team)}
                            disabled={isPending}
                          >
                            <ShieldOff size={12} /> Revoke
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn--ghost btn--xs text-danger"
                          onClick={() => handleDelete(team)}
                          disabled={isPending}
                          title="Delete Sub-Team Record"
                        >
                          <Trash2 size={12} />
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

      {/* Admin Add Sub-Team Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 className="modal-title">Provision Sub-Team Account</h2>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn btn--ghost btn--icon">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddSubTeam}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Member Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. john@company.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn--secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isPending} className="btn btn--primary">
                  {isPending ? 'Creating...' : 'Provision Sub-Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
