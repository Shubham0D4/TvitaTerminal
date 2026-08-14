'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Lock } from 'lucide-react'

interface Client { id: string; name: string }

export default function PlanForm({ clients = [] }: { clients?: Client[] }) {
  const router = useRouter()
  const [features, setFeatures] = useState<string[]>([
    'Dedicated Account Manager',
    'Monthly Performance Reporting',
  ])
  const [isPrivate, setIsPrivate] = useState(false)
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)

  const validateField = (name: string, value: string) => {
    let errorMsg = ''
    if (name === 'name') {
      if (!value.trim()) errorMsg = 'Plan title is required'
    } else if (name === 'price') {
      if (!value.trim()) errorMsg = 'Monthly Retainer Price is required'
      else {
        const num = Number(value)
        if (isNaN(num) || num < 0) {
          errorMsg = 'Monthly Retainer Price must be non-negative'
        }
      }
    } else if (name === 'clientId') {
      if (isPrivate && !value.trim()) {
        errorMsg = 'Target client is required for private plans'
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

  const displayError = (field: string) => {
    const errorMsg = localErrors[field]
    if (!errorMsg) return null
    return <span className="form-error">{errorMsg}</span>
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const fields = ['name', 'price']
    if (isPrivate) fields.push('clientId')
    
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
    rawData.featuresJson = JSON.stringify(features.filter(Boolean))

    const res = await apiClient('/api/admin/subscriptions/plans', {
      method: 'POST',
      body: JSON.stringify(rawData),
    })

    setPending(false)

    if (res.success) {
      toast.success('Retainer package created successfully.')
      router.push('/admin/subscriptions')
    } else {
      toast.error(res.error?.message || 'Failed to create plan')
    }
  }

  const handleFeatureChange = (index: number, val: string) => {
    const updated = [...features]
    updated[index] = val
    setFeatures(updated)
  }

  const addFeature = () => {
    setFeatures([...features, ''])
  }

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 640 }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <Link href="/admin/subscriptions" className="btn btn--ghost btn--icon" title="Back to subscriptions">
            <ArrowLeft size={18} />
          </Link>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
            Build Retainer Package
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Plan Title <span className="form-required">*</span></label>
            <input id="name" name="name" className={fieldClass('name')} placeholder="e.g. Growth Marketing Retainer" required
              onChange={handleChange} onBlur={handleBlur} />
            {displayError('name')}
            <p className="form-hint">Descriptive public name of the service plan</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">Package Summary</label>
            <textarea
              id="description"
              name="description"
              className="form-textarea"
              placeholder="Ideal for growing brands needing active social media and SEO execution."
              rows={2}
            />
            <p className="form-hint">High level summary highlighting scope and target audience</p>
          </div>

          <div className="settings-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="price">Monthly Retainer Price (₹) <span className="form-required">*</span></label>
              <input id="price" name="price" type="number" min={0} step={5000} className={fieldClass('price')} placeholder="45000" required
                onChange={handleChange} onBlur={handleBlur} />
              {displayError('price')}
              <p className="form-hint">Recurring subscription pricing rate (gross, in INR)</p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="billingCycle">Billing Cycle <span className="form-required">*</span></label>
              <select id="billingCycle" name="billingCycle" className="form-select" defaultValue="MONTHLY" required>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
              <p className="form-hint">Standard interval between payment settlement invoices</p>
            </div>
          </div>

          {/* Included Features */}
          <div style={{ marginTop: 'var(--space-4)' }}>
            <label className="form-label" style={{ marginBottom: 'var(--space-2)' }}>Included Plan Deliverables & Features</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    className="form-input"
                    placeholder="e.g. 10 Custom Graphics / Month"
                    value={feature}
                    onChange={(e) => handleFeatureChange(idx, e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn--ghost btn--icon"
                    onClick={() => removeFeature(idx)}
                    disabled={features.length === 1}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn btn--ghost btn--xs"
              onClick={addFeature}
              style={{ marginTop: 'var(--space-3)' }}
            >
              <Plus size={14} />
              Add Deliverable
            </button>
          </div>
        </div>

        {/* Private Plan (client-specific) */}
        <div style={{ marginTop: 'var(--space-5)', paddingTop: 'var(--space-5)', borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', background: isPrivate ? 'rgba(99,102,241,0.12)' : 'var(--bg-elevated)', color: 'var(--accent-primary)' }}>
              <Lock size={14} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>Private / Client-Exclusive Plan</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Restrict this plan to a specific client only</div>
            </div>
            <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }} />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>Enable</span>
            </label>
          </div>
          {isPrivate && (
            <div className="form-group">
              <label className="form-label" htmlFor="clientId">Assign to Client <span className="form-required">*</span></label>
              <select id="clientId" name="clientId" className={fieldClass('clientId')} required={isPrivate}
                onChange={handleChange} onBlur={handleBlur}>
                <option value="">— Select Client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {displayError('clientId')}
              <p className="form-hint">Only this client will see this plan in their subscription portal.</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
          <Link href="/admin/subscriptions" className="btn btn--ghost">Cancel</Link>
          <button type="submit" className={`btn btn--primary${pending ? ' btn--loading' : ''}`} disabled={pending}>
            {pending ? '' : 'Create Retainer Package'}
          </button>
        </div>
      </div>
    </form>
  )
}
