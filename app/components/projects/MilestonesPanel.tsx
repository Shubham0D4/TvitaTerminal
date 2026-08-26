'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, PlayCircle, PauseCircle, Lock, ChevronDown, ChevronUp, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { updateMilestoneStatus } from '@/app/(admin)/admin/projects/milestoneActions'
import type { Milestone } from '@prisma/client'
import { apiClient } from '@/lib/utils/api-client'

type MilestoneWithAssignee = Milestone & {
  assignee?: { name: string } | null
  imageUrls?: string[]
  tasks?: any[]
}

interface Props {
  projectId: string
  isLead: boolean
  milestones: MilestoneWithAssignee[]
  projectMembers: { profileId: string; role: string; profile: { id: string; name: string } }[]
}

const STATUS_COLORS: Record<string, string> = {
  PLANNED: '#64748b', IN_PROGRESS: '#f59e0b', COMPLETED: '#10b981',
  BLOCKED: '#ef4444', CLIENT_REVIEW: '#8b5cf6', APPROVED: '#06b6d4',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{ background: `${STATUS_COLORS[status] ?? '#64748b'}22`, color: STATUS_COLORS[status] ?? '#64748b', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
      {status.replace('_', ' ')}
    </span>
  )
}

export default function MilestonesPanel({ projectId, isLead, milestones: initialMilestones, projectMembers }: Props) {
  const [milestones, setMilestones] = useState(initialMilestones)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Collapsible and quick task creation state
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({})
  const [addingTaskMilestoneId, setAddingTaskMilestoneId] = useState<string | null>(null)

  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskPriority, setTaskPriority] = useState<'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM')
  const [taskDevId, setTaskDevId] = useState('')
  const [taskTesterId, setTaskTesterId] = useState('')
  const [taskClientVisible, setTaskClientVisible] = useState(false)
  const [taskCreating, setTaskCreating] = useState(false)

  const handleQuickAddTask = async (e: React.FormEvent, milestoneId: string) => {
    e.preventDefault()
    if (!taskTitle.trim()) {
      toast.error('Task title is required')
      return
    }
    setTaskCreating(true)
    try {
      const res = await apiClient('/api/team/tasks', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          milestoneId,
          title: taskTitle.trim(),
          description: taskDesc.trim() || undefined,
          priority: taskPriority,
          developerId: taskDevId || undefined,
          testerId: taskTesterId || undefined,
          clientVisible: taskClientVisible,
        }),
      })

      toast.success('Task created successfully')

      // Update tasks in local milestone state
      setMilestones((prev) =>
        prev.map((m) => {
          if (m.id === milestoneId) {
            const currentTasks = m.tasks || []
            return {
              ...m,
              tasks: [...currentTasks, res],
            }
          }
          return m
        })
      )

      // Reset task form
      setTaskTitle('')
      setTaskDesc('')
      setTaskPriority('MEDIUM')
      setTaskDevId('')
      setTaskTesterId('')
      setTaskClientVisible(false)
      setAddingTaskMilestoneId(null)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create task')
    } finally {
      setTaskCreating(false)
    }
  }

  const handleStatusChange = (milestoneId: string, status: Parameters<typeof updateMilestoneStatus>[1]) => {
    startTransition(async () => {
      const res = await updateMilestoneStatus(milestoneId, status)
      if (res.success) {
        toast.success(res.message)
        setMilestones((prev) => prev.map((m) => m.id === milestoneId ? {
          ...m, status,
          clientVisible: status === 'COMPLETED',
          completedDate: status === 'COMPLETED' ? new Date() : null,
        } : m))
      } else toast.error(res.message)
    })
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
          Process Stages ({milestones.length})
        </h2>
      </div>

      {/* Milestones list */}
      {milestones.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          No milestones set.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {milestones.map((m) => (
            <div key={m.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
              <div className="flex items-start justify-between gap-3">
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={m.status} />
                    {m.clientVisible && (
                      <span style={{ fontSize: 9, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                        CLIENT VISIBLE
                      </span>
                    )}
                    {m.imageUrls && m.imageUrls.length > 0 && (
                      <span className="flex items-center gap-1" style={{ fontSize: 9, color: 'var(--accent-primary)', background: 'rgba(99,102,241,0.12)', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                        <Lock size={9} /> {m.imageUrls.length} internal image{m.imageUrls.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div
                    style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}
                    onClick={() => setExpandedMilestones(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                  >
                    {m.name}
                    {expandedMilestones[m.id] ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                  {m.description && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{m.description}</div>
                  )}

                  {/* Internal Attached Images Thumbnails */}
                  {m.imageUrls && m.imageUrls.length > 0 && (
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
                      {m.imageUrls.map((url, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedImage(url)}
                          style={{
                            width: 60, height: 60, borderRadius: 'var(--radius-md)', overflow: 'hidden',
                            border: '1px solid var(--border-subtle)', cursor: 'pointer', position: 'relative',
                            transition: 'transform 0.15s ease',
                          }}
                          className="hover:scale-105"
                          title="Click to view internal image"
                        >
                          {/* eslint-disable-next-img-element */}
                          <img src={url} alt={`Internal attachment ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {m.dueDate && <span>Due: {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(m.dueDate))}</span>}
                    {m.assignee && <span>→ {m.assignee.name}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                  {/* Status actions */}
                  {m.status === 'PLANNED' && (
                    <button className="btn btn--ghost btn--xs" onClick={() => handleStatusChange(m.id, 'IN_PROGRESS')} title="Start" disabled={isPending}>
                      <PlayCircle size={14} style={{ color: '#f59e0b' }} />
                    </button>
                  )}
                  {m.status === 'IN_PROGRESS' && (
                    <>
                      <button className="btn btn--ghost btn--xs" onClick={() => handleStatusChange(m.id, 'PLANNED')} title="Pause" disabled={isPending}>
                        <PauseCircle size={14} style={{ color: '#64748b' }} />
                      </button>
                      <button className="btn btn--ghost btn--xs" onClick={() => handleStatusChange(m.id, 'COMPLETED')} title="Mark Complete" disabled={isPending}>
                        <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                      </button>
                    </>
                  )}
                  {m.status === 'COMPLETED' && isLead && (
                    <button className="btn btn--ghost btn--xs" onClick={() => handleStatusChange(m.id, 'IN_PROGRESS')} title="Re-open" disabled={isPending} style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      Re-open
                    </button>
                  )}

                </div>
              </div>

              {/* Collapsible Tasks block */}
              {expandedMilestones[m.id] && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>Stage Tasks ({m.tasks?.length ?? 0})</span>
                    </div>
                    {isLead && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--xs"
                        onClick={() => setAddingTaskMilestoneId(addingTaskMilestoneId === m.id ? null : m.id)}
                        style={{ fontSize: 10, padding: '2px 6px' }}
                      >
                        {addingTaskMilestoneId === m.id ? 'Cancel' : '+ Quick Add Task'}
                      </button>
                    )}
                  </div>

                  {/* Quick Add Task Form */}
                  {isLead && addingTaskMilestoneId === m.id && (
                    <form
                      onSubmit={(e) => handleQuickAddTask(e, m.id)}
                      style={{
                        marginBottom: 12,
                        padding: 12,
                        background: '#ffffff',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div style={{ gridColumn: 'span 2' }}>
                          <input
                            placeholder="Task Title *"
                            className="form-input"
                            style={{ background: '#ffffff', fontSize: 12, padding: '6px 8px', height: 'auto', width: '100%' }}
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                            required
                          />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <textarea
                            placeholder="Description (optional)"
                            className="form-input"
                            style={{ background: '#ffffff', fontSize: 12, padding: '6px 8px', height: 'auto', width: '100%' }}
                            rows={2}
                            value={taskDesc}
                            onChange={(e) => setTaskDesc(e.target.value)}
                          />
                        </div>
                        <div>
                          <select
                            className="form-select"
                            style={{ background: '#ffffff', fontSize: 12, padding: '4px 8px', height: 'auto', width: '100%' }}
                            value={taskPriority}
                            onChange={(e) => setTaskPriority(e.target.value as any)}
                          >
                            <option value="LOW">Low Priority</option>
                            <option value="MEDIUM">Medium Priority</option>
                            <option value="HIGH">High Priority</option>
                            <option value="URGENT">Urgent Priority</option>
                          </select>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <select
                            className="form-select"
                            style={{ background: '#ffffff', fontSize: 12, padding: '4px 8px', height: 'auto', width: '100%' }}
                            value={taskDevId}
                            onChange={(e) => setTaskDevId(e.target.value)}
                          >
                            <option value="">Auto-assign (Least Busy Member)</option>
                            {projectMembers
                              .map((member) => (
                                <option key={member.profileId} value={member.profileId}>
                                  {member.profile.name} ({member.role})
                                </option>
                              ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={taskClientVisible}
                              onChange={(e) => setTaskClientVisible(e.target.checked)}
                            />
                            Client Visible
                          </label>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          type="submit"
                          className="btn btn--primary btn--xs"
                          style={{ padding: '4px 10px' }}
                          disabled={taskCreating}
                        >
                          {taskCreating ? 'Creating...' : 'Save Task'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Tasks List */}
                  {m.tasks && m.tasks.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {m.tasks.map((task: any) => (
                        <div
                          key={task.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: 'var(--bg-overlay)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                            fontSize: 11,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{task.title}</span>
                            <span
                              className={`badge`}
                              style={{
                                fontSize: 8,
                                padding: '1px 4px',
                                background:
                                  task.priority === 'URGENT'
                                    ? 'rgba(239, 68, 68, 0.1)'
                                    : 'rgba(99,102,241,0.1)',
                                color:
                                  task.priority === 'URGENT' ? 'red' : 'var(--accent-primary)',
                              }}
                            >
                              {task.priority}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                            <span>Status: {task.status.replace(/_/g, ' ')}</span>
                            {(task.developer || task.tester) && (
                              <span>· ({task.developer?.name || task.tester?.name})</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>No tasks set for this milestone.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Modal Lightbox */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              style={{
                position: 'absolute', top: -40, right: 0, color: '#fff', background: 'transparent',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14,
              }}
            >
              <X size={20} /> Close
            </button>
            {/* eslint-disable-next-img-element */}
            <img
              src={selectedImage}
              alt="Internal attached document preview"
              style={{ maxHeight: '85vh', maxWidth: '90vw', borderRadius: 'var(--radius-lg)', objectFit: 'contain', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
