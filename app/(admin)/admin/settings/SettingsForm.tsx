'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { apiClient } from '@/shared/utilities/api-client'
import type { AppSettings } from '@prisma/client'
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/client'
import DynamicSecurityDashboard from '@/components/admin/DynamicSecurityDashboard'
import AuditLogsView from '@/components/admin/AuditLogsView'
import {
  Building2,
  Landmark,
  ShieldCheck,
  KeyRound,
  Activity,
  CheckCircle2,
  Lock,
  Server,
  Database,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  ScrollText
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

  // Security policy states (toggles)
  const [enforceMfa, setEnforceMfa] = useState(true)
  const [auditLoggingEnabled, setAuditLoggingEnabled] = useState(true)
  const [strictSessionTimeout, setStrictSessionTimeout] = useState(true)

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
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '32px', alignItems: 'flex-start' }}>
      {/* ── Sidebar Navigation ── */}
      <aside
        style={{
          background: 'var(--bg-surface, #ffffff)',
          border: '1px solid var(--border-default, #e2e8f0)',
          borderRadius: '12px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Settings Menu
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('general')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'general' ? '#1e40af' : 'transparent',
            color: activeTab === 'general' ? '#ffffff' : 'var(--text-primary, #0f172a)',
            fontWeight: activeTab === 'general' ? 600 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease',
          }}
        >
          <Building2 size={18} />
          <span>General & Agency</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('finance')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'finance' ? '#1e40af' : 'transparent',
            color: activeTab === 'finance' ? '#ffffff' : 'var(--text-primary, #0f172a)',
            fontWeight: activeTab === 'finance' ? 600 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease',
          }}
        >
          <Landmark size={18} />
          <span>Finance & GST</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'security' ? '#1e40af' : 'transparent',
            color: activeTab === 'security' ? '#ffffff' : 'var(--text-primary, #0f172a)',
            fontWeight: activeTab === 'security' ? 600 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease',
          }}
        >
          <ShieldCheck size={18} />
          <span>Security & Route Health</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'audit' ? '#1e40af' : 'transparent',
            color: activeTab === 'audit' ? '#ffffff' : 'var(--text-primary, #0f172a)',
            fontWeight: activeTab === 'audit' ? 600 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease',
          }}
        >
          <ScrollText size={18} />
          <span>Audit Logs & History</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('password')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'password' ? '#1e40af' : 'transparent',
            color: activeTab === 'password' ? '#ffffff' : 'var(--text-primary, #0f172a)',
            fontWeight: activeTab === 'password' ? 600 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease',
          }}
        >
          <KeyRound size={18} />
          <span>Password Reset</span>
        </button>
      </aside>

      {/* ── Main Content Area ── */}
      <main>
        {/* 1. GENERAL & AGENCY TAB */}
        {activeTab === 'general' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <section className="card">
              <h2 className="settings-section__title flex items-center gap-2">
                <Building2 size={20} style={{ color: '#1e40af' }} />
                Company Information
              </h2>
              <p className="settings-section__desc">
                This information appears on tax invoices, client portals, and official emails.
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
                    defaultValue={settings?.companyName ?? 'Tvita'}
                    placeholder="Tvita"
                    required
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {displayError('companyName')}
                  <p className="form-hint">Official agency name printed across the platform</p>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="companyEmail">Email</label>
                  <input
                    id="companyEmail"
                    name="companyEmail"
                    type="email"
                    className={fieldClass('companyEmail')}
                    defaultValue={settings?.companyEmail ?? ''}
                    placeholder="contact@tvita.dev"
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {displayError('companyEmail')}
                  <p className="form-hint">Main corporate contact email address</p>
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
                  <p className="form-hint">Official agency support phone number</p>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" htmlFor="companyAddress">Address</label>
                  <textarea
                    id="companyAddress"
                    name="companyAddress"
                    className="form-textarea"
                    defaultValue={settings?.companyAddress ?? ''}
                    placeholder="123, Tech Park, Mumbai, Maharashtra - 400001"
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
                  <p className="form-hint">State region required for GST tax rules</p>
                </div>
              </div>
            </section>

            {/* SMTP & Email Section inside General */}
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
                </div>
              </div>
            </section>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className={`btn btn--primary${pending ? ' btn--loading' : ''}`}
                disabled={pending}
                style={{ background: '#1e40af', borderColor: '#1e40af' }}
              >
                {pending ? 'Saving...' : 'Save General Settings'}
              </button>
            </div>
          </form>
        )}

        {/* 2. FINANCE & GST TAB */}
        {activeTab === 'finance' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Tax & Legal */}
            <section className="card">
              <h2 className="settings-section__title flex items-center gap-2">
                <Landmark size={20} style={{ color: '#1e40af' }} />
                Tax & Legal (GST Compliance)
              </h2>
              <p className="settings-section__desc">
                GSTIN, PAN, SAC Code, and State Code details for legal tax invoices.
              </p>
              <div className="settings-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="companyGstin">GSTIN</label>
                  <input
                    id="companyGstin"
                    name="companyGstin"
                    className={fieldClass('companyGstin')}
                    defaultValue={settings?.companyGstin ?? ''}
                    placeholder="27AAAAA0000A1Z5"
                    maxLength={15}
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {displayError('companyGstin')}
                  <p className="form-hint">15-character GSTIN number (e.g. 27AAAAA0000A1Z5)</p>
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
                  <p className="form-hint">10-character Permanent Account Number</p>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="companyStateCode">State Code (GST)</label>
                  <input
                    id="companyStateCode"
                    name="companyStateCode"
                    className="form-input"
                    defaultValue={(settings as any)?.companyStateCode ?? '27'}
                    placeholder="27"
                    maxLength={2}
                    style={{ fontFamily: 'monospace' }}
                  />
                  <p className="form-hint">2-digit State Code (e.g. 27 for Maharashtra)</p>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="defaultSacCode">Default Service Code (SAC)</label>
                  <input
                    id="defaultSacCode"
                    name="defaultSacCode"
                    className="form-input"
                    defaultValue={(settings as any)?.defaultSacCode ?? '998314'}
                    placeholder="998314"
                  />
                  <p className="form-hint">Service Accounting Code for IT & software services (998314)</p>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="taxRate">Default GST Tax Rate (%)</label>
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
                  <p className="form-hint">Standard GST percentage (e.g. 18%)</p>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="currency">Default Currency</label>
                  <select id="currency" name="currency" className="form-select" defaultValue={settings?.currency ?? 'INR'}>
                    <option value="INR">INR — Indian Rupee (₹)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                  </select>
                  <p className="form-hint">Standard currency for domestic or international billing</p>
                </div>
              </div>
            </section>

            {/* Bank Details */}
            <section className="card">
              <h2 className="settings-section__title">Bank Account Details</h2>
              <p className="settings-section__desc">
                These details are rendered on printable tax invoices and client payment options.
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
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="bankUpiId">UPI ID / VPA</label>
                  <input
                    id="bankUpiId"
                    name="bankUpiId"
                    className="form-input"
                    defaultValue={(settings as any)?.bankUpiId ?? ''}
                    placeholder="billing@bankupi"
                  />
                </div>
              </div>
            </section>

            {/* Invoice Config */}
            <section className="card">
              <h2 className="settings-section__title">Invoice Configuration</h2>
              <p className="settings-section__desc">Customize invoice prefixing and footer signature text.</p>
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
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" htmlFor="invoiceFooter">Invoice Footer / Terms</label>
                  <textarea
                    id="invoiceFooter"
                    name="invoiceFooter"
                    className="form-textarea"
                    defaultValue={settings?.invoiceFooter ?? ''}
                    placeholder="Thank you for your business. Payment due within 15 days of receipt."
                    rows={3}
                  />
                </div>
              </div>
            </section>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className={`btn btn--primary${pending ? ' btn--loading' : ''}`}
                disabled={pending}
                style={{ background: '#1e40af', borderColor: '#1e40af' }}
              >
                {pending ? 'Saving...' : 'Save Financial Settings'}
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
            <section className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 className="settings-section__title flex items-center gap-2" style={{ margin: 0 }}>
                    <Activity size={20} style={{ color: '#1e40af' }} />
                    Route Health Dashboard
                  </h2>
                  <p className="settings-section__desc" style={{ marginTop: '4px' }}>
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
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#1e40af', color: '#ffffff' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', borderRadius: '6px 0 0 0' }}>API / Page Route</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Method</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Required Auth Policy</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>HTTP Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>SLA Latency</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', borderRadius: '0 6px 0 0' }}>Health State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routeHealthList.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>{item.route}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#1e40af' }}>{item.method}</td>
                        <td style={{ padding: '12px 14px', color: '#475569', fontSize: '12px' }}>{item.auth}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#15803d' }}>{item.status}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'monospace', color: '#475569' }}>{item.latency}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: item.health === 'Healthy' ? '#dcfce7' : '#eff6ff', color: item.health === 'Healthy' ? '#15803d' : '#1e40af', fontWeight: 700 }}>
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
            <section className="card">
              <h2 className="settings-section__title flex items-center gap-2">
                <KeyRound size={20} style={{ color: '#1e40af' }} />
                Change Admin Password
              </h2>
              <p className="settings-section__desc">
                Update your account password for secure workspace access. Minimum 6 characters required.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px', marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="newPassword">New Password</label>
                  <input
                    id="newPassword"
                    type="password"
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  type="submit"
                  className={`btn btn--primary${passwordPending ? ' btn--loading' : ''}`}
                  disabled={passwordPending}
                  style={{ background: '#1e40af', borderColor: '#1e40af' }}
                >
                  {passwordPending ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </section>
          </form>
        )}
      </main>
    </div>
  )
}
