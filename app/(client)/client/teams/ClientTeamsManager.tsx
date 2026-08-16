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
  Edit3,
  UserPlus,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Briefcase,
  KeyRound,
  Layers,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { apiClient } from '@/shared/utilities/api-client'
import type { Client } from '@prisma/client'
import type { AccessPolicy } from '@/lib/auth/server'

type ProjectItem = {
  id: string
  name: string
  status: string
}

type RoleItem = {
  id: string
  subTeamId: string
  name: string
  description?: string | null
  permissions: AccessPolicy
}

type MemberItem = {
  id: string
  subTeamId: string
  profileId?: string | null
  roleId?: string | null
  name: string
  email: string
  designation?: string | null
  customPolicy?: AccessPolicy | null
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  role?: RoleItem | null
}

type TeamItem = {
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
  roles?: RoleItem[]
  members?: MemberItem[]
}

type Props = {
  client: any
  projects: ProjectItem[]
  initialSubTeams: any[]
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
  invoices: false,
  subscriptions: false,
  billing: false,
}

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

export default function ClientTeamsManager({ client, projects, initialSubTeams }: Props) {
  const router = useRouter()
  const [teams, setTeams] = useState<TeamItem[]>(initialSubTeams as TeamItem[])
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(initialSubTeams[0]?.id || null)

  // Modals
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<TeamItem | null>(null)

  const [showRoleModal, setShowRoleModal] = useState(false)
  const [roleTeamId, setRoleTeamId] = useState<string | null>(null)

  const [showMemberModal, setShowMemberModal] = useState(false)
  const [memberTeamId, setMemberTeamId] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()

  // Team Form State
  const [teamName, setTeamName] = useState('')
  const [teamDesc, setTeamDesc] = useState('')
  const [teamPolicy, setTeamPolicy] = useState<AccessPolicy>(DEFAULT_POLICY)
  const [teamAllowedProjects, setTeamAllowedProjects] = useState<string[]>([]) // Empty = All

  // Role Form State
  const [roleName, setRoleName] = useState('')
  const [roleDesc, setRoleDesc] = useState('')
  const [rolePolicy, setRolePolicy] = useState<AccessPolicy>(DEFAULT_POLICY)

  // Member Form State
  const [memberName, setMemberName] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberDesignation, setMemberDesignation] = useState('')
  const [memberRoleId, setMemberRoleId] = useState<string>('')
  const [memberCustomPolicy, setMemberCustomPolicy] = useState<AccessPolicy>(DEFAULT_POLICY)
  const [useCustomMemberPolicy, setUseCustomMemberPolicy] = useState(false)

  // --- Team Handlers ---
  const openCreateTeamModal = () => {
    setTeamName('')
    setTeamDesc('')
    setTeamPolicy({ ...DEFAULT_POLICY })
    setTeamAllowedProjects([])
    setEditingTeam(null)
    setShowTeamModal(true)
  }

  const openEditTeamModal = (t: TeamItem) => {
    setTeamName(t.name)
    setTeamDesc(t.description || '')
    setTeamPolicy({ ...DEFAULT_POLICY, ...(t.accessPolicy || {}) })
    setTeamAllowedProjects(Array.isArray(t.allowedProjects) ? t.allowedProjects : [])
    setEditingTeam(t)
    setShowTeamModal(true)
  }

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) {
      toast.error('Team name is required')
      return
    }

    startTransition(async () => {
      try {
        if (editingTeam) {
          const updated = await apiClient.put<TeamItem>(`/api/client/team/${editingTeam.id}`, {
            name: teamName.trim(),
            description: teamDesc.trim(),
            policy: teamPolicy,
            allowedProjects: teamAllowedProjects,
          })
          setTeams((prev) => prev.map((t) => (t.id === editingTeam.id ? { ...t, ...updated } : t)))
          toast.success(`Team "${teamName}" updated successfully`)
        } else {
          const created = await apiClient.post<TeamItem>('/api/client/team', {
            name: teamName.trim(),
            description: teamDesc.trim(),
            policy: teamPolicy,
            allowedProjects: teamAllowedProjects,
          })
          setTeams((prev) => [created, ...prev])
          setExpandedTeamId(created.id)
          toast.success(`Team "${teamName}" created!`)
        }
        setShowTeamModal(false)
      } catch (err: unknown) {
        toast.error((err as Error)?.message || 'Failed to save team')
      }
    })
  }

  const handleDeleteTeam = async (team: TeamItem) => {
    if (!confirm(`Are you sure you want to delete team "${team.name}"? This will revoke access for all members.`)) {
      return
    }

    try {
      await apiClient.delete<{ deleted: boolean }>(`/api/client/team/${team.id}`)
      setTeams((prev) => prev.filter((t) => t.id !== team.id))
      toast.success('Team deleted')
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to delete team')
    }
  }

  // --- Role Handlers ---
  const openCreateRoleModal = (teamId: string) => {
    setRoleTeamId(teamId)
    setRoleName('')
    setRoleDesc('')
    setRolePolicy({ ...DEFAULT_POLICY })
    setShowRoleModal(true)
  }

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleName.trim() || !roleTeamId) {
      toast.error('Role name is required')
      return
    }

    startTransition(async () => {
      try {
        const created = await apiClient.post<RoleItem>(`/api/client/team/${roleTeamId}/roles`, {
          name: roleName.trim(),
          description: roleDesc.trim(),
          permissions: rolePolicy,
        })
        setTeams((prev) =>
          prev.map((t) => (t.id === roleTeamId ? { ...t, roles: [created, ...(t.roles || [])] } : t))
        )
        toast.success(`Custom role "${roleName}" added`)
        setShowRoleModal(false)
      } catch (err: unknown) {
        toast.error((err as Error)?.message || 'Failed to create role')
      }
    })
  }

  // --- Member Handlers ---
  const openCreateMemberModal = (teamId: string) => {
    setMemberTeamId(teamId)
    setMemberName('')
    setMemberEmail('')
    setMemberDesignation('')
    setMemberRoleId('')
    setMemberCustomPolicy({ ...DEFAULT_POLICY })
    setUseCustomMemberPolicy(false)
    setShowMemberModal(true)
  }

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberName.trim() || !memberEmail.trim() || !memberTeamId) {
      toast.error('Name and valid email are required')
      return
    }

    startTransition(async () => {
      try {
        const created = await apiClient.post<MemberItem>(`/api/client/team/${memberTeamId}/members`, {
          name: memberName.trim(),
          email: memberEmail.trim(),
          designation: memberDesignation.trim(),
          roleId: memberRoleId || null,
          customPolicy: useCustomMemberPolicy ? memberCustomPolicy : null,
        })

        setTeams((prev) =>
          prev.map((t) => (t.id === memberTeamId ? { ...t, members: [created, ...(t.members || [])] } : t))
        )
        toast.success(`Member "${memberName}" invited! Magic link sent to ${memberEmail}.`)
        setShowMemberModal(false)
      } catch (err: unknown) {
        toast.error((err as Error)?.message || 'Failed to invite member')
      }
    })
  }

  const handleDeleteMember = async (teamId: string, member: MemberItem) => {
    if (!confirm(`Remove member "${member.name}" from team?`)) return
    try {
      await apiClient.delete<{ deleted: boolean }>(`/api/client/team/${teamId}/members/${member.id}`)
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId ? { ...t, members: (t.members || []).filter((m) => m.id !== member.id) } : t
        )
      )
      toast.success('Team member removed')
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to remove member')
    }
  }

  const copyMagicLink = (email: string, id: string) => {
    const url = `${window.location.origin}/login?email=${encodeURIComponent(email)}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    toast.success('Magic login link copied to clipboard!')
    setTimeout(() => setCopiedId(null), 3000)
  }

  const toggleProjectAccess = (projId: string) => {
    setTeamAllowedProjects((prev) => {
      if (prev.includes(projId)) {
        return prev.filter((p) => p !== projId)
      }
      return [...prev, projId]
    })
  }

  // Filtered teams
  const filteredTeams = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
      (t.members && t.members.some((m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())))
  )

  const totalMembersCount = teams.reduce((acc, t) => acc + (t.members?.length || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <div className="page-header flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-header__title">Client Teams &amp; Access Control</h1>
            <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', fontWeight: 600 }}>
              {teams.length} Teams · {totalMembersCount} Members
            </span>
          </div>
          <p className="page-header__subtitle">
            Create internal teams for {client.name}, assign project-level access boundaries, and define granular roles and component permissions for members.
          </p>
        </div>

        <button type="button" onClick={openCreateTeamModal} className="btn btn--primary" style={{ gap: 6, flexShrink: 0 }}>
          <Plus size={16} /> Create Client Team
        </button>
      </div>

      {/* Roster Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div style={{ position: 'relative', width: '100%', maxWidth: 420 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search teams, roles, or members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{
              paddingLeft: 36,
              fontSize: 'var(--text-xs)',
              background: '#ffffff',
              border: '1px solid var(--border-default)',
              color: '#0f172a',
            }}
          />
        </div>
      </div>

      {/* Teams List Accordion */}
      {filteredTeams.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-8)' }}>
          <div className="empty-state">
            <Users size={32} style={{ color: 'var(--text-muted)' }} />
            <div className="empty-state__title">No Teams Configured</div>
            <div className="empty-state__desc">
              {search ? 'No teams or members match your search criteria.' : 'Create your first internal sub-team to manage project access.'}
            </div>
            {!search && (
              <button type="button" onClick={openCreateTeamModal} className="btn btn--primary mt-4">
                <Plus size={15} /> Create First Team
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {filteredTeams.map((team) => {
            const isExpanded = expandedTeamId === team.id
            const members = team.members || []
            const roles = team.roles || []

            return (
              <div
                key={team.id}
                className="card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  border: team.revokedByAdmin ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-subtle)',
                }}
              >
                {/* Team Header Bar */}
                <div
                  style={{
                    padding: 'var(--space-4) var(--space-6)',
                    background: isExpanded ? 'var(--bg-elevated)' : '#ffffff',
                    borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                  onClick={() => router.push(`/client/teams/${team.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, var(--accent-primary) 0%, #8b5cf6 100%)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'var(--font-bold)',
                        fontSize: 'var(--text-sm)',
                      }}
                    >
                      {getInitials(team.name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', margin: 0 }}>
                          {team.name}
                        </h3>
                        {team.revokedByAdmin ? (
                          <span className="badge badge--danger" style={{ fontSize: 10 }}>Revoked</span>
                        ) : (
                          <span className={`badge badge--${team.status === 'ACTIVE' ? 'active' : 'inactive'}`} style={{ fontSize: 10 }}>
                            {team.status}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                        {team.description || 'Internal sub-team'} · Created {formatDate(team.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Project access pills */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Briefcase size={12} /> Project Access:
                      </span>
                      {team.allowedProjects && team.allowedProjects.length > 0 ? (
                        <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', fontSize: 10 }}>
                          {team.allowedProjects.length} Specific Project{team.allowedProjects.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="badge badge--active" style={{ fontSize: 10 }}>
                          All Projects
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 'var(--font-semibold)' }}>
                      {members.length} member{members.length !== 1 ? 's' : ''}
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/client/teams/${team.id}`}
                        className="btn btn--primary btn--xs"
                        style={{ gap: 4 }}
                      >
                        Manage Team &amp; Members
                      </Link>

                      <button
                        type="button"
                        onClick={() => openEditTeamModal(team)}
                        className="btn btn--ghost btn--xs"
                        title="Edit Team & Project Access"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTeam(team)}
                        className="btn btn--ghost btn--xs text-danger"
                        title="Delete Team"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div style={{ color: 'var(--text-muted)' }}>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Team Details Panel (Expanded) */}
                {isExpanded && (
                  <div style={{ padding: 'var(--space-6)', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                    
                    {/* Sub-Team Actions Toolbar */}
                    <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <div className="flex items-center gap-2">
                        <Layers size={16} style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                          Team Roster &amp; Custom Roles
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => openCreateRoleModal(team.id)} className="btn btn--secondary btn--sm" style={{ gap: 4 }}>
                          <KeyRound size={14} /> Add Custom Role
                        </button>
                        <button type="button" onClick={() => openCreateMemberModal(team.id)} className="btn btn--primary btn--sm" style={{ gap: 4 }}>
                          <UserPlus size={14} /> Invite Team Member
                        </button>
                      </div>
                    </div>

                    {/* Roles Grid (if any) */}
                    {roles.length > 0 && (
                      <div>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>
                          Custom Roles Defined ({roles.length}):
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {roles.map((r) => {
                            const perms = (r.permissions || {}) as AccessPolicy
                            const activePerms = POLICY_DEFINITIONS.filter((p) => Boolean(perms[p.key]))
                            return (
                              <div
                                key={r.id}
                                style={{
                                  background: 'var(--bg-elevated)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: 'var(--radius-md)',
                                  padding: 'var(--space-3) var(--space-4)',
                                }}
                              >
                                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                                  {r.name}
                                </div>
                                {r.description && (
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{r.description}</div>
                                )}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                                  {activePerms.map((p) => (
                                    <span key={p.key} className="badge" style={{ fontSize: 9, padding: '1px 6px', background: 'rgba(99,102,241,0.12)', color: 'var(--accent-primary)' }}>
                                      {p.label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Members List Table */}
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>
                        Team Members ({members.length}):
                      </div>

                      {members.length === 0 ? (
                        <div className="empty-state" style={{ padding: 'var(--space-6)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                          <UserCheck size={24} style={{ color: 'var(--text-muted)' }} />
                          <div className="empty-state__title" style={{ fontSize: 'var(--text-sm)' }}>No members in this team yet</div>
                          <div className="empty-state__desc">Invite colleagues to grant them access to this team's assigned projects.</div>
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Member Name &amp; Email</th>
                                <th>Designation</th>
                                <th>Assigned Role</th>
                                <th>Component Access</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {members.map((m) => {
                                return (
                                  <tr key={m.id}>
                                    <td>
                                      <div className="flex items-center gap-2">
                                        <div
                                          style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: '50%',
                                            background: 'var(--accent-primary)',
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 11,
                                            fontWeight: 700,
                                          }}
                                        >
                                          {getInitials(m.name)}
                                        </div>
                                        <div>
                                          <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{m.name}</div>
                                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.email}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{m.designation || 'Member'}</td>
                                    <td>
                                      {m.role ? (
                                        <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)' }}>
                                          {m.role.name}
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Default Team Role</span>
                                      )}
                                    </td>
                                    <td>
                                      {m.customPolicy ? (
                                        <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', fontSize: 10 }}>
                                          Custom Override
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Inherited from Role</span>
                                      )}
                                    </td>
                                    <td>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => copyMagicLink(m.email, m.id)}
                                          className="btn btn--ghost btn--xs"
                                          title="Copy Magic Login Link"
                                        >
                                          {copiedId === m.id ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleDeleteMember(team.id, m)}
                                          className="btn btn--ghost btn--xs text-danger"
                                          title="Remove Member"
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
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* --- MODAL 1: Create / Edit Team (with Project-Level Access) --- */}
      {showTeamModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="modal-content" style={{ maxWidth: 700, width: '95%', background: '#ffffff', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
            <div className="modal-header" style={{ background: '#f8fafc', padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: '#0f172a' }}>
                {editingTeam ? 'Edit Team & Project Access' : 'Create New Client Sub-Team'}
              </h2>
              <button type="button" onClick={() => setShowTeamModal(false)} className="btn btn--ghost btn--icon"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveTeam} style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>Team Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. QA &amp; Marketing Reviewers"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="form-input"
                  style={{ background: '#f8fafc', border: '1px solid var(--border-default)', color: '#0f172a' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Internal QA department for mobile apps"
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  className="form-input"
                  style={{ background: '#f8fafc', border: '1px solid var(--border-default)', color: '#0f172a' }}
                />
              </div>

              {/* Project-Level Access Selection */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Briefcase size={15} style={{ color: 'var(--accent-primary)' }} />
                  Project-Level Access Restriction
                </label>
                <p className="form-hint" style={{ marginTop: 0, marginBottom: 8 }}>
                  Select which projects members of this team can see. If none selected, team members can view all client projects.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', background: 'var(--bg-elevated)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  {projects.length === 0 ? (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>No projects created yet for your client account.</div>
                  ) : (
                    projects.map((p) => {
                      const isChecked = teamAllowedProjects.includes(p.id)
                      return (
                        <label key={p.id} className="flex items-center gap-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleProjectAccess(p.id)}
                            style={{ accentColor: 'var(--accent-primary)' }}
                          />
                          <span style={{ fontWeight: 600 }}>{p.name}</span>
                          <span className="badge" style={{ fontSize: 9 }}>{p.status}</span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setShowTeamModal(false)} className="btn btn--secondary">Cancel</button>
                <button type="submit" disabled={isPending} className="btn btn--primary">
                  {isPending ? 'Saving...' : editingTeam ? 'Update Team' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Create Custom Team Role --- */}
      {showRoleModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="modal-content" style={{ maxWidth: 650, width: '95%', background: '#ffffff', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
            <div className="modal-header" style={{ background: '#f8fafc', padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: '#0f172a' }}>Add Custom Role to Team</h2>
              <button type="button" onClick={() => setShowRoleModal(false)} className="btn btn--ghost btn--icon"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveRole} style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>Role Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Milestone Approver"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="form-input"
                  style={{ background: '#f8fafc', border: '1px solid var(--border-default)', color: '#0f172a' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>Role Description</label>
                <input
                  type="text"
                  placeholder="e.g. Can review and approve project milestones"
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  className="form-input"
                  style={{ background: '#f8fafc', border: '1px solid var(--border-default)', color: '#0f172a' }}
                />
              </div>

              {/* Permissions switches */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>Component Access Permissions</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                  {POLICY_DEFINITIONS.map((def) => {
                    const isEnabled = Boolean(rolePolicy[def.key])
                    return (
                      <div
                        key={def.key}
                        onClick={() => setRolePolicy((prev) => ({ ...prev, [def.key]: !prev[def.key] }))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: isEnabled ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border-subtle)',
                          background: isEnabled ? 'rgba(99, 102, 241, 0.06)' : 'var(--bg-overlay)',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{def.label}</span>
                        <input type="checkbox" checked={isEnabled} readOnly style={{ accentColor: 'var(--accent-primary)' }} />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setShowRoleModal(false)} className="btn btn--secondary">Cancel</button>
                <button type="submit" disabled={isPending} className="btn btn--primary">
                  {isPending ? 'Saving...' : 'Save Custom Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: Invite Team Member --- */}
      {showMemberModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="modal-content" style={{ maxWidth: 650, width: '95%', background: '#ffffff', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
            <div className="modal-header" style={{ background: '#f8fafc', padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: '#0f172a' }}>Invite Team Member</h2>
              <button type="button" onClick={() => setShowMemberModal(false)} className="btn btn--ghost btn--icon"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveMember} style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>Member Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="form-input"
                    style={{ background: '#f8fafc', border: '1px solid var(--border-default)', color: '#0f172a' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. alex@company.com"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    className="form-input"
                    style={{ background: '#f8fafc', border: '1px solid var(--border-default)', color: '#0f172a' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior QA Engineer"
                    value={memberDesignation}
                    onChange={(e) => setMemberDesignation(e.target.value)}
                    className="form-input"
                    style={{ background: '#f8fafc', border: '1px solid var(--border-default)', color: '#0f172a' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>Assign Custom Role</label>
                  <select
                    value={memberRoleId}
                    onChange={(e) => setMemberRoleId(e.target.value)}
                    className="form-select"
                    style={{ background: '#f8fafc', border: '1px solid var(--border-default)', color: '#0f172a' }}
                  >
                    <option value="">Default Team Role</option>
                    {(teams.find((t) => t.id === memberTeamId)?.roles || []).map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setShowMemberModal(false)} className="btn btn--secondary">Cancel</button>
                <button type="submit" disabled={isPending} className="btn btn--primary">
                  {isPending ? 'Sending Invite...' : 'Send Magic Link Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
