'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/utils/api-client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TeamMemberForm() {
  const router = useRouter()
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)

  const validateField = (name: string, value: string) => {
    let errorMsg = ''
    if (name === 'name') {
      if (!value.trim()) errorMsg = 'Full name is required'
    } else if (name === 'email') {
      if (!value.trim()) errorMsg = 'Email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) errorMsg = 'Invalid email address'
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
    return <p className="form-error" style={{ fontSize: '11px', color: 'var(--color-danger)', marginTop: '4px', margin: 0 }}>{errorMsg}</p>
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const fields = ['name', 'email', 'salary']
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

    const res = await apiClient('/api/admin/team', {
      method: 'POST',
      body: JSON.stringify(rawData),
    })

    setPending(false)

    if (res.success) {
      toast.success('Team member created successfully.')
      router.push('/admin/team')
    } else {
      toast.error(res.error?.message || 'Failed to create team member')
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
          <Link href="/admin/team" className="btn btn--ghost btn--icon" title="Back to team" style={{ border: '1px solid var(--border-default)', borderRadius: '50%', padding: '6px' }}>
            <ArrowLeft size={16} />
          </Link>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Add New Member
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Row 1: Full Name */}
          <div className="form-row">
            <div className="form-row__meta">
              <label className="form-label" htmlFor="name" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                Full Name <span className="form-required">*</span>
              </label>
              <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Member name as listed in legal identification forms</p>
              {displayError('name')}
            </div>
            <div className="form-row__control">
              <input
                id="name"
                name="name"
                className={fieldClass('name')}
                placeholder="e.g. Rahul Sharma"
                required
                onChange={handleChange}
                onBlur={handleBlur}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Row 2: Work Email */}
          <div className="form-row">
            <div className="form-row__meta">
              <label className="form-label" htmlFor="email" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                Work Email <span className="form-required">*</span>
              </label>
              <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Corporate email address to receive project invitations and updates</p>
              {displayError('email')}
            </div>
            <div className="form-row__control">
              <input
                id="email"
                name="email"
                type="email"
                className={fieldClass('email')}
                placeholder="rahul@agency.com"
                required
                onChange={handleChange}
                onBlur={handleBlur}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Row 3: Project Sub-Role */}
          <div className="form-row">
            <div className="form-row__meta">
              <label className="form-label" htmlFor="teamRole" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                Project Sub-Role
              </label>
              <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Specifies default workspace permission level and auto-assignment queue</p>
            </div>
            <div className="form-row__control">
              <select id="teamRole" name="teamRole" className="form-select" defaultValue="MEMBER" style={{ width: '100%' }}>
                <option value="TEAM_LEAD">Team Lead</option>
                <option value="MEMBER">Team Member</option>
              </select>
            </div>
          </div>

          {/* Row 4: Phone Number */}
          <div className="form-row">
            <div className="form-row__meta">
              <label className="form-label" htmlFor="phone" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                Phone Number
              </label>
              <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Contact number for messages (with country code)</p>
            </div>
            <div className="form-row__control">
              <input id="phone" name="phone" className="form-input" placeholder="+91 98765 43210" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Row 5: Monthly Salary */}
          <div className="form-row">
            <div className="form-row__meta">
              <label className="form-label" htmlFor="salary" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                Monthly Salary (₹)
              </label>
              <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Base monthly remuneration value (gross, in INR)</p>
              {displayError('salary')}
            </div>
            <div className="form-row__control">
              <input
                id="salary"
                name="salary"
                type="number"
                min="0"
                step="any"
                className={fieldClass('salary')}
                placeholder="e.g. 65000"
                onChange={handleChange}
                onBlur={handleBlur}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Row 6: Platform Role */}
          <div className="form-row" style={{ borderBottom: 'none' }}>
            <div className="form-row__meta">
              <label className="form-label" htmlFor="role" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                Platform Role <span className="form-required">*</span>
              </label>
              <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Top-level permissions profile (Admin vs. Standard Member)</p>
            </div>
            <div className="form-row__control">
              <select id="role" name="role" className="form-select" defaultValue="TEAM_MEMBER" required style={{ width: '100%' }}>
                <option value="TEAM_MEMBER">Team Member</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-6)', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
          <Link href="/admin/team" className="btn btn--ghost">Cancel</Link>
          <button type="submit" className={`btn btn--primary${pending ? ' btn--loading' : ''}`} disabled={pending}>
            {pending ? '' : 'Create Member'}
          </button>
        </div>
      </div>
    </form>
  )
}
