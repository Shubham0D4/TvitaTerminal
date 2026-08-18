'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { apiClient } from '@/shared/utilities/api-client'

interface Props {
  member: {
    id: string
    name: string
    phone: string | null
    salary: number | null
    role: string
    teamRole: string | null
    isActive: boolean
  }
}

export default function AdminMemberEditForm({ member }: Props) {
  const router = useRouter()
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)

  const validateField = (name: string, value: string) => {
    let errorMsg = ''
    if (name === 'name') {
      if (!value.trim()) errorMsg = 'Full name is required'
    } else if (name === 'salary') {
      if (value.trim()) {
        const num = Number(value)
        if (isNaN(num) || num < 0) {
          errorMsg = 'Salary must be a non-negative number'
        }
      }
    }

    setLocalErrors(prev => ({ ...prev, [name]: errorMsg }))
    return !errorMsg
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    validateField(name, value)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    validateField(name, value)
  }

  const fieldClass = (field: string) => {
    const hasError = !!localErrors[field]
    return `form-input${hasError ? ' form-input--error' : ''}`
  }

  const displayError = (field: string) => {
    const errorMsg = localErrors[field]
    if (!errorMsg) return null
    return <span className="form-error">{errorMsg}</span>
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const fields = ['name', 'salary']
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
    rawData.isActive = formData.get('isActive') === 'on' ? 'true' : ''

    const res = await apiClient(`/api/admin/team/${member.id}`, {
      method: 'PUT',
      body: JSON.stringify(rawData),
    })

    setPending(false)

    if (res.success) {
      toast.success('Member profile updated successfully.')
      router.refresh()
    } else {
      toast.error(res.error?.message || 'Failed to update member profile')
    }
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-6)' }}>
        Edit Member Profile
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name <span className="form-required">*</span></label>
            <input
              id="name"
              name="name"
              className={fieldClass('name')}
              defaultValue={member.name}
              required
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {displayError('name')}
            <p className="form-hint">Staff member name as displayed throughout the system</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="phone"
              className="form-input"
              defaultValue={member.phone ?? ''}
              placeholder="+91 98765 43210"
            />
            <p className="form-hint">Contact phone number for communication (with country code)</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label" htmlFor="salary">Monthly Salary (₹)</label>
            <input
              id="salary"
              name="salary"
              type="number"
              min="0"
              step="any"
              className={fieldClass('salary')}
              defaultValue={member.salary ?? ''}
              placeholder="e.g. 65000"
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {displayError('salary')}
            <p className="form-hint">Base monthly remuneration value (gross, in INR)</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="role">Platform Role <span className="form-required">*</span></label>
            <select id="role" name="role" className="form-select" defaultValue={member.role} required>
              <option value="TEAM_MEMBER">Team Member</option>
              <option value="ADMIN">Administrator</option>
            </select>
            <p className="form-hint">Top-level permissions profile (Admin vs. Standard Member)</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="teamRole">Project Sub-Role</label>
            <select id="teamRole" name="teamRole" className="form-select" defaultValue={member.teamRole ?? 'MEMBER'}>
              <option value="TEAM_LEAD">Team Lead</option>
              <option value="MEMBER">Team Member</option>
            </select>
            <p className="form-hint">Specifies default workspace permission level and auto-assignment queue</p>
          </div>

          <div className="form-group">
            <label className="form-label">Account Status</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', height: 38 }}>
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={member.isActive}
                style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
              />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Account is active
              </span>
            </label>
          </div>
        </div>

        <div style={{ paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border-subtle)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          Note: Sub-roles (Team Lead, Team Member) can also be customized within specific project workspaces.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
          <button
            type="submit"
            className={`btn btn--primary${pending ? ' btn--loading' : ''}`}
            disabled={pending}
          >
            {pending ? '' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
