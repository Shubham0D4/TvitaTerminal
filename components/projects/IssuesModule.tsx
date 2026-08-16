'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, X, MessageSquare, AlertCircle, CheckCircle, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@/shared/utilities/api-client'

interface Issue {
  id: string
  title: string
  description: string
  status: string
  priority: string
  creatorId: string
  creator: { id: string; name: string; role: string }
  createdAt: string
}

interface Props {
  projectId: string
  userRole: string
  userTeamRole: string | null
  userId: string
  hasAccess: boolean
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW: '#10b981',
  MEDIUM: '#3b82f6',
  HIGH: '#f59e0b',
  CRITICAL: '#ef4444',
}

const STATUS_COLOR: Record<string, string> = {
  OPEN: '#ef4444',
  IN_PROGRESS: '#3b82f6',
  RESOLVED: '#10b981',
  CLOSED: '#64748b',
}

export default function IssuesModule({ projectId, userRole, userTeamRole, userId, hasAccess }: Props) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')

  useEffect(() => {
    if (!hasAccess) return
    apiClient.get<Issue[]>(`/api/projects/${projectId}/issues`)
      .then((res) => {
        setIssues(res)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        toast.error('Failed to load project issues')
        setLoading(false)
      })
  }, [projectId, hasAccess])

  if (!hasAccess) {
    return (
      <div className="card text-center py-6">
        <p style={{ color: 'var(--text-muted)' }}>You do not have permission to access issues for this project.</p>
      </div>
    )
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !description) return

    startTransition(async () => {
      try {
        const newIssue = await apiClient.post<Issue>(`/api/projects/${projectId}/issues`, {
          title,
          description,
          priority,
        })
        setIssues((prev) => [newIssue, ...prev])
        toast.success('Issue reported successfully')
        setShowCreate(false)
        setTitle('')
        setDescription('')
        setPriority('MEDIUM')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to report issue'
        toast.error(msg)
      }
    })
  }

  const handleUpdateStatus = (issueId: string, status: string) => {
    startTransition(async () => {
      try {
        const updated = await apiClient.patch<Issue>(`/api/projects/issues/${issueId}`, { status })
        setIssues((prev) => prev.map((i) => i.id === issueId ? updated : i))
        toast.success(`Issue marked as ${status.replace(/_/g, ' ')}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update issue status'
        toast.error(msg)
      }
    })
  }

  const handleDelete = (issueId: string) => {
    if (!confirm('Are you sure you want to delete this issue?')) return

    startTransition(async () => {
      try {
        await apiClient.delete(`/api/projects/issues/${issueId}`)
        setIssues((prev) => prev.filter((i) => i.id !== issueId))
        toast.success('Issue deleted successfully')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to delete issue'
        toast.error(msg)
      }
    })
  }

  if (loading) {
    return <div className="card text-center py-6"><p style={{ color: 'var(--text-muted)' }}>Loading issues...</p></div>
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
          Issues Tracker
          {issues.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 11, background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '1px 8px', borderRadius: 10, fontWeight: 700 }}>
              {issues.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length} Active
            </span>
          )}
        </h2>
        <button type="button" onClick={() => setShowCreate(!showCreate)} className="btn btn--ghost btn--sm">
          {showCreate ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Report Issue</>}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="is-title">Issue Title *</label>
            <input id="is-title" value={title} onChange={(e) => setTitle(e.target.value)} className="form-input" placeholder="What is the problem?" required />
          </div>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="is-desc">Description *</label>
            <textarea id="is-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="form-textarea" rows={3} placeholder="Provide details on how to reproduce the issue..." required />
          </div>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="is-priority">Priority</label>
            <select id="is-priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="form-input">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn--primary btn--sm" disabled={isPending}>
              Submit Issue
            </button>
          </div>
        </form>
      )}

      {issues.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No issues reported for this project.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {issues.map((issue) => {
            const isCreatorOrLead = issue.creatorId === userId || userRole === 'ADMIN' || userTeamRole === 'TEAM_LEAD'
            return (
              <div key={issue.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, background: `${PRIORITY_COLOR[issue.priority]}22`, color: PRIORITY_COLOR[issue.priority], padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                        {issue.priority}
                      </span>
                      <span style={{ fontSize: 10, background: `${STATUS_COLOR[issue.status]}22`, color: STATUS_COLOR[issue.status], padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                        {issue.status.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        Reported by {issue.creator.name} ({issue.creator.role})
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{issue.title}</div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{issue.description}</p>
                  </div>
                  
                  {isCreatorOrLead && (
                    <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                      {issue.status !== 'RESOLVED' && issue.status !== 'CLOSED' ? (
                        <>
                          <button onClick={() => handleUpdateStatus(issue.id, 'IN_PROGRESS')} title="In Progress" className="btn btn--secondary btn--sm btn--icon">
                            <AlertCircle size={14} />
                          </button>
                          <button onClick={() => handleUpdateStatus(issue.id, 'RESOLVED')} title="Resolve" className="btn btn--primary btn--sm btn--icon" style={{ background: '#10b981', borderColor: '#10b981' }}>
                            <CheckCircle size={14} />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleUpdateStatus(issue.id, 'OPEN')} title="Reopen" className="btn btn--secondary btn--sm btn--icon">
                          Reopen
                        </button>
                      )}
                      <button onClick={() => handleDelete(issue.id)} title="Delete" className="btn btn--ghost btn--sm btn--icon" style={{ color: 'var(--color-danger)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
