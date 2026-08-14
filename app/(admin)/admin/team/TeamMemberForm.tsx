'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
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
    return <span className="form-error">{errorMsg}</span>
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
    <form onSubmit={handleSubmit} style={{ maxWidth: 640 }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <Link href="/admin/team" className="btn btn--ghost btn--icon" title="Back to team">
            <ArrowLeft size={18} />
          </Link>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
            Add New Member
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name <span className="form-required">*</span></label>
            <input id="name" name="name" className={fieldClass('name')} placeholder="e.g. Rahul Sharma" required
              onChange={handleChange} onBlur={handleBlur} />
            {displayError('name')}
            <p className="form-hint">Member name as listed in legal identification forms</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Work Email <span className="form-required">*</span></label>
            <input id="email" name="email" type="email" className={fieldClass('email')} placeholder="rahul@agency.com" required
              onChange={handleChange} onBlur={handleBlur} />
            {displayError('email')}
            <p className="form-hint">Corporate email address to receive project invitations and updates</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="teamRole">Project Sub-Role</label>
            <select id="teamRole" name="teamRole" className="form-select" defaultValue="">
              <option value="">Standard Member / None</option>
              <option value="TEAM_LEAD">Team Lead</option>
              <option value="DEVELOPER">Developer</option>
              <option value="TESTER">Tester</option>
            </select>
            <p className="form-hint">Specifies default workspace permission level and auto-assignment queue</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone Number (Optional)</label>
              <input id="phone" name="phone" className="form-input" placeholder="+91 98765 43210" />
              <p className="form-hint">Contact number for messages (with country code)</p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="salary">Monthly Salary (₹)</label>
              <input id="salary" name="salary" type="number" min="0" step="500" className={fieldClass('salary')} placeholder="e.g. 65000"
                onChange={handleChange} onBlur={handleBlur} />
              {displayError('salary')}
              <p className="form-hint">Base monthly remuneration value (gross, in INR)</p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="role">Platform Role <span className="form-required">*</span></label>
            <select id="role" name="role" className="form-select" defaultValue="TEAM_MEMBER" required>
              <option value="TEAM_MEMBER">Team Member</option>
              <option value="ADMIN">Administrator</option>
            </select>
            <p className="form-hint">Top-level permissions profile (Admin vs. Standard Member)</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
          <Link href="/admin/team" className="btn btn--ghost">Cancel</Link>
          <button type="submit" className={`btn btn--primary${pending ? ' btn--loading' : ''}`} disabled={pending}>
            {pending ? '' : 'Create Member'}
          </button>
        </div>
      </div>
    </form>
  )
}
