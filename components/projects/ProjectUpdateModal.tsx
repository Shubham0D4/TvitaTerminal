'use client'

import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { publishProjectUpdate } from '@/app/(team)/team/projects/projectUpdateActions'
import toast from 'react-hot-toast'

interface ProjectUpdateModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

export default function ProjectUpdateModal({ projectId, isOpen, onClose }: ProjectUpdateModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [clientVisible, setClientVisible] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    setSubmitting(true)
    const res = await publishProjectUpdate({
      projectId,
      title,
      content,
      clientVisible,
    })
    setSubmitting(false)

    if (res.success) {
      toast.success(res.message)
      onClose()
    } else {
      toast.error(res.message)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="flex items-center gap-2">
            <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
            <h2 className="modal__title">Publish Project Revision</h2>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            <div className="form-group">
              <label className="form-label">
                Revision Title <span className="form-required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Revision 2: Updated Design Specs & Feature Adjustments"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Revision Details / Content <span className="form-required">*</span>
              </label>
              <textarea
                className="form-textarea"
                placeholder="Share key revision notes, changed deliverables, or client feedback adjustments..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="clientVisibleCheck"
                checked={clientVisible}
                onChange={(e) => setClientVisible(e.target.checked)}
              />
              <label htmlFor="clientVisibleCheck" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Make visible to Client in portal
              </label>
            </div>
          </div>

          <div className="modal__footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Publishing...' : 'Publish Revision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
