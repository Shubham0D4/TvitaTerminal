'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/utils/api-client'
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
    return <p className="form-error" style={{ fontSize: '11px', color: 'var(--color-danger)', marginTop: '4px', margin: 0 }}>{errorMsg}</p>
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
      <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
          <Link href="/admin/projects" className="btn btn--ghost btn--icon" title="Back to projects" style={{ border: '1px solid var(--border-default)', borderRadius: '50%', padding: '6px' }}>
            <ArrowLeft size={16} />
          </Link>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Project Setup
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Row 1: Project Name */}
          <div className="form-row">
            <div className="form-row__meta">
              <label className="form-label" htmlFor="name" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                Project Name <span className="form-required">*</span>
              </label>
              <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Descriptive and clear name for the engagement</p>
              {displayError('name')}
            </div>
            <div className="form-row__control">
              <input
                id="name"
                name="name"
                className={fieldClass('name')}
                placeholder="e.g. Website Redesign & Branding"
                required
                onChange={handleChange}
                onBlur={handleBlur}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Row 2: Client / Organization */}
          <div className="form-row">
            <div className="form-row__meta">
              <label className="form-label" htmlFor="clientId" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                Client / Organization <span className="form-required">*</span>
              </label>
              <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Select the active company/client this project belongs to</p>
              {displayError('clientId')}
            </div>
            <div className="form-row__control">
              <select
                id="clientId"
                name="clientId"
                className={selectClass('clientId')}
                defaultValue={initialClientId ?? ''}
                required
                onChange={handleChange}
                onBlur={handleBlur}
                style={{ width: '100%' }}
              >
                <option value="" disabled>Select client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Project Lead */}
          <div className="form-row">
            <div className="form-row__meta">
              <label className="form-label" htmlFor="leadId" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                Project Lead
              </label>
              <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>The primary manager responsible for milestone scheduling and delivery</p>
            </div>
            <div className="form-row__control">
              <select id="leadId" name="leadId" className="form-select" style={{ width: '100%' }}>
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Initial Status */}
          <div className="form-row">
            <div className="form-row__meta">
              <label className="form-label" htmlFor="status" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                Initial Status
              </label>
              <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Current phase status for administrative sorting</p>
            </div>
            <div className="form-row__control">
              <select id="status" name="status" className="form-select" defaultValue="PLANNED" style={{ width: '100%' }}>
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ON_HOLD">On Hold</option>
              </select>
            </div>
          </div>

          {/* Row 5: Initial Progress (%) */}
          <div className="form-row">
            <div className="form-row__meta">
              <label className="form-label" htmlFor="progress" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                Initial Progress (%)
              </label>
              <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Estimated completion percent (calculated from milestones)</p>
              {displayError('progress')}
            </div>
            <div className="form-row__control">
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
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Row 6: Start Date */}
          <div className="form-row">
            <div className="form-row__meta">
              <label className="form-label" htmlFor="startDate" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                Start Date
              </label>
              <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Scheduled kick-off date</p>
            </div>
            <div className="form-row__control">
              <input id="startDate" name="startDate" type="date" className="form-input" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Row 7: Target End Date */}
          <div className="form-row">
            <div className="form-row__meta">
              <label className="form-label" htmlFor="endDate" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                Target End Date
              </label>
              <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Target files handover / release milestone date</p>
            </div>
            <div className="form-row__control">
              <input id="endDate" name="endDate" type="date" className="form-input" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Row 8: Project Description & Scope */}
          <div className="form-row" style={{ borderBottom: 'none' }}>
            <div className="form-row__meta">
              <label className="form-label" htmlFor="description" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                Project Description & Scope
              </label>
              <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Brief summary of terms of reference, design direction, or scope bounds</p>
            </div>
            <div className="form-row__control">
              <textarea
                id="description"
                name="description"
                className="form-textarea"
                placeholder="Outline project deliverables, requirements, and scope."
                rows={4}
                style={{ width: '100%', borderRadius: '12px', border: '1px solid var(--border-default)', padding: '10px 12px', fontSize: 'var(--text-sm)', background: '#ffffff', outline: 'none', transition: 'border-color 0.15s ease' }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-6)', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
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
