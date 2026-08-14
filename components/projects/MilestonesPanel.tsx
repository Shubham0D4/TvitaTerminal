'use client'

import { useState, useTransition, useActionState, ChangeEvent } from 'react'
import { Plus, X, Trash2, CheckCircle2, PlayCircle, PauseCircle, Image as ImageIcon, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { createMilestone, updateMilestoneStatus, deleteMilestone, type MilestoneFormState } from '@/app/(admin)/admin/projects/milestoneActions'
import type { Milestone } from '@prisma/client'

type MilestoneWithAssignee = Milestone & { assignee?: { name: string } | null; imageUrls?: string[] }

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

const initial: MilestoneFormState = {}

export default function MilestonesPanel({ projectId, isLead, milestones: initialMilestones, projectMembers }: Props) {
  const [milestones, setMilestones] = useState(initialMilestones)
  const [showCreate, setShowCreate] = useState(false)
  const [autoAssign, setAutoAssign] = useState(false)
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const createBound = createMilestone.bind(null, projectId)
  const [state, formAction, creating] = useActionState(createBound, initial)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      const previews = files.map((file) => URL.createObjectURL(file))
      setPreviewImages(previews)
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

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
          Milestones ({milestones.length})
        </h2>
        {isLead && (
          <button type="button" onClick={() => setShowCreate(!showCreate)} className="btn btn--ghost btn--sm">
            {showCreate ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New Milestone</>}
          </button>
        )}
      </div>

      {/* Create form */}
      {isLead && showCreate && (
        <form
          action={async (fd) => {
            const res = await formAction(fd) as unknown as MilestoneFormState
            if (res?.success) {
              toast.success('Milestone created')
              setShowCreate(false)
              setPreviewImages([])
            } else if (res?.message) {
              toast.error(res.message!)
            }
          }}
          style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="settings-grid" style={{ marginBottom: 'var(--space-3)' }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label" htmlFor="ms-name">Milestone Goal Name <span className="form-required">*</span></label>
              <input id="ms-name" name="name" className="form-input" placeholder="e.g. Design Mockups Delivered" required />
              <p className="form-hint">Descriptive title of the milestone objective</p>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label" htmlFor="ms-desc">Milestone Scope / Description</label>
              <textarea id="ms-desc" name="description" className="form-textarea" rows={2} placeholder="What does completing this milestone involve?" />
              <p className="form-hint">Context, deliverables list, check-off tasks or specific boundaries for delivery</p>
            </div>

            {/* Internal Image Attachments */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label flex items-center gap-1.5" style={{ margin: 0 }}>
                  <ImageIcon size={14} style={{ color: 'var(--accent-primary)' }} />
                  Internal Images (Team Only)
                </label>
                <span className="flex items-center gap-1" style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 12 }}>
                  <Lock size={10} /> Not visible to Client
                </span>
              </div>
              <input
                type="file"
                name="images"
                accept="image/*"
                multiple
                className="form-input"
                onChange={handleFileChange}
                style={{ fontSize: 'var(--text-xs)' }}
              />
              <p className="form-hint">Upload visual reference material or proof-of-work updates for team inspect</p>
              {previewImages.length > 0 && (
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {previewImages.map((src, idx) => (
                    <div key={idx} style={{ position: 'relative', width: 54, height: 54, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                      {/* eslint-disable-next-img-element */}
                      <img src={src} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ms-due">Due Date</label>
              <input id="ms-due" name="dueDate" type="date" className="form-input" />
              <p className="form-hint">Deadline date for the work</p>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ms-role">Assign Role</label>
              <select id="ms-role" name="assigneeRole" className="form-select">
                <option value="">— Any Role —</option>
                <option value="DEVELOPER">Developer</option>
                <option value="TESTER">Tester</option>
                <option value="TEAM_LEAD">Lead</option>
              </select>
              <p className="form-hint">Assigned contributor category profile</p>
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)', height: 38 }}>
                <input type="checkbox" name="autoAssign" id="ms-auto" style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
                  checked={autoAssign} onChange={(e) => setAutoAssign(e.target.checked)} />
                Auto-assign (least busy)
              </label>
              <p className="form-hint">Automated selection of staff member with lowest load</p>
            </div>

            {!autoAssign && (
              <div className="form-group">
                <label className="form-label" htmlFor="ms-assignee">Assign Contributor</label>
                <select id="ms-assignee" name="assigneeId" className="form-select">
                  <option value="">— Unassigned —</option>
                  {projectMembers.map((m) => (
                    <option key={m.profileId} value={m.profileId}>
                      {m.profile.name} ({m.role})
                    </option>
                  ))}
                </select>
                <p className="form-hint">Manually assign a specific project developer, lead, or tester</p>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className={`btn btn--primary btn--sm${creating ? ' btn--loading' : ''}`} disabled={creating}>
              {creating ? '' : 'Create Milestone'}
            </button>
          </div>
        </form>
      )}

      {/* Milestones list */}
      {milestones.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          No milestones yet. {isLead ? 'Click "+ New Milestone" to create the first one.' : 'Your lead will create milestones to track progress.'}
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
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                    {m.name}
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
                  {isLead && (
                    <button className="btn btn--ghost btn--icon" onClick={() => handleDelete(m.id)} disabled={isPending} style={{ width: 28, height: 28 }} title="Delete">
                      <Trash2 size={13} style={{ color: 'var(--color-danger)' }} />
                    </button>
                  )}
                </div>
              </div>
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
