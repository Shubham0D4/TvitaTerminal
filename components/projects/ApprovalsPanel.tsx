'use client'

import { useState, useTransition, useActionState } from 'react'
import { Plus, X, Check, XCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { createApproval, respondToApproval, type ApprovalFormState } from '@/app/(admin)/admin/projects/milestoneActions'
import type { ClientApproval } from '@prisma/client'

interface Props {
  projectId: string
  isLead: boolean
  isClient: boolean
  approvals: ClientApproval[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING:            { label: 'Awaiting Response', color: '#f59e0b' },
  APPROVED:           { label: 'Approved ✓',         color: '#10b981' },
  REJECTED:           { label: 'Rejected',            color: '#ef4444' },
  REVISION_REQUESTED: { label: 'Revision Requested', color: '#8b5cf6' },
}

const initial: ApprovalFormState = {}

export default function ApprovalsPanel({ projectId, isLead, isClient, approvals: initialApprovals }: Props) {
  const [approvals, setApprovals] = useState(initialApprovals)
  const [showCreate, setShowCreate] = useState(false)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [clientNote, setClientNote] = useState('')
  const [isPending, startTransition] = useTransition()

  const createBound = createApproval.bind(null, projectId)
  const [, formAction, creating] = useActionState(createBound, initial)

  const handleRespond = (approvalId: string, response: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED') => {
    startTransition(async () => {
      const res = await respondToApproval(approvalId, response, clientNote)
      if (res.success) {
        toast.success(res.message)
        setApprovals((prev) => prev.map((a) => a.id === approvalId ? { ...a, status: response, clientNote, respondedAt: new Date() } : a))
        setRespondingId(null)
        setClientNote('')
      } else toast.error(res.message)
    })
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
          Approvals
          {approvals.filter((a) => a.status === 'PENDING').length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 11, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '1px 8px', borderRadius: 10, fontWeight: 700 }}>
              {approvals.filter((a) => a.status === 'PENDING').length} pending
            </span>
          )}
        </h2>
        {isLead && (
          <button type="button" onClick={() => setShowCreate(!showCreate)} className="btn btn--ghost btn--sm">
            {showCreate ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Request Approval</>}
          </button>
        )}
      </div>

      {/* Create form (lead only) */}
      {isLead && showCreate && (
        <form
          action={async (fd) => {
            const res = await formAction(fd) as unknown as ApprovalFormState
            if (res?.success) { toast.success(res.message!); setShowCreate(false) }
            else if (res?.message) toast.error(res.message)
          }}
          style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}
        >
          <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
            <label className="form-label" htmlFor="ap-title">Title <span className="form-required">*</span></label>
            <input id="ap-title" name="title" className="form-input" placeholder="e.g. Design Phase Sign-off" required />
          </div>
          <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
            <label className="form-label" htmlFor="ap-desc">Description / What needs approval?</label>
            <textarea id="ap-desc" name="description" className="form-textarea" rows={2} placeholder="Describe what the client needs to review and approve…" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className={`btn btn--primary btn--sm${creating ? ' btn--loading' : ''}`} disabled={creating}>
              {creating ? '' : 'Send to Client'}
            </button>
          </div>
        </form>
      )}

      {approvals.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          No approval requests yet.{isLead ? ' Click "+ Request Approval" to create one.' : ''}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {approvals.map((a) => {
            const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.PENDING
            const isPending_ = a.status === 'PENDING'
            return (
              <div key={a.id} style={{ background: 'var(--bg-elevated)', border: `1px solid ${isPending_ ? 'rgba(245,158,11,0.3)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, background: `${cfg.color}22`, color: cfg.color, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{a.title}</div>
                    {a.description && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>{a.description}</p>}
                    {a.clientNote && (
                      <div style={{ marginTop: 8, padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', borderLeft: `3px solid ${cfg.color}` }}>
                        <span style={{ color: 'var(--text-muted)' }}>Client note: </span>{a.clientNote}
                      </div>
                    )}
                  </div>
                </div>

                {/* Client response buttons */}
                {isClient && isPending_ && (
                  <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
                    {respondingId === a.id ? (
                      <div>
                        <textarea
                          value={clientNote}
                          onChange={(e) => setClientNote(e.target.value)}
                          className="form-textarea"
                          rows={2}
                          placeholder="Add a note (optional)…"
                          style={{ marginBottom: 'var(--space-3)' }}
                        />
                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                          <button onClick={() => handleRespond(a.id, 'APPROVED')} className="btn btn--primary btn--sm" disabled={isPending}>
                            <Check size={13} /> Approve
                          </button>
                          <button onClick={() => handleRespond(a.id, 'REVISION_REQUESTED')} className="btn btn--secondary btn--sm" disabled={isPending}>
                            <RefreshCw size={13} /> Request Revision
                          </button>
                          <button onClick={() => handleRespond(a.id, 'REJECTED')} className="btn btn--ghost btn--sm" disabled={isPending} style={{ color: 'var(--color-danger)' }}>
                            <XCircle size={13} /> Reject
                          </button>
                          <button onClick={() => { setRespondingId(null); setClientNote('') }} className="btn btn--ghost btn--sm">
                            <X size={13} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button className="btn btn--primary btn--sm" onClick={() => setRespondingId(a.id)}>
                        Respond to this approval request
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
