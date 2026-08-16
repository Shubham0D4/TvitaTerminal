'use client'

import { useState } from 'react'
import { X, CheckSquare, Sparkles } from 'lucide-react'
import { apiClient } from '@/shared/utilities/api-client'
import toast from 'react-hot-toast'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  projects: any[]
}

export default function CreateTaskModal({ isOpen, onClose, projects }: CreateTaskModalProps) {
  const [projectId, setProjectId] = useState(projects[0]?.id || '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM')
  const [dueDate, setDueDate] = useState('')
  const [clientVisible, setClientVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId || !title.trim()) {
      toast.error('Please select a project and enter task title.')
      return
    }

    setSubmitting(true)
    const res = await apiClient('/api/team/tasks', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        clientVisible,
      }),
    })
    setSubmitting(false)

    if (res.success) {
      toast.success('Task created successfully.')
      onClose()
      window.location.reload()
    } else {
      toast.error(res.error?.message || 'Failed to create task.')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="flex items-center gap-2">
            <CheckSquare size={18} style={{ color: 'var(--accent-primary)' }} />
            <h2 className="modal__title">Create New Task</h2>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            {/* Project Selection */}
            <div className="form-group">
              <label className="form-label">
                Project <span className="form-required">*</span>
              </label>
              <select
                className="form-select"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.client?.name} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Task Title */}
            <div className="form-group">
              <label className="form-label">
                Task Title <span className="form-required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Implement GST Invoicing Logic"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                placeholder="Detailed task requirements and expectations..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Priority & Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* Auto Assignment Badge */}
            <div style={{ background: 'var(--accent-primary-muted)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} />
              <span>
                <strong>Least-Busy Auto-Assignment:</strong> Developer & Tester will be assigned automatically based on workload if not specified by Lead.
              </span>
            </div>

            {/* Client Visibility */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="clientVisibleTask"
                checked={clientVisible}
                onChange={(e) => setClientVisible(e.target.checked)}
              />
              <label htmlFor="clientVisibleTask" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Visible to Client in Portal
              </label>
            </div>
          </div>

          <div className="modal__footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
