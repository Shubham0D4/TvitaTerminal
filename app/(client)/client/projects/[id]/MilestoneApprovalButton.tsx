'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import type { MilestoneStatus } from '@prisma/client'

interface MilestoneApprovalButtonProps {
  milestoneId: string
  currentStatus: MilestoneStatus
}

export default function MilestoneApprovalButton({
  milestoneId,
  currentStatus,
}: MilestoneApprovalButtonProps) {
  const [isPending, setIsPending] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedback, setFeedback] = useState('')

  const handleApprove = async () => {
    setIsPending(true)
    const res = await apiClient(`/api/client/projects/milestones/${milestoneId}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'approve' }),
    })
    setIsPending(false)

    if (res.success) {
      toast.success('Milestone approved.')
      window.location.reload()
    } else {
      toast.error(res.error?.message || 'Failed to approve milestone.')
    }
  }

  const handleRequestChanges = async () => {
    if (!feedback.trim()) {
      toast.error('Please enter feedback for requested changes.')
      return
    }

    setIsPending(true)
    const res = await apiClient(`/api/client/projects/milestones/${milestoneId}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'request_changes', feedback }),
    })
    setIsPending(false)

    if (res.success) {
      toast.success('Revision request submitted.')
      setShowFeedbackModal(false)
      setFeedback('')
      window.location.reload()
    } else {
      toast.error(res.error?.message || 'Failed to submit revision request.')
    }
  }

  if (currentStatus === 'APPROVED' || currentStatus === 'COMPLETED') {
    return <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 'var(--font-semibold)' }}>✓ Milestone Approved</span>
  }

  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
      <button
        type="button"
        disabled={isPending}
        onClick={handleApprove}
        className="btn btn--success btn--xs"
        style={{ fontSize: 10, background: 'var(--color-success)', color: '#fff' }}
      >
        Approve Deliverable
      </button>

      <button
        type="button"
        disabled={isPending}
        onClick={() => setShowFeedbackModal(true)}
        className="btn btn--ghost btn--xs"
        style={{ fontSize: 10, color: 'var(--color-warning)' }}
      >
        Request Changes
      </button>

      {showFeedbackModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div className="card" style={{ maxWidth: 460, width: '90%' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              Request Revisions for Milestone
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              Describe what changes are needed before this milestone can be approved.
            </p>

            <textarea
              className="form-input"
              rows={4}
              placeholder="e.g. Please update the color scheme on the header and fix mobile alignment."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              style={{ marginBottom: 'var(--space-4)' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="btn btn--ghost btn--xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleRequestChanges}
                className="btn btn--primary btn--xs"
              >
                Submit Revisions Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
