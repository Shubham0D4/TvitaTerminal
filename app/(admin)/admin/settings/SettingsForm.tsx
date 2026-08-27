'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/utils/api-client'
import type { AppSettings } from '@prisma/client'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import DynamicSecurityDashboard from '@/app/components/admin/DynamicSecurityDashboard'
import AuditLogsView from '@/app/components/admin/AuditLogsView'
import {
  Building2,
  Landmark,
  ShieldCheck,
  KeyRound,
  Activity,
  ScrollText,
  RefreshCw,
  Mail,
  Receipt,
  PiggyBank
} from 'lucide-react'

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

type TabType = 'general' | 'finance' | 'security' | 'audit' | 'password'

export default function SettingsForm({ settings }: SettingsFormProps) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as TabType | null
  const [activeTab, setActiveTab] = useState<TabType>('general')

  useEffect(() => {
    if (tabParam && ['general', 'finance', 'security', 'audit', 'password'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)

  // Password reset states
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordPending, setPasswordPending] = useState(false)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword) {
      toast.error('Password cannot be empty.')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setPasswordPending(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Password updated successfully!')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err: any) {
      toast.error('An unexpected error occurred.')
    } finally {
      setPasswordPending(false)
    }
  }

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
        errorMsg = 'Invalid GSTIN format. Expected: 27AAAAA0000A1Z5'
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
      toast.error('Please correct validation errors before saving.')
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

  const routeHealthList = [
    { route: '/api/admin/settings', method: 'PUT', auth: 'ADMIN ONLY', status: '200 OK', latency: '28ms', health: 'Healthy' },
    { route: '/api/quotes', method: 'GET / POST', auth: 'ADMIN / CLIENT / MEMBER', status: '200 OK', latency: '34ms', health: 'Healthy' },
    { route: '/api/team/projects/[id]/lead', method: 'PUT', auth: 'ADMIN / TEAM LEAD', status: '200 OK', latency: '22ms', health: 'Healthy' },
    { route: '/api/invoices/[id]/pdf', method: 'GET', auth: 'AUTHENTICATED', status: '200 OK', latency: '45ms', health: 'Healthy' },
    { route: '/api/client/teams', method: 'GET / POST', auth: 'CLIENT OWNER', status: '200 OK', latency: '31ms', health: 'Healthy' },
    { route: '/api/team/tasks', method: 'GET / POST', auth: 'TEAM MEMBER', status: '200 OK', latency: '38ms', health: 'Healthy' },
    { route: '/api/integrations/gmail/webhook', method: 'POST', auth: 'WEBHOOK SECRET', status: '200 OK', latency: '19ms', health: 'Protected' },
    { route: '/api/stripe/webhook', method: 'POST', auth: 'STRIPE SIGNATURE', status: '200 OK', latency: '24ms', health: 'Protected' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 2.2fr)', gap: '32px', alignItems: 'flex-start' }}>
      {/* ── Sidebar Navigation ── */}
      <aside className="settings-menu">
        <div style={{ padding: '0 12px 8px 12px', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-subtle)', marginBottom: '8px' }}>
          Settings Menu
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`settings-tab-btn ${activeTab === 'general' ? 'settings-tab-btn--active' : ''}`}
        >
          <Building2 size={16} />
          <span>General & Agency</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('finance')}
          className={`settings-tab-btn ${activeTab === 'finance' ? 'settings-tab-btn--active' : ''}`}
        >
          <Landmark size={16} />
          <span>Finance & GST</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`settings-tab-btn ${activeTab === 'security' ? 'settings-tab-btn--active' : ''}`}
        >
          <ShieldCheck size={16} />
          <span>Security & Health</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`settings-tab-btn ${activeTab === 'audit' ? 'settings-tab-btn--active' : ''}`}
        >
          <ScrollText size={16} />
          <span>Audit Logs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('password')}
          className={`settings-tab-btn ${activeTab === 'password' ? 'settings-tab-btn--active' : ''}`}
        >
          <KeyRound size={16} />
          <span>Password Reset</span>
        </button>
      </aside>

      {/* ── Main Content Area ── */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* 1. GENERAL & AGENCY TAB */}
        {activeTab === 'general' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <section className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                <Building2 size={20} style={{ color: 'var(--accent-primary)' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Company Information
                  </h2>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    This information appears on tax invoices, client portals, and official emails.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Row 1: Company Name */}
                <div className="form-row">
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="companyName" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                      Company Name <span className="form-required">*</span>
                    </label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Official agency name printed across the platform</p>
                    {displayError('companyName')}
                  </div>
                  <div className="form-row__control">
                    <input
                      id="companyName"
                      name="companyName"
                      className={fieldClass('companyName')}
                      defaultValue={settings?.companyName ?? 'Tvita'}
                      placeholder="Tvita"
                      required
                      onChange={handleChange}
                      onBlur={handleBlur}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Row 2: Email */}
                <div className="form-row">
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="companyEmail" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                      Email
                    </label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Main corporate contact email address</p>
                    {displayError('companyEmail')}
                  </div>
                  <div className="form-row__control">
                    <input
                      id="companyEmail"
                      name="companyEmail"
                      type="email"
                      className={fieldClass('companyEmail')}
                      defaultValue={settings?.companyEmail ?? ''}
                      placeholder="contact@tvita.dev"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Row 3: Phone */}
                <div className="form-row">
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="companyPhone" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                      Phone
                    </label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Official agency support phone number</p>
                  </div>
                  <div className="form-row__control">
                    <input
                      id="companyPhone"
                      name="companyPhone"
                      className="form-input"
                      defaultValue={settings?.companyPhone ?? ''}
                      placeholder="+91 98765 43210"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Row 4: Address */}
                <div className="form-row">
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="companyAddress" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                      Address
                    </label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Physical company office address printed on invoice headers</p>
                  </div>
                  <div className="form-row__control">
                    <textarea
                      id="companyAddress"
                      name="companyAddress"
                      className="form-textarea"
                      defaultValue={settings?.companyAddress ?? ''}
                      placeholder="123, Tech Park, Mumbai, Maharashtra - 400001"
                      rows={3}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Row 5: State */}
                <div className="form-row" style={{ borderBottom: 'none' }}>
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="companyState" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                      State (for GST)
                    </label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>State region required for GST tax rules</p>
                  </div>
                  <div className="form-row__control">
                    <select
                      id="companyState"
                      name="companyState"
                      className="form-select"
                      defaultValue={settings?.companyState ?? ''}
                      style={{ width: '100%' }}
                    >
                      <option value="">Select state</option>
                      {INDIAN_STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* SMTP & Email Section */}
            <section className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                <Mail size={20} style={{ color: 'var(--accent-primary)' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    SMTP & Email Configuration
                  </h2>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Configure SMTP server details for automated notifications, magic link invites, and client reports.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* SMTP Host */}
                <div className="form-row">
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="smtpHost" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>SMTP Host</label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Outgoing mail server (e.g. smtp.gmail.com)</p>
                  </div>
                  <div className="form-row__control">
                    <input
                      id="smtpHost"
                      name="smtpHost"
                      className="form-input"
                      defaultValue={(settings as any)?.smtpHost ?? 'smtp.gmail.com'}
                      placeholder="smtp.gmail.com"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* SMTP Port */}
                <div className="form-row">
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="smtpPort" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>SMTP Port</label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Server port number (usually 587 for TLS, 465 for SSL)</p>
                  </div>
                  <div className="form-row__control">
                    <input
                      id="smtpPort"
                      name="smtpPort"
                      type="number"
                      className="form-input"
                      defaultValue={(settings as any)?.smtpPort ?? 587}
                      placeholder="587"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* SMTP Username */}
                <div className="form-row">
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="smtpUser" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>SMTP Username / Email</label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Authentication account email address</p>
                  </div>
                  <div className="form-row__control">
                    <input
                      id="smtpUser"
                      name="smtpUser"
                      type="email"
                      className="form-input"
                      defaultValue={(settings as any)?.smtpUser ?? ''}
                      placeholder="your@gmail.com"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* SMTP Password */}
                <div className="form-row" style={{ borderBottom: 'none' }}>
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="smtpPass" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>SMTP Password / App Password</label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Authentication password or app-specific secure token</p>
                  </div>
                  <div className="form-row__control">
                    <input
                      id="smtpPass"
                      name="smtpPass"
                      type="password"
                      className="form-input"
                      defaultValue={(settings as any)?.smtpPass ?? ''}
                      placeholder="••••••••••••••••"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
              <button
                type="submit"
                className={`btn btn--primary${pending ? ' btn--loading' : ''}`}
                disabled={pending}
              >
                {pending ? '' : 'Save General Settings'}
              </button>
            </div>
          </form>
        )}

        {/* 2. FINANCE & GST TAB */}
        {activeTab === 'finance' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <section className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                <Landmark size={20} style={{ color: 'var(--accent-primary)' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Tax & Legal (GST Compliance)
                  </h2>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    GSTIN, PAN, SAC Code, and State Code details for legal tax invoices.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* GSTIN */}
                <div className="form-row">
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="companyGstin" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>GSTIN</label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>15-character GSTIN number (e.g. 27AAAAA0000A1Z5)</p>
                    {displayError('companyGstin')}
                  </div>
                  <div className="form-row__control">
                    <input
                      id="companyGstin"
                      name="companyGstin"
                      className={fieldClass('companyGstin')}
                      defaultValue={settings?.companyGstin ?? ''}
                      placeholder="27AAAAA0000A1Z5"
                      maxLength={15}
                      style={{ textTransform: 'uppercase', fontFamily: 'monospace', width: '100%' }}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>

                {/* PAN */}
                <div className="form-row">
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="companyPan" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>PAN</label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>10-character Permanent Account Number (e.g. AAAAA1234A)</p>
                    {displayError('companyPan')}
                  </div>
                  <div className="form-row__control">
                    <input
                      id="companyPan"
                      name="companyPan"
                      className={fieldClass('companyPan')}
                      defaultValue={settings?.companyPan ?? ''}
                      placeholder="AAAAA1234A"
                      maxLength={10}
                      style={{ textTransform: 'uppercase', fontFamily: 'monospace', width: '100%' }}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>

                {/* State Code */}
                <div className="form-row">
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="companyStateCode" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>State Code (GST)</label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>2-digit State Code (e.g. 27 for Maharashtra)</p>
                  </div>
                  <div className="form-row__control">
                    <input
                      id="companyStateCode"
                      name="companyStateCode"
                      className="form-input"
                      defaultValue={(settings as any)?.companyStateCode ?? '27'}
                      placeholder="27"
                      maxLength={2}
                      style={{ fontFamily: 'monospace', width: '100%' }}
                    />
                  </div>
                </div>

                {/* SAC Code */}
                <div className="form-row">
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="defaultSacCode" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>Default Service Code (SAC)</label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Service Accounting Code for IT & software services (998314)</p>
                  </div>
                  <div className="form-row__control">
                    <input
                      id="defaultSacCode"
                      name="defaultSacCode"
                      className="form-input"
                      defaultValue={(settings as any)?.defaultSacCode ?? '998314'}
                      placeholder="998314"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* GST Tax Rate */}
                <div className="form-row">
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="taxRate" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>Default GST Tax Rate (%)</label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Standard GST percentage (e.g. 18%)</p>
                    {displayError('taxRate')}
                  </div>
                  <div className="form-row__control">
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
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Currency */}
                <div className="form-row" style={{ borderBottom: 'none' }}>
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="currency" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>Default Currency</label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Standard currency for domestic or international billing</p>
                  </div>
                  <div className="form-row__control">
                    <select id="currency" name="currency" className="form-select" defaultValue={settings?.currency ?? 'INR'} style={{ width: '100%' }}>
                      <option value="INR">INR — Indian Rupee (₹)</option>
                      <option value="USD">USD — US Dollar ($)</option>
                      <option value="EUR">EUR — Euro (€)</option>
                      <option value="GBP">GBP — British Pound (£)</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* Bank Details */}
            <section className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                <PiggyBank size={20} style={{ color: 'var(--accent-primary)' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Bank Account Details
                  </h2>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    These details are rendered on printable tax invoices and client payment options.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Bank Name */}
                <div className="form-row">
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="bankName" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>Bank Name</label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Corporate bank handler name</p>
                  </div>
                  <div className="form-row__control">
                    <input
                      id="bankName"
                      name="bankName"
                      className="form-input"
                      defaultValue={settings?.bankName ?? ''}
                      placeholder="HDFC Bank"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Branch */}
                <div className="form-row">
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="bankBranch" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>Branch</label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Regional branch name or address code</p>
                  </div>
                  <div className="form-row__control">
                    <input
                      id="bankBranch"
                      name="bankBranch"
                      className="form-input"
                      defaultValue={settings?.bankBranch ?? ''}
                      placeholder="Andheri West, Mumbai"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Account Number */}
                <div className="form-row">
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="bankAccount" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>Account Number</label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Unique account identification index number</p>
                  </div>
                  <div className="form-row__control">
                    <input
                      id="bankAccount"
                      name="bankAccount"
                      className="form-input"
                      defaultValue={settings?.bankAccount ?? ''}
                      placeholder="50100123456789"
                      style={{ fontFamily: 'monospace', width: '100%' }}
                    />
                  </div>
                </div>

                {/* IFSC Code */}
                <div className="form-row">
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="bankIfsc" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>IFSC Code</label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>11-character Indian Financial System Code (IFSC)</p>
                  </div>
                  <div className="form-row__control">
                    <input
                      id="bankIfsc"
                      name="bankIfsc"
                      className="form-input"
                      defaultValue={settings?.bankIfsc ?? ''}
                      placeholder="HDFC0001234"
                      maxLength={11}
                      style={{ textTransform: 'uppercase', fontFamily: 'monospace', width: '100%' }}
                    />
                  </div>
                </div>

                {/* UPI ID */}
                <div className="form-row" style={{ borderBottom: 'none' }}>
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="bankUpiId" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>UPI ID / VPA</label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Virtual Payment Address for direct scan payment options</p>
                  </div>
                  <div className="form-row__control">
                    <input
                      id="bankUpiId"
                      name="bankUpiId"
                      className="form-input"
                      defaultValue={(settings as any)?.bankUpiId ?? ''}
                      placeholder="billing@bankupi"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Invoice Config */}
            <section className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                <Receipt size={20} style={{ color: 'var(--accent-primary)' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Invoice Configuration
                  </h2>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Customize invoice prefixing and footer signature text.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Invoice Prefix */}
                <div className="form-row">
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="invoicePrefix" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                      Invoice Prefix <span className="form-required">*</span>
                    </label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Prefix letters for invoice sequencing (e.g. INV)</p>
                    {displayError('invoicePrefix')}
                  </div>
                  <div className="form-row__control">
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
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Invoice Footer */}
                <div className="form-row" style={{ borderBottom: 'none' }}>
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="invoiceFooter" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>Invoice Footer / Terms</label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Legal notes or terms of payment printed at the bottom of the PDF</p>
                  </div>
                  <div className="form-row__control">
                    <textarea
                      id="invoiceFooter"
                      name="invoiceFooter"
                      className="form-textarea"
                      defaultValue={settings?.invoiceFooter ?? ''}
                      placeholder="Thank you for your business. Payment due within 15 days of receipt."
                      rows={3}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
              <button
                type="submit"
                className={`btn btn--primary${pending ? ' btn--loading' : ''}`}
                disabled={pending}
              >
                {pending ? '' : 'Save Financial Settings'}
              </button>
            </div>
          </form>
        )}

        {/* 3. SECURITY & ROUTE HEALTH TAB */}
        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Dynamic Risk-Oriented Security Dashboard */}
            <DynamicSecurityDashboard />

            {/* Route Health Dashboard Table */}
            <section className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                <div>
                  <h2 className="settings-section__title flex items-center gap-2" style={{ margin: 0, fontWeight: 600, fontSize: 'var(--text-md)' }}>
                    <Activity size={20} style={{ color: 'var(--accent-primary)' }} />
                    Route Health Dashboard
                  </h2>
                  <p className="settings-section__desc" style={{ marginTop: '4px', margin: 0, fontSize: 'var(--text-xs)' }}>
                    Monitoring endpoint availability, authorization policies, and response benchmarks across key routes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toast.success('Route health statuses refreshed!')}
                  className="btn btn--secondary btn--sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} /> Refresh Telemetry
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-default)' }}>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600 }}>API / Page Route</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600 }}>Method</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600 }}>Required Auth Policy</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600 }}>HTTP Status</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600 }}>SLA Latency</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>Health State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routeHealthList.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-elevated)' }}>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{item.route}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>{item.method}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{item.auth}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-success)' }}>{item.status}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{item.latency}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: item.health === 'Healthy' ? 'var(--color-success-muted)' : 'var(--color-info-muted)', color: item.health === 'Healthy' ? 'var(--color-success)' : 'var(--color-info)', fontWeight: 700 }}>
                            {item.health === 'Healthy' ? '🟢 Healthy' : '🔒 Protected'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* 4. AUDIT LOGS & HISTORY TAB */}
        {activeTab === 'audit' && <AuditLogsView />}

        {/* 5. PASSWORD RESET TAB */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <section className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                <KeyRound size={20} style={{ color: 'var(--accent-primary)' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Change Admin Password
                  </h2>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Update your account password for secure workspace access. Minimum 6 characters required.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* New Password */}
                <div className="form-row">
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="newPassword" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>New Password</label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Password value must be at least 6 characters in length</p>
                  </div>
                  <div className="form-row__control">
                    <input
                      id="newPassword"
                      type="password"
                      className="form-input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="form-row" style={{ borderBottom: 'none' }}>
                  <div className="form-row__meta">
                    <label className="form-label" htmlFor="confirmPassword" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>Confirm New Password</label>
                    <p className="form-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Re-enter password value exactly to confirm modification</p>
                  </div>
                  <div className="form-row__control">
                    <input
                      id="confirmPassword"
                      type="password"
                      className="form-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', marginTop: '24px' }}>
                <button
                  type="submit"
                  className={`btn btn--primary${passwordPending ? ' btn--loading' : ''}`}
                  disabled={passwordPending}
                >
                  {passwordPending ? '' : 'Update Password'}
                </button>
              </div>
            </section>
          </form>
        )}
      </main>
    </div>
  )
}
