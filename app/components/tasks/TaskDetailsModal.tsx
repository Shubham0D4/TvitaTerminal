'use client'

import { useState } from 'react'
import { X, History, MessageSquare, User, Clock, ArrowRight } from 'lucide-react'
import { apiClient } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface TaskDetailsModalProps {
  task: any
  isOpen: boolean
  onClose: () => void
  isLeadOrAdmin: boolean
  projectMembers?: any[]
}

export default function TaskDetailsModal({
  task,
  isOpen,
  onClose,
  isLeadOrAdmin,
  projectMembers = [],
}: TaskDetailsModalProps) {
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [devId, setDevId] = useState(task?.developerId || '')
  const [testerId, setTesterId] = useState(task?.testerId || '')
  const [savingAssignments, setSavingAssignments] = useState(false)

  if (!isOpen || !task) return null

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return

    setSubmittingComment(true)
    const res = await apiClient(`/api/team/tasks/${task.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: commentText }),
    })
    setSubmittingComment(false)

    if (res.success) {
      toast.success('Comment added.')
      setCommentText('')
      onClose()
      window.location.reload()
    } else {
      toast.error(res.error?.message || 'Failed to add comment.')
    }
  }

  const handleSaveAssignments = async () => {
    setSavingAssignments(true)
    const res = await apiClient(`/api/team/tasks/${task.id}/assignments`, {
      method: 'PUT',
      body: JSON.stringify({
        developerId: devId || undefined,
        testerId: testerId || undefined,
      }),
    })
    setSavingAssignments(false)

    if (res.success) {
      toast.success('Assignments updated.')
      onClose()
      window.location.reload()
    } else {
      toast.error(res.error?.message || 'Failed to update assignments.')
    }
  }

  const teamMembers = projectMembers.filter((m) => m.profile.teamRole === 'MEMBER' || m.role === 'MEMBER')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal__header">
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {task.project?.client?.name} / {task.project?.name}
            </div>
            <h2 className="modal__title" style={{ marginTop: 2 }}>{task.title}</h2>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal__body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Status & Priority badges */}
          <div className="flex items-center gap-3">
            <span className="badge" style={{ background: 'var(--accent-primary-muted)', color: 'var(--accent-primary)' }}>
              Status: {task.status?.replace(/_/g, ' ')}
            </span>
            <span className="badge" style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
              Priority: {task.priority}
            </span>
          </div>

          {/* Task Description */}
          {task.description && (
            <div style={{ background: 'var(--bg-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--text-muted)', marginBottom: 4 }}>
                DESCRIPTION
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {task.description}
              </div>
            </div>
          )}

          {/* Reassign Team Members (Lead/Admin) */}
          {isLeadOrAdmin && (
            <div style={{ background: 'var(--bg-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--text-muted)', marginBottom: 8 }}>
                ASSIGN TEAM MEMBER (LEAD OVERRIDE)
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Assigned Team Member</label>
                  <select
                    className="form-select"
                    value={devId}
                    onChange={(e) => setDevId(e.target.value)}
                    style={{ fontSize: 'var(--text-xs)' }}
                  >
                    <option value="">Unassigned</option>
                    {projectMembers.map((d) => (
                      <option key={d.profile.id} value={d.profile.id}>{d.profile.name} ({d.role})</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveAssignments}
                disabled={savingAssignments}
                className="btn btn--secondary btn--xs"
                style={{ marginTop: 8 }}
              >
                {savingAssignments ? 'Saving...' : 'Update Assignment'}
              </button>
            </div>
          )}

          {/* Activity Trail / History Timeline */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History size={16} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                Activity Trail & History
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {task.activities && task.activities.length > 0 ? (
                task.activities.map((act: any) => (
                  <div
                    key={act.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3)',
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                        {act.actor?.name || 'System / User'}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ color: 'var(--text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="badge" style={{ fontSize: 10, background: 'var(--bg-overlay)' }}>
                        {act.action}
                      </span>
                      {act.fromValue && act.toValue && (
                        <span>
                          {act.fromValue.replace(/_/g, ' ')} <ArrowRight size={12} style={{ display: 'inline' }} /> {act.toValue.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    {act.note && (
                      <div style={{ color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                        {act.note}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  No activity history recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={16} style={{ color: 'var(--color-info)' }} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                Comments ({task.comments?.length || 0})
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              {task.comments && task.comments.length > 0 ? (
                task.comments.map((c: any) => (
                  <div
                    key={c.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3)',
                    }}
                  >
                    <div className="flex items-center justify-between" style={{ fontSize: 'var(--text-xs)' }}>
                      <span style={{ fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                        {c.author?.name}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                        {new Date(c.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
                      {c.content}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  No comments yet.
                </div>
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                className="form-input"
                placeholder="Add a comment to this task..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                style={{ flex: 1, fontSize: 'var(--text-xs)' }}
              />
              <button
                type="submit"
                className="btn btn--primary btn--sm"
                disabled={submittingComment}
              >
                {submittingComment ? 'Posting...' : 'Post'}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="modal__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
