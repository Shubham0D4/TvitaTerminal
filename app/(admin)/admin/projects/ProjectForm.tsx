'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import type { Client, Profile } from '@prisma/client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface ProjectFormProps {
  clients: Pick<Client, 'id' | 'name'>[]
  teamMembers: Pick<Profile, 'id' | 'name'>[]
  initialClientId?: string
}

export default function ProjectForm({ clients, teamMembers, initialClientId }: ProjectFormProps) {
  const router = useRouter()
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)

  const validateField = (name: string, value: string) => {
    let errorMsg = ''
    if (name === 'name') {
      if (!value.trim()) errorMsg = 'Project name is required'
    } else if (name === 'clientId') {
      if (!value.trim()) errorMsg = 'Client is required'
    } else if (name === 'progress') {
      if (value.trim()) {
        const num = Number(value)
        if (isNaN(num) || num < 0 || num > 100) {
          errorMsg = 'Progress must be between 0 and 100'
        }
      }
    }

    setLocalErrors(prev => ({ ...prev, [name]: errorMsg }))
    return !errorMsg
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    validateField(name, value)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    validateField(name, value)
  }

  const fieldClass = (field: string) => {
    const hasError = !!localErrors[field]
    return `form-input${hasError ? ' form-input--error' : ''}`
  }

  const selectClass = (field: string) => {
    const hasError = !!localErrors[field]
    return `form-select${hasError ? ' form-select--error' : ''}`
  }

  const displayError = (field: string) => {
    const errorMsg = localErrors[field]
    if (!errorMsg) return null
    return <p className="form-error">{errorMsg}</p>
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const fields = ['name', 'clientId', 'progress']
    let hasErrors = false
    let firstError = ''

    fields.forEach(field => {
      const val = (formData.get(field) as string) ?? ''
      const isValid = validateField(field, val)
      if (!isValid) {
        hasErrors = true
        if (!firstError) firstError = field
      }
    })

    if (hasErrors) {
      toast.error('Please correct the validation errors before submitting.')
      if (firstError) {
        const el = document.getElementById(firstError)
        if (el) el.focus()
      }
      return
    }

    setPending(true)
    const rawData = Object.fromEntries(formData.entries())

    const res = await apiClient<{ id: string }>('/api/admin/projects', {
      method: 'POST',
      body: JSON.stringify(rawData),
    })

    setPending(false)

    if (res.success && res.data) {
      toast.success('Project created successfully.')
      router.push(`/admin/projects/${res.data.id}`)
    } else {
      toast.error(res.error?.message || 'Failed to create project')
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <Link href="/admin/projects" className="btn btn--ghost btn--icon" title="Back to projects">
            <ArrowLeft size={18} />
          </Link>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
            Project Setup
          </h2>
        </div>

        <div className="settings-grid">
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" htmlFor="name">
              Project Name <span className="form-required">*</span>
            </label>
            <input
              id="name"
              name="name"
              className={fieldClass('name')}
              placeholder="e.g. Website Redesign & Branding"
              required
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {displayError('name')}
            <p className="form-hint">Descriptive and clear name for the engagement</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="clientId">
              Client / Organization <span className="form-required">*</span>
            </label>
            <select
              id="clientId"
              name="clientId"
              className={selectClass('clientId')}
              defaultValue={initialClientId ?? ''}
              required
              onChange={handleChange}
              onBlur={handleBlur}
            >
              <option value="" disabled>Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {displayError('clientId')}
            <p className="form-hint">Select the active company/client this project belongs to</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="leadId">Project Lead</label>
            <select id="leadId" name="leadId" className="form-select">
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <p className="form-hint">The primary manager responsible for milestone scheduling and delivery</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="status">Initial Status</label>
            <select id="status" name="status" className="form-select" defaultValue="PLANNED">
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
            </select>
            <p className="form-hint">Current phase status for administrative sorting</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="progress">Initial Progress (%)</label>
            <input
              id="progress"
              name="progress"
              type="number"
              min={0}
              max={100}
              defaultValue={0}
              className={fieldClass('progress')}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {displayError('progress')}
            <p className="form-hint">Estimated completion percent (calculated from milestones)</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="startDate">Start Date</label>
            <input id="startDate" name="startDate" type="date" className="form-input" />
            <p className="form-hint">Scheduled kick-off date</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="endDate">Target End Date</label>
            <input id="endDate" name="endDate" type="date" className="form-input" />
            <p className="form-hint">Target files handover / release milestone date</p>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" htmlFor="description">Project Description & Scope</label>
            <textarea
              id="description"
              name="description"
              className="form-textarea"
              placeholder="Outline project deliverables, requirements, and scope."
              rows={4}
            />
            <p className="form-hint">Brief summary of terms of reference, design direction, or scope bounds</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
          <Link href="/admin/projects" className="btn btn--ghost">Cancel</Link>
          <button
            type="submit"
            className={`btn btn--primary${pending ? ' btn--loading' : ''}`}
            disabled={pending}
          >
            {pending ? '' : 'Create Project'}
          </button>
        </div>
      </div>
    </form>
  )
}
