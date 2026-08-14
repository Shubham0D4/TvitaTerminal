'use client'

import { useState, useTransition } from 'react'
import {
  Users,
  Plus,
  Trash2,
  PowerOff,
  Power,
  ShieldOff,
  ShieldCheck,
  Settings2,
  X,
  CheckCircle2,
  Search,
  Copy,
  Check,
  FolderKanban,
  FileText,
  CreditCard,
  Sparkles,
  Lock,
  Edit3,
  UserPlus,
  ShieldAlert,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import type { Client, ClientSubTeam } from '@prisma/client'
import type { AccessPolicy } from '@/lib/auth/server'

type Props = {
  client: Client
  subTeams: ClientSubTeam[]
}

type PolicyKey = keyof AccessPolicy

type PolicyDefinition = {
  key: PolicyKey
  label: string
  description: string
  category: 'execution' | 'commercial'
  icon: typeof FolderKanban
}

const POLICY_DEFINITIONS: PolicyDefinition[] = [
  {
    key: 'projects',
    label: 'Projects',
    description: 'View active deliverables, project progress, and task details',
    category: 'execution',
    icon: FolderKanban,
  },
  {
    key: 'milestones',
    label: 'Milestones',
    description: 'Track key milestones and delivery schedules',
    category: 'execution',
    icon: CheckCircle2,
  },
  {
    key: 'approvals',
    label: 'Approvals',
    description: 'Review and approve milestone sign-offs or task requests',
    category: 'execution',
    icon: ShieldCheck,
  },
  {
    key: 'documents',
    label: 'Documents',
    description: 'Access shared client project files and deliverables',
    category: 'execution',
    icon: FileText,
  },
  {
    key: 'invoices',
    label: 'Invoices',
    description: 'View client invoices, payment status, and download PDFs',
    category: 'commercial',
    icon: CreditCard,
  },
  {
    key: 'subscriptions',
    label: 'Subscriptions',
    description: 'View monthly retainer packages and active service plans',
    category: 'commercial',
    icon: Sparkles,
  },
  {
    key: 'billing',
    label: 'Billing Profile',
    description: 'Access tax registration details and billing addresses',
    category: 'commercial',
    icon: CreditCard,
  },
]

const DEFAULT_POLICY: AccessPolicy = {
  projects: true,
  milestones: true,
  approvals: true,
  documents: true,
  invoices: false,
  subscriptions: false,
  billing: false,
}

const ROLE_PRESETS = [
  {
    id: 'full',
    title: 'Full Access',
    subtitle: 'All projects & financial data',
    policy: {
      projects: true,
      milestones: true,
      approvals: true,
      documents: true,
      invoices: true,
      subscriptions: true,
      billing: true,
    },
  },
  {
    id: 'delivery',
    title: 'Projects Only',
    subtitle: 'Deliverables & milestones',
    policy: {
      projects: true,
      milestones: true,
      approvals: true,
      documents: true,
      invoices: false,
      subscriptions: false,
      billing: false,
    },
  },
  {
    id: 'finance',
    title: 'Finance Only',
    subtitle: 'Invoices & subscription plans',
    policy: {
      projects: false,
      milestones: false,
      approvals: false,
      documents: false,
      invoices: true,
      subscriptions: true,
      billing: true,
    },
  },
  {
    id: 'custom',
    title: 'Custom Policy',
    subtitle: 'Select specific permissions',
    policy: null,
  },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(date: Date | string | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

export default function ClientTeamsManager({ client, subTeams: initialTeams }: Props) {
  const [teams, setTeams] = useState<ClientSubTeam[]>(initialTeams)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'REVOKED'>('ALL')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<ClientSubTeam | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form State
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPreset, setFormPreset] = useState<'full' | 'delivery' | 'finance' | 'custom'>('delivery')
  const [formPolicy, setFormPolicy] = useState<AccessPolicy>(DEFAULT_POLICY)

  const openCreateModal = () => {
    setFormName('')
    setFormEmail('')
    setFormPreset('delivery')
    setFormPolicy({ ...DEFAULT_POLICY })
    setEditingTeam(null)
    setShowCreateModal(true)
  }

  const openEditModal = (team: ClientSubTeam) => {
    setFormName(team.name)
    setFormEmail(team.email)
    const existingPolicy = (team.accessPolicy as AccessPolicy) ?? DEFAULT_POLICY
    setFormPolicy({ ...DEFAULT_POLICY, ...existingPolicy })
    setFormPreset('custom')
    setEditingTeam(team)
    setShowCreateModal(true)
  }

  const closeModal = () => {
    setShowCreateModal(false)
    setEditingTeam(null)
  }

  const applyPreset = (presetId: 'full' | 'delivery' | 'finance' | 'custom') => {
    setFormPreset(presetId)
    const preset = ROLE_PRESETS.find((p) => p.id === presetId)
    if (preset && preset.policy) {
      setFormPolicy(preset.policy)
    }
  }

  const togglePolicyKey = (key: PolicyKey) => {
    setFormPreset('custom')
    setFormPolicy((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formEmail.trim()) {
      toast.error('Please enter a team name and valid email address')
      return
    }

    startTransition(async () => {
      try {
        if (editingTeam) {
          // Update existing sub-team
          const updated = await apiClient.put<ClientSubTeam>(`/api/client/team/${editingTeam.id}`, {
            name: formName.trim(),
            email: formEmail.trim(),
            policy: formPolicy,
          })

          setTeams((prev) => prev.map((t) => (t.id === editingTeam.id ? { ...t, ...updated } : t)))
          toast.success(`Sub-team "${formName}" updated successfully`)
          closeModal()
        } else {
          // Create new sub-team
          const created = await apiClient.post<ClientSubTeam>('/api/client/team', {
            name: formName.trim(),
            email: formEmail.trim(),
            policy: formPolicy,
          })

          setTeams((prev) => [created, ...prev])
          toast.success(`Sub-team member "${formName}" created! Invitation sent.`)
          closeModal()
        }
      } catch (err: unknown) {
        toast.error((err as Error)?.message || 'Failed to save sub-team')
      }
    })
  }

    const handleStatusToggle = async (team: ClientSubTeam) => {
      if (team.revokedByAdmin) {
        toast.error('This team has been revoked by an administrator and cannot be modified.')
        return
      }

      const newStatus = team.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'

      try {
        const updated = await apiClient.put<ClientSubTeam>(`/api/client/team/${team.id}`, {
          status: newStatus,
        })
        setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, ...updated, status: newStatus } : t)))
        toast.success(`Team account ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`)
      } catch (err: unknown) {
        toast.error((err as Error)?.message || 'Failed to toggle team status')
      }
    }

    const handleDeleteTeam = async (team: ClientSubTeam) => {
      if (!confirm(`Are you sure you want to remove sub-team member "${team.name}"? This action cannot be undone.`)) {
        return
      }

      try {
        await apiClient.delete<{ deleted: boolean }>(`/api/client/team/${team.id}`)
        setTeams((prev) => prev.filter((t) => t.id !== team.id))
        toast.success('Sub-team member removed successfully')
      } catch (err: unknown) {
        toast.error((err as Error)?.message || 'Failed to remove sub-team')
      }
    }

  const copyLoginLink = (team: ClientSubTeam) => {
    const url = `${window.location.origin}/login?email=${encodeURIComponent(team.email)}`
    navigator.clipboard.writeText(url)
    setCopiedId(team.id)
    toast.success('Login link copied to clipboard!')
    setTimeout(() => setCopiedId(null), 3000)
  }

  // Filtered list
  const filteredTeams = teams.filter((team) => {
    const matchesSearch =
      team.name.toLowerCase().includes(search.toLowerCase()) ||
      team.email.toLowerCase().includes(search.toLowerCase())

    if (statusFilter === 'ACTIVE') return matchesSearch && team.status === 'ACTIVE' && !team.revokedByAdmin
    if (statusFilter === 'INACTIVE') return matchesSearch && team.status === 'INACTIVE' && !team.revokedByAdmin
    if (statusFilter === 'REVOKED') return matchesSearch && team.revokedByAdmin
    return matchesSearch
  })

  const activeCount = teams.filter((t) => t.status === 'ACTIVE' && !t.revokedByAdmin).length
  const revokedCount = teams.filter((t) => t.revokedByAdmin).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <div className="page-header flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-header__title">Client Team Management</h1>
            <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', fontWeight: 600 }}>
              {teams.length} Members
            </span>
          </div>
          <p className="page-header__subtitle">
            Share portal access with your colleagues and customize access to projects, milestones, or billing details for {client.name}.
          </p>
        </div>

        <button type="button" onClick={openCreateModal} className="btn btn--primary" style={{ gap: 6, flexShrink: 0 }}>
          <UserPlus size={16} /> Add Team Member
        </button>
      </div>

      {/* Info Sovereignty Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.04) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          padding: 'var(--space-4) var(--space-5)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            style={{
              padding: 8,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', marginBottom: 2 }}>
              Full Granular Policy Sovereignty
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              As the primary account holder, you decide what your sub-teams can see. You can grant access to projects, milestones, approvals, or financial invoices with a single click.
            </p>
          </div>
        </div>
      </div>

      {/* Stats & Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Total Sub-Teams</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>{teams.length}</div>
          </div>
          <Users size={24} style={{ color: 'var(--accent-primary)', opacity: 0.8 }} />
        </div>

        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Active Members</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-success)' }}>{activeCount}</div>
          </div>
          <CheckCircle2 size={24} style={{ color: 'var(--color-success)', opacity: 0.8 }} />
        </div>

        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Custom Policies</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>{teams.length}</div>
          </div>
          <Settings2 size={24} style={{ color: 'var(--text-muted)', opacity: 0.8 }} />
        </div>

        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Revoked By Admin</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: revokedCount > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
              {revokedCount}
            </div>
          </div>
          <ShieldOff size={24} style={{ color: revokedCount > 0 ? 'var(--color-danger)' : 'var(--text-muted)', opacity: 0.8 }} />
        </div>
      </div>

      {/* Roster Controls: Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search sub-team members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{
              paddingLeft: 36,
              fontSize: 'var(--text-xs)',
              background: '#ffffff', // solid white
              border: '1px solid var(--border-default)',
              color: '#0f172a',
            }}
          />
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-overlay)', padding: 3, borderRadius: 'var(--radius-md)' }}>
          {(['ALL', 'ACTIVE', 'INACTIVE', 'REVOKED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                border: 'none',
                background: statusFilter === st ? 'var(--bg-card)' : 'transparent',
                color: statusFilter === st ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontWeight: statusFilter === st ? 'var(--font-bold)' : 'var(--font-medium)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Team Roster Grid */}
      {filteredTeams.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-8)' }}>
          <div className="empty-state">
            <Users size={32} style={{ color: 'var(--text-muted)' }} />
            <div className="empty-state__title">No Sub-Teams Found</div>
            <div className="empty-state__desc">
              {search ? 'No team members matched your search query.' : 'You have not added any sub-team members yet.'}
            </div>
            {!search && (
              <button type="button" onClick={openCreateModal} className="btn btn--primary mt-4">
                <Plus size={15} /> Add First Team Member
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTeams.map((team) => {
            const policy = (team.accessPolicy as Partial<AccessPolicy>) ?? {}
            const activePolicyKeys = POLICY_DEFINITIONS.filter((d) => Boolean(policy[d.key]))

            return (
              <div
                key={team.id}
                className="card hover-lift"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 'var(--space-4)',
                  border: team.revokedByAdmin
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : team.status === 'ACTIVE'
                    ? '1px solid var(--border-subtle)'
                    : '1px dashed var(--border-subtle)',
                  opacity: team.status === 'INACTIVE' && !team.revokedByAdmin ? 0.75 : 1,
                }}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent-primary) 0%, #8b5cf6 100%)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'var(--font-bold)',
                          fontSize: 'var(--text-sm)',
                          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                        }}
                      >
                        {getInitials(team.name)}
                      </div>
                      <div>
                        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', margin: 0 }}>
                          {team.name}
                        </h3>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{team.email}</div>
                      </div>
                    </div>

                    <div>
                      {team.revokedByAdmin ? (
                        <span className="badge badge--danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <ShieldAlert size={12} /> Revoked by Admin
                        </span>
                      ) : (
                        <span className={`badge badge--${team.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                          {team.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Access Policy Chips */}
                  <div style={{ marginTop: 'var(--space-3)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)', fontWeight: 'var(--font-medium)' }}>
                      Granted Permissions ({activePolicyKeys.length}/{POLICY_DEFINITIONS.length}):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {activePolicyKeys.map((p) => {
                        const Icon = p.icon
                        return (
                          <span
                            key={p.key}
                            className="badge"
                            style={{
                              background: p.category === 'commercial' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                              color: p.category === 'commercial' ? '#c084fc' : '#818cf8',
                              fontSize: 10,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                            }}
                          >
                            <Icon size={11} /> {p.label}
                          </span>
                        )
                      })}
                      {activePolicyKeys.length === 0 && (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No permissions granted
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div
                  className="flex items-center justify-between pt-3"
                  style={{ borderTop: '1px solid var(--border-subtle)', fontSize: 'var(--text-xs)' }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>Added {formatDate(team.createdAt)}</span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyLoginLink(team)}
                      className="btn btn--ghost btn--xs"
                      title="Copy Magic Login Link"
                    >
                      {copiedId === team.id ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                    </button>

                    {!team.revokedByAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(team)}
                          className="btn btn--ghost btn--xs"
                          title="Edit Permissions"
                        >
                          <Edit3 size={13} /> Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusToggle(team)}
                          className={`btn btn--ghost btn--xs ${team.status === 'ACTIVE' ? 'text-warning' : 'text-success'}`}
                          title={team.status === 'ACTIVE' ? 'Deactivate Member' : 'Activate Member'}
                        >
                          {team.status === 'ACTIVE' ? <PowerOff size={13} /> : <Power size={13} />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTeam(team)}
                          className="btn btn--ghost btn--xs text-danger"
                          title="Delete Member"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit Modal - Guaranteed Horizontal 2-Column & Scrollable Layout */}
      {showCreateModal && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)', // solid, darker backdrop
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="modal-content"
            style={{
              maxWidth: 960,
              width: '95%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              background: '#ffffff', // solid, non-transparent background
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              className="modal-header"
              style={{
                flexShrink: 0,
                background: '#f8fafc', // solid, light grey background
                borderBottom: '1px solid var(--border-subtle)',
                padding: 'var(--space-4) var(--space-6)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  {editingTeam ? <Edit3 size={18} /> : <UserPlus size={18} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="modal-title" style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: '#0f172a' }}>
                      {editingTeam ? 'Edit Sub-Team Permissions' : 'Invite New Team Member'}
                    </h2>
                    <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', fontSize: 11 }}>
                      {Object.values(formPolicy).filter(Boolean).length} / {POLICY_DEFINITIONS.length} Permissions
                    </span>
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                    Configure member credentials on the left and grant portal permissions on the right.
                  </p>
                </div>
              </div>
              <button type="button" onClick={closeModal} className="btn btn--ghost btn--icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Horizontal Two-Column Body Grid (Strict Side-by-Side with Vertical Scroll) */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(300px, 1fr) minmax(340px, 1.2fr)',
                  gap: 'var(--space-6)',
                  padding: 'var(--space-6)',
                  background: '#ffffff', // solid, non-transparent background
                }}
              >
                {/* Left Column: Credentials & Role Presets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                  {/* Credentials Group */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      1. Member Credentials
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: '#334155' }}>
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sarah Jenkins"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="form-input"
                        style={{
                          background: '#f8fafc', // solid non-transparent background
                          border: '1px solid var(--border-default)',
                          color: '#0f172a',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--text-sm)',
                        }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: '#334155' }}>
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. sarah@company.com"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="form-input"
                        style={{
                          background: '#f8fafc', // solid non-transparent background
                          border: '1px solid var(--border-default)',
                          color: '#0f172a',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--text-sm)',
                        }}
                        disabled={Boolean(editingTeam)}
                      />
                    </div>
                  </div>

                  {/* Role Presets Group */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      2. Role Access Preset
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                      {ROLE_PRESETS.map((preset) => {
                        const isSelected = formPreset === preset.id
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyPreset(preset.id as any)}
                            style={{
                              border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                              background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-overlay)',
                              padding: 'var(--space-3)',
                              borderRadius: 'var(--radius-md)',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              {preset.title}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                              {preset.subtitle}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Live Scope Summary Box */}
                  <div
                    style={{
                      background: 'var(--bg-overlay)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3) var(--space-4)',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Active Granted Portals:
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {POLICY_DEFINITIONS.filter((d) => formPolicy[d.key]).map((d) => (
                        <span
                          key={d.key}
                          className="badge"
                          style={{
                            fontSize: 9,
                            padding: '1px 6px',
                            background: d.category === 'commercial' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                            color: d.category === 'commercial' ? '#c084fc' : 'var(--accent-primary)',
                          }}
                        >
                          {d.label}
                        </span>
                      ))}
                      {Object.values(formPolicy).filter(Boolean).length === 0 && (
                        <span style={{ fontSize: 10, color: 'var(--color-danger)' }}>No access granted</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Fine-Grained Policy Rules */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    3. Custom Permissions
                  </div>

                  {/* Execution Policies */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)', marginBottom: 8 }}>
                      Workspace &amp; Delivery
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {POLICY_DEFINITIONS.filter((d) => d.category === 'execution').map((def) => {
                        const isEnabled = Boolean(formPolicy[def.key])
                        const Icon = def.icon
                        return (
                          <div
                            key={def.key}
                            onClick={() => togglePolicyKey(def.key)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-md)',
                              border: isEnabled ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border-subtle)',
                              background: isEnabled ? 'rgba(99, 102, 241, 0.06)' : 'var(--bg-overlay)',
                              cursor: 'pointer',
                              userSelect: 'none',
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Icon size={14} style={{ color: isEnabled ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                              <div>
                                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                                  {def.label}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{def.description}</div>
                              </div>
                            </div>

                            <div
                              style={{
                                width: 34,
                                height: 18,
                                borderRadius: 9,
                                background: isEnabled ? 'var(--accent-primary)' : 'rgba(255,255,255,0.15)',
                                position: 'relative',
                                transition: 'background 0.15s ease',
                                flexShrink: 0,
                              }}
                            >
                              <div
                                style={{
                                  width: 14,
                                  height: 14,
                                  borderRadius: '50%',
                                  background: '#fff',
                                  position: 'absolute',
                                  top: 2,
                                  left: isEnabled ? 18 : 2,
                                  transition: 'left 0.15s ease',
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Commercial Policies */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)', marginBottom: 8 }}>
                      Financial &amp; Billing
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {POLICY_DEFINITIONS.filter((d) => d.category === 'commercial').map((def) => {
                        const isEnabled = Boolean(formPolicy[def.key])
                        const Icon = def.icon
                        return (
                          <div
                            key={def.key}
                            onClick={() => togglePolicyKey(def.key)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-md)',
                              border: isEnabled ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid var(--border-subtle)',
                              background: isEnabled ? 'rgba(168, 85, 247, 0.06)' : 'var(--bg-overlay)',
                              cursor: 'pointer',
                              userSelect: 'none',
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Icon size={14} style={{ color: isEnabled ? '#c084fc' : 'var(--text-muted)' }} />
                              <div>
                                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                                  {def.label}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{def.description}</div>
                              </div>
                            </div>

                            <div
                              style={{
                                width: 34,
                                height: 18,
                                borderRadius: 9,
                                background: isEnabled ? '#c084fc' : 'rgba(255,255,255,0.15)',
                                position: 'relative',
                                transition: 'background 0.15s ease',
                                flexShrink: 0,
                              }}
                            >
                              <div
                                style={{
                                  width: 14,
                                  height: 14,
                                  borderRadius: '50%',
                                  background: '#fff',
                                  position: 'absolute',
                                  top: 2,
                                  left: isEnabled ? 18 : 2,
                                  transition: 'left 0.15s ease',
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                className="modal-footer"
                style={{
                  flexShrink: 0,
                  padding: 'var(--space-4) var(--space-6)',
                  borderTop: '1px solid var(--border-subtle)',
                  background: 'var(--bg-overlay)',
                }}
              >
                <button type="button" onClick={closeModal} className="btn btn--secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isPending} className="btn btn--primary">
                  {isPending ? 'Saving Member...' : editingTeam ? 'Update Sub-Team Member' : 'Invite Sub-Team Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
