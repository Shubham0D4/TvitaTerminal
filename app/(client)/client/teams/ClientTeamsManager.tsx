'use client'

import { useState, useTransition } from 'react'
import {
  Users, Plus, Trash2, Send, Copy, Check, X, Mail,
  UserCheck, Clock, AlertCircle,
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
  } | null
}

type Props = {
  clientName: string
  initialMembers: MemberItem[]
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d))
}

export default function ClientTeamsManager({ clientName, initialMembers }: Props) {
  const [members, setMembers] = useState<MemberItem[]>(initialMembers)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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
      // Resend via re-invite
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

  const activeCount = members.filter(m => m.status === 'ACTIVE').length
  const pendingCount = members.filter(m => m.status === 'ACTIVE' && !m.profile?.passwordHash).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* Header */}
      <div className="page-header flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-header__title">Team Members</h1>
            <span className="badge" style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--accent-primary)', fontWeight: 600 }}>
              {activeCount} Active
              {pendingCount > 0 && <span style={{ marginLeft: 4, color: '#f59e0b' }}>· {pendingCount} Pending</span>}
            </span>
          </div>
          <p className="page-header__subtitle">
            Invite colleagues from {clientName} to access your projects. They'll receive a magic link to sign in instantly.
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

      {/* Info card */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
      }}>
        <AlertCircle size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
          Invited members can view all projects and communicate via notes, but <strong>cannot access invoices, billing, or subscription details</strong>. A magic link will be emailed to them for instant sign-in.
        </p>
      </div>

      {/* Members list */}
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
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr auto',
              gap: 12,
              padding: '10px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Member</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</span>
            </div>

            {members.map(member => {
              const hasLoggedIn = Boolean(member.profile?.passwordHash)
              const isPendingAccept = !hasLoggedIn && member.status === 'ACTIVE'

              return (
                <div
                  key={member.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr auto',
                    gap: 12,
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--border-subtle)',
                    alignItems: 'center',
                    transition: 'background 0.1s',
                  }}
                >
                  {/* Member info */}
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
                    <div>
                      <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                        {member.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Mail size={10} />{member.email}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                        Invited {formatDate(member.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
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
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
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
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Invite Modal */}
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
                ✓ Access to all projects & notes<br />
                ✓ Can view milestones & updates<br />
                ✗ Cannot see invoices or billing details
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
