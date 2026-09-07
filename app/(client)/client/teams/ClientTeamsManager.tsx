'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Users, Plus, Trash2, Send, Copy, Check, X, Mail,
  UserCheck, Clock, AlertCircle, FolderKanban,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/utils/api-client'

type MemberItem = {
  id: string
  name: string
  email: string
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  profile?: {
    email?: string
    name?: string
    isActive?: boolean
    passwordHash?: string | null
    hasPassword?: boolean
  } | null
}

type ProjectItem = {
  id: string
  name: string
  status: string
}

type ExtraTeam = {
  id: string
  name: string
  status: string
  _count: { members: number }
}

type Props = {
  clientName: string
  teamId: string
  initialMembers: MemberItem[]
  projects: ProjectItem[]
  allowedProjectIds: string[]
  extraTeams: ExtraTeam[]
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d))
}

export default function ClientTeamsManager({
  clientName,
  teamId,
  initialMembers,
  projects,
  allowedProjectIds,
  extraTeams,
}: Props) {
  const [members, setMembers] = useState<MemberItem[]>(initialMembers)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [restrictProjects, setRestrictProjects] = useState(allowedProjectIds.length > 0)
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(allowedProjectIds)
  const [savedProjectIds, setSavedProjectIds] = useState<string[]>(allowedProjectIds)
  const [isSavingAccess, setIsSavingAccess] = useState(false)

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    startTransition(async () => {
      try {
        const created = await apiClient.post<MemberItem>('/api/client/members', {
          email: inviteEmail.trim(),
          name: inviteName.trim() || undefined,
        })
        setMembers(prev => [created, ...prev])
        toast.success(`Invitation sent to ${inviteEmail}!`)
        setInviteEmail('')
        setInviteName('')
        setShowInviteModal(false)
      } catch (err) {
        toast.error((err as Error)?.message || 'Failed to send invite')
      }
    })
  }

  const handleResend = async (member: MemberItem) => {
    try {
      const res = await apiClient.post<MemberItem>('/api/client/members', {
        email: member.email,
        name: member.name,
      })
      if (res) {
        toast.success(`Magic link resent to ${member.email}`)
      }
    } catch (err) {
      toast.error((err as Error)?.message || 'Failed to resend invite')
    }
  }

  const copyLink = (email: string, memberId: string) => {
    const url = `${window.location.origin}/login?email=${encodeURIComponent(email)}`
    navigator.clipboard.writeText(url).catch(() => {})
    setCopiedId(memberId)
    toast.success('Login link copied!')
    setTimeout(() => setCopiedId(null), 3000)
  }

  const handleRemove = async (member: MemberItem) => {
    if (!confirm(`Remove ${member.name || member.email} from your team?`)) return
    try {
      await apiClient.delete(`/api/client/members/${member.id}`)
      setMembers(prev => prev.filter(m => m.id !== member.id))
      toast.success('Member removed')
    } catch (err) {
      toast.error((err as Error)?.message || 'Failed to remove member')
    }
  }

  const toggleProject = (id: string, checked: boolean) => {
    setSelectedProjectIds((prev) => (
      checked ? [...prev, id] : prev.filter((projectId) => projectId !== id)
    ))
  }

  const handleSaveProjectAccess = async () => {
    if (restrictProjects && selectedProjectIds.length === 0) {
      toast.error('Select at least one project, or allow all projects.')
      return
    }

    setIsSavingAccess(true)
    try {
      const nextIds = restrictProjects ? selectedProjectIds : []
      const updated = await apiClient.patch<{ allowedProjects?: string[] }>(`/api/client/team/${teamId}`, {
        allowedProjects: nextIds,
      })
      const saved = Array.isArray(updated.allowedProjects) ? updated.allowedProjects : nextIds
      setSavedProjectIds(saved)
      setSelectedProjectIds(saved)
      setRestrictProjects(saved.length > 0)
      toast.success(saved.length > 0
        ? `Team can access ${saved.length} selected project${saved.length === 1 ? '' : 's'}`
        : 'Team can access all projects')
    } catch (err) {
      toast.error((err as Error)?.message || 'Failed to update project access')
    } finally {
      setIsSavingAccess(false)
    }
  }

  const accessDirty =
    restrictProjects !== savedProjectIds.length > 0
    || (restrictProjects && (
      selectedProjectIds.length !== savedProjectIds.length
      || selectedProjectIds.some((id) => !savedProjectIds.includes(id))
    ))

  const activeCount = members.filter(m => m.status === 'ACTIVE').length
  const pendingCount = members.filter(m => m.status === 'ACTIVE' && !m.profile?.hasPassword && !m.profile?.passwordHash).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      <div className="page-header flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-header__title">Team</h1>
            <span className="badge" style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--accent-primary)', fontWeight: 600 }}>
              {activeCount} Active
              {pendingCount > 0 && <span style={{ marginLeft: 4, color: '#f59e0b' }}>· {pendingCount} Pending</span>}
            </span>
          </div>
          <p className="page-header__subtitle">
            Invite colleagues from {clientName} to your projects. Invoices and billing stay with you.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          className="btn btn--primary"
          style={{ gap: 6, flexShrink: 0 }}
        >
          <Plus size={16} /> Invite Member
        </button>
      </div>

      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
      }}>
        <AlertCircle size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
          Teammates can open projects, notes, tickets, and milestones. They <strong>cannot</strong> see invoices, billing, or subscriptions.
        </p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3" style={{ gap: 12 }}>
          <div className="flex items-center gap-2" style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
            <FolderKanban size={18} style={{ color: 'var(--accent-primary)' }} />
            Project access
          </div>
          <span className="badge" style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)', fontSize: 11 }}>
            {savedProjectIds.length > 0
              ? `${savedProjectIds.length} project${savedProjectIds.length === 1 ? '' : 's'}`
              : 'All projects'}
          </span>
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '0 0 var(--space-4)' }}>
          Choose which projects teammates can see. Leave this off to share every current and future project.
        </p>

        <label className="flex items-center gap-2" style={{ fontSize: 'var(--text-sm)', cursor: 'pointer', marginBottom: restrictProjects ? 12 : 0 }}>
          <input
            type="checkbox"
            checked={restrictProjects}
            onChange={(e) => setRestrictProjects(e.target.checked)}
            style={{ accentColor: 'var(--accent-primary)', width: 16, height: 16 }}
          />
          Restrict to selected projects
        </label>

        {restrictProjects && (
          <div style={{
            maxHeight: 220,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: 'var(--space-3)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-elevated)',
          }}>
            {projects.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>No projects yet. New projects stay hidden until you add them here.</p>
            ) : projects.map((project) => (
              <label key={project.id} className="flex items-center gap-2" style={{ fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedProjectIds.includes(project.id)}
                  onChange={(e) => toggleProject(project.id, e.target.checked)}
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
                <span>{project.name}</span>
              </label>
            ))}
          </div>
        )}

        {accessDirty && (
          <div className="flex justify-end" style={{ marginTop: 'var(--space-4)' }}>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={handleSaveProjectAccess}
              disabled={isSavingAccess}
            >
              {isSavingAccess ? 'Saving…' : 'Save project access'}
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {members.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
            <Users size={32} style={{ color: 'var(--text-muted)' }} />
            <div className="empty-state__title">No team members yet</div>
            <div className="empty-state__desc">Invite colleagues to give them access to your projects.</div>
            <button type="button" onClick={() => setShowInviteModal(true)} className="btn btn--primary mt-4">
              <Plus size={15} /> Send First Invite
            </button>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Email</th>
                  <th>Invited</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => {
                  const hasLoggedIn = Boolean(member.profile?.hasPassword ?? member.profile?.passwordHash)
                  const isPendingAccept = !hasLoggedIn && member.status === 'ACTIVE'

                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: hasLoggedIn ? 'var(--accent-primary)' : 'rgba(99,102,241,0.15)',
                            color: hasLoggedIn ? '#fff' : 'var(--accent-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700, flexShrink: 0,
                          }}>
                            {getInitials(member.name)}
                          </div>
                          <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                            {member.name}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                          <Mail size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          {member.email}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {formatDate(member.createdAt)}
                        </span>
                      </td>
                      <td>
                        {hasLoggedIn ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                            background: 'rgba(16,185,129,0.1)', color: '#10b981',
                          }}>
                            <UserCheck size={11} /> Active
                          </span>
                        ) : isPendingAccept ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                            background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                          }}>
                            <Clock size={11} /> Invite Pending
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                            background: 'rgba(100,116,139,0.1)', color: '#64748b',
                          }}>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          {isPendingAccept && (
                            <button
                              type="button"
                              onClick={() => handleResend(member)}
                              className="btn btn--ghost btn--xs"
                              style={{ gap: 3, color: 'var(--accent-primary)' }}
                              title="Resend magic link"
                            >
                              <Send size={12} /> Resend
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => copyLink(member.email, member.id)}
                            className="btn btn--ghost btn--xs"
                            title="Copy login link"
                          >
                            {copiedId === member.id ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemove(member)}
                            className="btn btn--ghost btn--xs"
                            style={{ color: 'var(--color-danger)' }}
                            title="Remove member"
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

      {extraTeams.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginBottom: 8 }}>Other teams</h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 12 }}>
            Additional teams set up for this organisation.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {extraTeams.map((team) => (
              <Link
                key={team.id}
                href={`/client/teams/${team.id}`}
                className="flex items-center justify-between"
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{team.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {team._count.members} member{team._count.members === 1 ? '' : 's'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 420, width: '95%' }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Invite a Team Member</h2>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                  A magic sign-in link will be emailed to them.
                </p>
              </div>
              <button type="button" onClick={() => setShowInviteModal(false)} className="btn btn--ghost btn--icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-5)' }}>
              <div className="form-group">
                <label className="form-label">Email Address <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="form-input"
                    style={{ paddingLeft: 36 }}
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="Their name (auto-filled from email if blank)"
                  className="form-input"
                />
              </div>

              <div style={{
                background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
                fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6,
              }}>
                ✓ Access to assigned projects, notes, tickets, and milestones<br />
                ✗ Cannot see invoices, billing, or subscriptions
              </div>

              <div className="flex items-center justify-end gap-3" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
                <button type="button" onClick={() => setShowInviteModal(false)} className="btn btn--ghost">Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={isPending || !inviteEmail.trim()} style={{ gap: 6 }}>
                  <Send size={14} />
                  {isPending ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
