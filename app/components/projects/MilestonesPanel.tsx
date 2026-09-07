'use client'

import { useState, useTransition, useActionState, ChangeEvent, useEffect } from 'react'
import { Plus, X, Trash2, CheckCircle2, PlayCircle, PauseCircle, Image as ImageIcon, Lock, ChevronDown, ChevronUp, Check, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { createMilestone, updateMilestoneStatus, deleteMilestone, type MilestoneFormState } from '@/app/(admin)/admin/projects/milestoneActions'
import type { Milestone } from '@prisma/client'
import { apiClient } from '@/lib/utils/api-client'
import { PROCESS_STAGES, stageOf, type ProcessStageKey } from '@/lib/process/stages'

type MilestoneWithAssignee = Milestone & {
  assignee?: { name: string } | null
  imageUrls?: string[]
  tasks?: any[]
}

interface Props {
  projectId: string
  isLead: boolean
  userId: string
  userRole: string
  milestones: MilestoneWithAssignee[]
  projectMembers: { profileId: string; role: string; profile: { id: string; name: string } }[]
}

const STATUS_COLORS: Record<string, string> = {
  PLANNED: '#64748b',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#10b981',
  BLOCKED: '#ef4444',
  CLIENT_REVIEW: '#8b5cf6',
  APPROVED: '#06b6d4',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{ background: `${STATUS_COLORS[status] ?? '#64748b'}22`, color: STATUS_COLORS[status] ?? '#64748b', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
      {status.replace('_', ' ')}
    </span>
  )
}

const initial: MilestoneFormState = {}

export default function MilestonesPanel({
  projectId,
  isLead,
  userId,
  userRole,
  milestones: initialMilestones,
  projectMembers,
}: Props) {
  const [milestones, setMilestones] = useState(initialMilestones)
  useEffect(() => {
    setMilestones(initialMilestones)
  }, [initialMilestones])
  const [creatingStage, setCreatingStage] = useState<ProcessStageKey | null>(null)
  const [autoAssign, setAutoAssign] = useState(false)
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({})
  const [addingTaskMilestoneId, setAddingTaskMilestoneId] = useState<string | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskPriority, setTaskPriority] = useState<'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM')
  const [taskDevId, setTaskDevId] = useState('')
  const [taskClientVisible, setTaskClientVisible] = useState(false)
  const [taskCreating, setTaskCreating] = useState(false)

  const isClient = userRole === 'CLIENT'
  const canActOn = (m: MilestoneWithAssignee) =>
    !isClient && (isLead || m.assigneeId === userId)

  const handleQuickAddTask = async (e: React.FormEvent, milestoneId: string) => {
    e.preventDefault()
    if (!taskTitle.trim()) {
      toast.error('Task title is required')
      return
    }
    setTaskCreating(true)
    try {
      const created = await apiClient.post('/api/team/tasks', {
        projectId,
        milestoneId,
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        priority: taskPriority,
        developerId: taskDevId || undefined,
        clientVisible: taskClientVisible,
      })

      toast.success('Task created successfully')
      setMilestones((prev) =>
        prev.map((m) => {
          if (m.id === milestoneId) {
            return { ...m, tasks: [...(m.tasks || []), created] }
          }
          return m
        })
      )
      setTaskTitle('')
      setTaskDesc('')
      setTaskPriority('MEDIUM')
      setTaskDevId('')
      setTaskClientVisible(false)
      setAddingTaskMilestoneId(null)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create task')
    } finally {
      setTaskCreating(false)
    }
  }

  const createBound = createMilestone.bind(null, projectId)
  const [, formAction, creating] = useActionState(createBound, initial)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setPreviewImages(files.map((file) => URL.createObjectURL(file)))
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

  const handleDelete = (milestoneId: string) => {
    if (!confirm('Delete this milestone?')) return
    startTransition(async () => {
      const res = await deleteMilestone(milestoneId)
      if (res.success) {
        toast.success(res.message)
        setMilestones((prev) => prev.filter((m) => m.id !== milestoneId))
      } else toast.error(res.message)
    })
  }

  const grouped = PROCESS_STAGES.map((stage) => {
    const items = milestones.filter((m) => stageOf(m) === stage.key)
    const done = items.filter((m) => m.status === 'COMPLETED').length
    return { stage, items, done }
  })

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
            Milestones
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Each process stage can have milestones the project lead defines and assigns — including to themselves.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {grouped.map(({ stage, items, done }) => (
          <section
            key={stage.key}
            style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              background: 'var(--bg-elevated)',
            }}
          >
            <div className="flex items-center justify-between gap-3" style={{ marginBottom: items.length || creatingStage === stage.key ? 12 : 0 }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{stage.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {items.length === 0 ? 'No milestones yet' : `${done} of ${items.length} complete`}
                </div>
              </div>
              {isLead && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    setCreatingStage(creatingStage === stage.key ? null : stage.key)
                    setPreviewImages([])
                    setAutoAssign(false)
                  }}
                >
                  {creatingStage === stage.key ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add milestone</>}
                </button>
              )}
            </div>

            {isLead && creatingStage === stage.key && (
              <form
                action={async (fd) => {
                  const res = await formAction(fd) as unknown as MilestoneFormState
                  if (res?.success) {
                    toast.success('Milestone created')
                    setCreatingStage(null)
                    setPreviewImages([])
                  } else if (res?.message) {
                    toast.error(res.message)
                  }
                }}
                style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}
              >
                <input type="hidden" name="stage" value={stage.key} />
                <div className="settings-grid" style={{ marginBottom: 'var(--space-3)' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label" htmlFor={`ms-name-${stage.key}`}>Milestone name <span className="form-required">*</span></label>
                    <input id={`ms-name-${stage.key}`} name="name" className="form-input" placeholder="e.g. Design mockups delivered" required />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label" htmlFor={`ms-desc-${stage.key}`}>Description</label>
                    <textarea id={`ms-desc-${stage.key}`} name="description" className="form-textarea" rows={2} placeholder="Deliverables and boundaries for this milestone" />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="form-label flex items-center gap-1.5" style={{ margin: 0 }}>
                        <ImageIcon size={14} style={{ color: 'var(--accent-primary)' }} />
                        Internal images (team only)
                      </label>
                      <span className="flex items-center gap-1" style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 12 }}>
                        <Lock size={10} /> Not visible to client
                      </span>
                    </div>
                    <input type="file" name="images" accept="image/*" multiple className="form-input" onChange={handleFileChange} style={{ fontSize: 'var(--text-xs)' }} />
                    {previewImages.length > 0 && (
                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                        {previewImages.map((src, idx) => (
                          <div key={idx} style={{ position: 'relative', width: 54, height: 54, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor={`ms-due-${stage.key}`}>Due date</label>
                    <input id={`ms-due-${stage.key}`} name="dueDate" type="date" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor={`ms-role-${stage.key}`}>Assign role</label>
                    <select id={`ms-role-${stage.key}`} name="assigneeRole" className="form-select">
                      <option value="">— Any role —</option>
                      <option value="MEMBER">Team member</option>
                      <option value="TEAM_LEAD">Team lead</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)', height: 38 }}>
                      <input
                        type="checkbox"
                        name="autoAssign"
                        style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
                        checked={autoAssign}
                        onChange={(e) => setAutoAssign(e.target.checked)}
                      />
                      Auto-assign (least busy, includes lead)
                    </label>
                  </div>
                  {!autoAssign && (
                    <div className="form-group">
                      <label className="form-label" htmlFor={`ms-assignee-${stage.key}`}>Assign to</label>
                      <select id={`ms-assignee-${stage.key}`} name="assigneeId" className="form-select">
                        <option value="">— Unassigned —</option>
                        {projectMembers.map((m) => (
                          <option key={m.profileId} value={m.profileId}>
                            {m.profile.name} ({m.role === 'LEAD' ? 'Project lead' : m.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className={`btn btn--primary btn--sm${creating ? ' btn--loading' : ''}`} disabled={creating}>
                    {creating ? '' : 'Create milestone'}
                  </button>
                </div>
              </form>
            )}

            {items.map((m) => {
              const isCompleted = m.status === 'COMPLETED'
              const isInProgress = m.status === 'IN_PROGRESS'
              const canAct = canActOn(m)

              let statusIcon = (
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '2px solid var(--border-default)' }}>
                  <Clock size={12} />
                </div>
              )
              if (isCompleted) {
                statusIcon = (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Check size={13} strokeWidth={2.5} />
                  </div>
                )
              } else if (isInProgress) {
                statusIcon = (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <PlayCircle size={14} />
                  </div>
                )
              }

              return (
                <div key={m.id} style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 10 }}>
                  <div style={{ paddingTop: 16 }}>{statusIcon}</div>
                  <div
                    style={{
                      flex: 1,
                      background: '#ffffff',
                      border: isCompleted ? '1px solid rgba(16, 185, 129, 0.15)' : isInProgress ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid var(--border-subtle)',
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <StatusBadge status={m.status} />
                          {m.clientVisible && !isClient && (
                            <span style={{ fontSize: 9, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                              CLIENT VISIBLE
                            </span>
                          )}
                        </div>
                        <div
                          style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', cursor: isClient ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                          onClick={() => {
                            if (isClient) return
                            setExpandedMilestones((prev) => ({ ...prev, [m.id]: !prev[m.id] }))
                          }}
                        >
                          <span>{m.name}</span>
                          {!isClient && (expandedMilestones[m.id] ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />)}
                        </div>
                        {m.description && (
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>{m.description}</div>
                        )}
                        {m.imageUrls && m.imageUrls.length > 0 && !isClient && (
                          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
                            {m.imageUrls.map((url, idx) => (
                              <div key={idx} onClick={() => setSelectedImage(url)} style={{ width: 60, height: 60, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt={`Attachment ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 8, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {m.dueDate && <span>Due: {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(m.dueDate))}</span>}
                          {!isClient && m.assignee && <span>Owner: <strong>{m.assignee.name}</strong></span>}
                          {!isClient && !m.assignee && <span>Unassigned</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                        {canAct && m.status === 'PLANNED' && (
                          <button className="btn btn--ghost btn--xs" onClick={() => handleStatusChange(m.id, 'IN_PROGRESS')} title="Start" disabled={isPending}>
                            <PlayCircle size={14} style={{ color: '#f59e0b' }} />
                          </button>
                        )}
                        {canAct && m.status === 'IN_PROGRESS' && (
                          <>
                            <button className="btn btn--ghost btn--xs" onClick={() => handleStatusChange(m.id, 'PLANNED')} title="Pause" disabled={isPending}>
                              <PauseCircle size={14} style={{ color: '#64748b' }} />
                            </button>
                            <button className="btn btn--ghost btn--xs" onClick={() => handleStatusChange(m.id, 'COMPLETED')} title="Mark complete" disabled={isPending}>
                              <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                            </button>
                          </>
                        )}
                        {isLead && m.status === 'COMPLETED' && (
                          <button className="btn btn--ghost btn--xs" onClick={() => handleStatusChange(m.id, 'IN_PROGRESS')} title="Re-open" disabled={isPending} style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            Re-open
                          </button>
                        )}
                        {isLead && (
                          <button className="btn btn--ghost btn--icon" onClick={() => handleDelete(m.id)} disabled={isPending} style={{ width: 28, height: 28 }} title="Delete">
                            <Trash2 size={13} style={{ color: 'var(--color-danger)' }} />
                          </button>
                        )}
                      </div>
                    </div>

                    {expandedMilestones[m.id] && !isClient && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                        <div className="flex items-center justify-between mb-3">
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Tasks ({m.tasks?.length ?? 0})</span>
                          {isLead && (
                            <button type="button" className="btn btn--ghost btn--xs" onClick={() => setAddingTaskMilestoneId(addingTaskMilestoneId === m.id ? null : m.id)} style={{ fontSize: 10 }}>
                              {addingTaskMilestoneId === m.id ? 'Cancel' : '+ Quick add task'}
                            </button>
                          )}
                        </div>
                        {isLead && addingTaskMilestoneId === m.id && (
                          <form onSubmit={(e) => handleQuickAddTask(e, m.id)} style={{ marginBottom: 12, padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <input placeholder="Task title *" className="form-input" style={{ fontSize: 12 }} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} required />
                            <textarea placeholder="Description (optional)" className="form-input" rows={2} style={{ fontSize: 12 }} value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
                            <select className="form-select" style={{ fontSize: 12 }} value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as any)}>
                              <option value="LOW">Low</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HIGH">High</option>
                              <option value="URGENT">Urgent</option>
                            </select>
                            <select className="form-select" style={{ fontSize: 12 }} value={taskDevId} onChange={(e) => setTaskDevId(e.target.value)}>
                              <option value="">Auto-assign (least busy, includes lead)</option>
                              {projectMembers.map((member) => (
                                <option key={member.profileId} value={member.profileId}>
                                  {member.profile.name} ({member.role === 'LEAD' ? 'Project lead' : member.role})
                                </option>
                              ))}
                            </select>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
                              <input type="checkbox" checked={taskClientVisible} onChange={(e) => setTaskClientVisible(e.target.checked)} />
                              Client visible
                            </label>
                            <div className="flex justify-end">
                              <button type="submit" className="btn btn--primary btn--xs" disabled={taskCreating}>
                                {taskCreating ? 'Creating...' : 'Save task'}
                              </button>
                            </div>
                          </form>
                        )}
                        {m.tasks && m.tasks.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {m.tasks.map((task: any) => (
                              <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', fontSize: 11 }}>
                                <span style={{ fontWeight: 600 }}>{task.title}</span>
                                <span style={{ color: 'var(--text-muted)' }}>
                                  {task.status?.replace(/_/g, ' ')}
                                  {(task.developer || task.tester) && ` · ${task.developer?.name || task.tester?.name}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>No tasks on this milestone.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </section>
        ))}
      </div>

      {selectedImage && (
        <div onClick={() => setSelectedImage(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button type="button" onClick={() => setSelectedImage(null)} style={{ position: 'absolute', top: -40, right: 0, color: '#fff', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <X size={20} /> Close
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedImage} alt="Attachment" style={{ maxHeight: '85vh', maxWidth: '90vw', borderRadius: 'var(--radius-lg)' }} />
          </div>
        </div>
      )}
    </div>
  )
}
