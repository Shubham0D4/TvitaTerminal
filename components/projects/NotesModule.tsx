'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, X, Lock, Eye, Trash2, Users, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@/shared/utilities/api-client'

interface ProfileItem {
  id: string
  name: string
  role: string
}

interface SubTeamItem {
  id: string
  name: string
}

interface Note {
  id: string
  title: string
  content: string
  type: 'INTERNAL_TEAM' | 'EXTERNAL_CLIENT'
  creatorId: string
  creator: { id: string; name: string; role: string }
  allowedProfileIds: string[]
  allowedSubTeamIds: string[]
  createdAt: string
}

interface Props {
  projectId: string
  clientId: string
  userRole: string
  userTeamRole: string | null
  userId: string
  hasAccess: boolean
}

export default function NotesModule({ projectId, clientId, userRole, userTeamRole, userId, hasAccess }: Props) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingAccessNote, setEditingAccessNote] = useState<Note | null>(null)
  const [isPending, startTransition] = useTransition()

  // Sharing option lists
  const [teamMembers, setTeamMembers] = useState<ProfileItem[]>([])
  const [clientSubTeams, setClientSubTeams] = useState<SubTeamItem[]>([])

  // Form states
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState<'INTERNAL_TEAM' | 'EXTERNAL_CLIENT'>('INTERNAL_TEAM')
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([])
  const [selectedSubTeamIds, setSelectedSubTeamIds] = useState<string[]>([])

  const isClient = userRole === 'CLIENT'

  useEffect(() => {
    if (!hasAccess) return

    // Fetch notes
    apiClient.get<Note[]>(`/api/projects/${projectId}/notes`)
      .then((res) => {
        setNotes(res)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        toast.error('Failed to load notes')
        setLoading(false)
      })

    // Fetch project team members for internal sharing
    apiClient.get<{ members: { profile: ProfileItem }[] }>(`/api/team/projects/${projectId}`)
      .then((res) => {
        if (res?.members) {
          setTeamMembers(res.members.map((m) => m.profile))
        }
      })
      .catch((err) => console.error('Failed to load project members:', err))

    // Fetch client subteams
    if (isClient) {
      apiClient.get<SubTeamItem[]>(`/api/client/teams`)
        .then((res) => setClientSubTeams(res || []))
        .catch((err) => console.error('Failed to load client subteams:', err))
    } else {
      apiClient.get<SubTeamItem[]>(`/api/admin/clients/${clientId}/subteams`)
        .then((res) => setClientSubTeams(res || []))
        .catch((err) => console.error('Failed to load client subteams:', err))
    }
  }, [projectId, clientId, hasAccess, isClient])

  if (!hasAccess) {
    return (
      <div className="card text-center py-6">
        <p style={{ color: 'var(--text-muted)' }}>You do not have permission to access notes for this project.</p>
      </div>
    )
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !content) return

    startTransition(async () => {
      try {
        const newNote = await apiClient.post<Note>(`/api/projects/${projectId}/notes`, {
          title,
          content,
          type: isClient ? 'EXTERNAL_CLIENT' : type,
          allowedProfileIds: selectedProfileIds,
          allowedSubTeamIds: selectedSubTeamIds,
        })
        setNotes((prev) => [newNote, ...prev])
        toast.success('Note created successfully')
        setShowCreate(false)
        setTitle('')
        setContent('')
        setSelectedProfileIds([])
        setSelectedSubTeamIds([])
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create note'
        toast.error(msg)
      }
    })
  }

  const handleDelete = (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    startTransition(async () => {
      try {
        await apiClient.delete(`/api/projects/notes/${noteId}`)
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
        toast.success('Note deleted successfully')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to delete note'
        toast.error(msg)
      }
    })
  }

  const handleSaveAccess = (noteId: string) => {
    if (!editingAccessNote) return

    startTransition(async () => {
      try {
        const updated = await apiClient.patch<Note>(`/api/projects/notes/${noteId}`, {
          allowedProfileIds: selectedProfileIds,
          allowedSubTeamIds: selectedSubTeamIds,
        })
        setNotes((prev) => prev.map((n) => n.id === noteId ? updated : n))
        toast.success('Sharing access updated')
        setEditingAccessNote(null)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update sharing access'
        toast.error(msg)
      }
    })
  }

  const toggleProfileSharing = (profileId: string) => {
    setSelectedProfileIds((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId]
    )
  }

  const toggleSubTeamSharing = (subTeamId: string) => {
    setSelectedSubTeamIds((prev) =>
      prev.includes(subTeamId) ? prev.filter((id) => id !== subTeamId) : [...prev, subTeamId]
    )
  }

  if (loading) {
    return <div className="card text-center py-6"><p style={{ color: 'var(--text-muted)' }}>Loading notes...</p></div>
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
          Project Notes
        </h2>
        <button type="button" onClick={() => {
          setShowCreate(!showCreate)
          setEditingAccessNote(null)
        }} className="btn btn--ghost btn--sm">
          {showCreate ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Note</>}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="nt-title">Note Title *</label>
            <input id="nt-title" value={title} onChange={(e) => setTitle(e.target.value)} className="form-input" placeholder="Title..." required />
          </div>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="nt-content">Content *</label>
            <textarea id="nt-content" value={content} onChange={(e) => setContent(e.target.value)} className="form-textarea" rows={4} placeholder="Note content..." required />
          </div>

          {!isClient && (
            <div className="form-group mb-3">
              <label className="form-label">Note Type</label>
              <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 4 }}>
                <label className="flex items-center gap-2" style={{ fontSize: 'var(--text-sm)' }}>
                  <input type="radio" checked={type === 'INTERNAL_TEAM'} onChange={() => setType('INTERNAL_TEAM')} />
                  Internal Team Note
                </label>
                <label className="flex items-center gap-2" style={{ fontSize: 'var(--text-sm)' }}>
                  <input type="radio" checked={type === 'EXTERNAL_CLIENT'} onChange={() => setType('EXTERNAL_CLIENT')} />
                  Shared with Client
                </label>
              </div>
            </div>
          )}

          {/* Access Control Checkboxes */}
          <div style={{ padding: 'var(--space-3)', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)' }}>
            <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)', marginBottom: 8 }}>
              Restrict Access (Defaults to all if none selected)
            </h4>
            
            {/* Show team sharing options if team note */}
            {(isClient || type === 'EXTERNAL_CLIENT') && clientSubTeams.length > 0 && (
              <div className="mb-3">
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Allowed Client Sub-Teams:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {clientSubTeams.map((sub) => (
                    <label key={sub.id} className="flex items-center gap-1.5" style={{ fontSize: 'var(--text-xs)' }}>
                      <input type="checkbox" checked={selectedSubTeamIds.includes(sub.id)} onChange={() => toggleSubTeamSharing(sub.id)} />
                      {sub.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {!isClient && type === 'INTERNAL_TEAM' && teamMembers.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Allowed Team Members:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {teamMembers.map((m) => (
                    <label key={m.id} className="flex items-center gap-1.5" style={{ fontSize: 'var(--text-xs)' }}>
                      <input type="checkbox" checked={selectedProfileIds.includes(m.id)} onChange={() => toggleProfileSharing(m.id)} />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn--primary btn--sm" disabled={isPending}>
              Create Note
            </button>
          </div>
        </form>
      )}

      {/* Editing note sharing settings inline */}
      {editingAccessNote && (
        <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              Edit Sharing settings: &quot;{editingAccessNote.title}&quot;
            </h3>
            <button onClick={() => setEditingAccessNote(null)} className="btn btn--ghost btn--sm btn--icon">
              <X size={14} />
            </button>
          </div>

          <div style={{ padding: 'var(--space-3)', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)' }}>
            {editingAccessNote.type === 'EXTERNAL_CLIENT' && clientSubTeams.length > 0 && (
              <div className="mb-3">
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Allowed Client Sub-Teams:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {clientSubTeams.map((sub) => (
                    <label key={sub.id} className="flex items-center gap-1.5" style={{ fontSize: 'var(--text-xs)' }}>
                      <input type="checkbox" checked={selectedSubTeamIds.includes(sub.id)} onChange={() => toggleSubTeamSharing(sub.id)} />
                      {sub.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {editingAccessNote.type === 'INTERNAL_TEAM' && teamMembers.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Allowed Team Members:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {teamMembers.map((m) => (
                    <label key={m.id} className="flex items-center gap-1.5" style={{ fontSize: 'var(--text-xs)' }}>
                      <input type="checkbox" checked={selectedProfileIds.includes(m.id)} onChange={() => toggleProfileSharing(m.id)} />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <button onClick={() => setEditingAccessNote(null)} className="btn btn--secondary btn--sm">
              Cancel
            </button>
            <button onClick={() => handleSaveAccess(editingAccessNote.id)} className="btn btn--primary btn--sm" disabled={isPending}>
              Save Sharing Rules
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No notes found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {notes.map((note) => {
            const isCreator = note.creatorId === userId
            const isLeadOrAdmin = userRole === 'ADMIN' || userTeamRole === 'TEAM_LEAD'
            const isClientEditor = isClient && note.type === 'EXTERNAL_CLIENT'

            return (
              <div key={note.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      {note.type === 'INTERNAL_TEAM' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                          <Lock size={10} /> Internal Team
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                          <Eye size={10} /> Shared with Client
                        </span>
                      )}
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        By {note.creator.name} · {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(note.createdAt))}
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{note.title}</div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{note.content}</p>

                    {(note.allowedProfileIds.length > 0 || note.allowedSubTeamIds.length > 0) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
                        <Users size={11} /> Restricted Sharing Enabled
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                    {(isCreator || isLeadOrAdmin || isClientEditor) && (
                      <button onClick={() => {
                        setEditingAccessNote(note)
                        setSelectedProfileIds(note.allowedProfileIds)
                        setSelectedSubTeamIds(note.allowedSubTeamIds)
                        setShowCreate(false)
                      }} title="Edit Sharing" className="btn btn--secondary btn--sm btn--icon">
                        Share
                      </button>
                    )}
                    {(isCreator || isLeadOrAdmin) && (
                      <button onClick={() => handleDelete(note.id)} title="Delete" className="btn btn--ghost btn--sm btn--icon" style={{ color: 'var(--color-danger)' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
