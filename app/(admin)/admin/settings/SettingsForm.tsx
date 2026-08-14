'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import type { AppSettings } from '@prisma/client'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
]

interface SettingsFormProps {
  settings: AppSettings | null
}

export default function SettingsForm({ settings }: SettingsFormProps) {
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)

  const validateField = (name: string, value: string) => {
    let errorMsg = ''
    if (name === 'companyName') {
      if (!value.trim()) errorMsg = 'Company name is required'
    } else if (name === 'companyEmail') {
      if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        errorMsg = 'Invalid email address'
      }
    } else if (name === 'companyGstin') {
      if (value.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value.trim().toUpperCase())) {
        errorMsg = 'Invalid GSTIN format. Expected: 22AAAAA0000A1Z5'
      }
    } else if (name === 'companyPan') {
      if (value.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value.trim().toUpperCase())) {
        errorMsg = 'Invalid PAN format. Expected: AAAAA1234A'
      }
    } else if (name === 'invoicePrefix') {
      if (!value.trim()) errorMsg = 'Invoice prefix is required'
      else if (value.length > 10) errorMsg = 'Invoice prefix must be 10 characters or less'
    } else if (name === 'taxRate') {
      if (!value.trim()) errorMsg = 'Tax rate is required'
      else {
        const num = Number(value)
        if (isNaN(num) || num < 0 || num > 30) {
          errorMsg = 'Tax rate must be between 0 and 30%'
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

  const displayError = (field: string) => {
    const errorMsg = localErrors[field]
    if (!errorMsg) return null
    return <p className="form-error">{errorMsg}</p>
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const fields = ['companyName', 'companyEmail', 'companyGstin', 'companyPan', 'invoicePrefix', 'taxRate']
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

    const res = await apiClient('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(rawData),
    })

    setPending(false)

    if (res.success) {
      toast.success('Settings updated successfully.')
    } else {
      toast.error(res.error?.message || 'Failed to update settings')
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>

      {/* ── Company Info ── */}
      <section className="card">
        <h2 className="settings-section__title">Company Information</h2>
        <p className="settings-section__desc">
          This information appears on invoices and client-facing communications.
        </p>
        <div className="settings-grid">
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" htmlFor="companyName">
              Company Name <span className="form-required">*</span>
            </label>
            <input
              id="companyName"
              name="companyName"
              className={fieldClass('companyName')}
              defaultValue={settings?.companyName ?? ''}
              placeholder="Tvita Agency Pvt. Ltd."
              required
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {displayError('companyName')}
            <p className="form-hint">Official registered name of the agency</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="companyEmail">Email</label>
            <input
              id="companyEmail"
              name="companyEmail"
              type="email"
              className={fieldClass('companyEmail')}
              defaultValue={settings?.companyEmail ?? ''}
              placeholder="hello@agency.com"
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {displayError('companyEmail')}
            <p className="form-hint">Main corporate contact email for client queries</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="companyPhone">Phone</label>
            <input
              id="companyPhone"
              name="companyPhone"
              className="form-input"
              defaultValue={settings?.companyPhone ?? ''}
              placeholder="+91 98765 43210"
            />
            <p className="form-hint">Official agency support phone number (with country code)</p>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" htmlFor="companyAddress">Address</label>
            <textarea
              id="companyAddress"
              name="companyAddress"
              className="form-textarea"
              defaultValue={settings?.companyAddress ?? ''}
              placeholder="123, Business Park, Mumbai, Maharashtra - 400001"
              rows={3}
            />
            <p className="form-hint">Physical company office address printed on invoice headers</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="companyState">State (for GST)</label>
            <select
              id="companyState"
              name="companyState"
              className="form-select"
              defaultValue={settings?.companyState ?? ''}
            >
              <option value="">Select state</option>
              {INDIAN_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            <p className="form-hint">State region required for GST tax parsing rules</p>
          </div>
        </div>
      </section>

      {/* ── Tax & Legal ── */}
      <section className="card">
        <h2 className="settings-section__title">Tax & Legal</h2>
        <p className="settings-section__desc">
          GST and PAN details for compliant invoice generation.
        </p>
        <div className="settings-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="companyGstin">GSTIN</label>
            <input
              id="companyGstin"
              name="companyGstin"
              className={fieldClass('companyGstin')}
              defaultValue={settings?.companyGstin ?? ''}
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
              style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {displayError('companyGstin')}
            <p className="form-hint">15-character GSTIN number (e.g. 22AAAAA0000A1Z5)</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="companyPan">PAN</label>
            <input
              id="companyPan"
              name="companyPan"
              className={fieldClass('companyPan')}
              defaultValue={settings?.companyPan ?? ''}
              placeholder="AAAAA1234A"
              maxLength={10}
              style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {displayError('companyPan')}
            <p className="form-hint">10-character Permanent Account Number (e.g. ABCDE1234F)</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="taxRate">Tax Rate (%)</label>
            <input
              id="taxRate"
              name="taxRate"
              type="number"
              min={0}
              max={30}
              step={0.01}
              className={fieldClass('taxRate')}
              defaultValue={settings?.taxRate ? String(settings.taxRate) : '18'}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {displayError('taxRate')}
            <p className="form-hint">Default GST / Tax percentage rate automatically applied to line totals</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="currency">Currency</label>
            <select id="currency" name="currency" className="form-select" defaultValue={settings?.currency ?? 'INR'}>
              <option value="INR">INR — Indian Rupee</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
            </select>
            <p className="form-hint">Standard currency symbol for new invoice generation</p>
          </div>
        </div>
      </section>

      {/* ── Bank Details ── */}
      <section className="card">
        <h2 className="settings-section__title">Bank Account Details</h2>
        <p className="settings-section__desc">
          These appear in the payment section of your invoices.
        </p>
        <div className="settings-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="bankName">Bank Name</label>
            <input
              id="bankName"
              name="bankName"
              className="form-input"
              defaultValue={settings?.bankName ?? ''}
              placeholder="HDFC Bank"
            />
            <p className="form-hint">Commercial banking institution name</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bankBranch">Branch</label>
            <input
              id="bankBranch"
              name="bankBranch"
              className="form-input"
              defaultValue={settings?.bankBranch ?? ''}
              placeholder="Andheri West, Mumbai"
            />
            <p className="form-hint">Specific city and street branch office details</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bankAccount">Account Number</label>
            <input
              id="bankAccount"
              name="bankAccount"
              className="form-input"
              defaultValue={settings?.bankAccount ?? ''}
              placeholder="50100123456789"
              style={{ fontFamily: 'monospace' }}
            />
            <p className="form-hint">Corporate current or savings account number</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bankIfsc">IFSC Code</label>
            <input
              id="bankIfsc"
              name="bankIfsc"
              className="form-input"
              defaultValue={settings?.bankIfsc ?? ''}
              placeholder="HDFC0001234"
              maxLength={11}
              style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
            />
            <p className="form-hint">11-character Indian Financial System Code (e.g. HDFC0001234)</p>
          </div>
        </div>
      </section>

      {/* ── Invoice Settings ── */}
      <section className="card">
        <h2 className="settings-section__title">Invoice Configuration</h2>
        <p className="settings-section__desc">
          Customize how invoices are numbered and what appears on them.
        </p>
        <div className="settings-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="invoicePrefix">
              Invoice Prefix <span className="form-required">*</span>
            </label>
            <input
              id="invoicePrefix"
              name="invoicePrefix"
              className={fieldClass('invoicePrefix')}
              defaultValue={settings?.invoicePrefix ?? 'INV'}
              placeholder="INV"
              required
              maxLength={10}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {displayError('invoicePrefix')}
            <p className="form-hint">Uppercase code placed before invoices (e.g. INV results in INV-2026-001)</p>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" htmlFor="invoiceFooter">Invoice Footer / Notes</label>
            <textarea
              id="invoiceFooter"
              name="invoiceFooter"
              className="form-textarea"
              defaultValue={settings?.invoiceFooter ?? ''}
              placeholder="Thank you for your business. Payment due within 15 days of receipt."
              rows={3}
            />
            <p className="form-hint">Standard terms, payment instructions, or company signature text shown at the bottom of invoice PDFs</p>
          </div>
        </div>
      </section>

      {/* ── SMTP & Email Settings ── */}
      <section className="card">
        <h2 className="settings-section__title">SMTP & Email Configuration</h2>
        <p className="settings-section__desc">
          Configure SMTP server details for automated notifications, magic link invites, and client reports.
        </p>
        <div className="settings-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="smtpHost">SMTP Host</label>
            <input
              id="smtpHost"
              name="smtpHost"
              className="form-input"
              defaultValue={(settings as any)?.smtpHost ?? 'smtp.gmail.com'}
              placeholder="smtp.gmail.com"
            />
            <p className="form-hint">Hostname of your SMTP server (e.g. smtp.gmail.com or smtp.sendgrid.net)</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="smtpPort">SMTP Port</label>
            <input
              id="smtpPort"
              name="smtpPort"
              type="number"
              className="form-input"
              defaultValue={(settings as any)?.smtpPort ?? 587}
              placeholder="587"
            />
            <p className="form-hint">Typically 587 (TLS), 465 (SSL), or 25 (Unencrypted)</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="smtpUser">SMTP Username / Email</label>
            <input
              id="smtpUser"
              name="smtpUser"
              type="email"
              className="form-input"
              defaultValue={(settings as any)?.smtpUser ?? ''}
              placeholder="your@gmail.com"
            />
            <p className="form-hint">Authorized email address used to log into the SMTP server</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="smtpPass">SMTP Password / App Password</label>
            <input
              id="smtpPass"
              name="smtpPass"
              type="password"
              className="form-input"
              defaultValue={(settings as any)?.smtpPass ?? ''}
              placeholder="••••••••••••••••"
            />
            <p className="form-hint">Secure application password or access key for SMTP transmission</p>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" htmlFor="smtpSender">Default Sender Header</label>
            <input
              id="smtpSender"
              name="smtpSender"
              className="form-input"
              defaultValue={(settings as any)?.smtpSender ?? ''}
              placeholder='"Tvita Platform" <noreply@tvita.dev>'
            />
            <p className="form-hint">Custom display header (e.g., "Tvita Platform" &lt;noreply@tvita.dev&gt;). Defaults to SMTP username if blank</p>
          </div>
        </div>
      </section>

      {/* Submit */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
        <button
          type="submit"
          className={`btn btn--primary${pending ? ' btn--loading' : ''}`}
          disabled={pending}
          id="save-settings-btn"
        >
          {pending ? '' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}
