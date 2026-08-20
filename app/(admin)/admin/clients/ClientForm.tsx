'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { apiClient } from '@/shared/utilities/api-client'
import Link from 'next/link'
import { ArrowLeft, Lock, Building2, Phone, MapPin, ScrollText, CreditCard, Wallet, Settings } from 'lucide-react'
import CountrySelect from '@/components/ui/CountrySelect'
import type { Client } from '@prisma/client'

interface ClientFormProps {
  client?: Client | null
  adminProfiles?: { id: string; name: string }[]
}

const TABS = [
  { id: 'basic',   label: 'Basic Info',   icon: <Building2 size={14} /> },
  { id: 'contact', label: 'Contact',       icon: <Phone size={14} /> },
  { id: 'address', label: 'Address',       icon: <MapPin size={14} /> },
  { id: 'legal',   label: 'Legal',         icon: <ScrollText size={14} /> },
  { id: 'billing', label: 'Billing & Pay', icon: <CreditCard size={14} /> },
  { id: 'internal',label: 'Internal',      icon: <Settings size={14} /> },
]

const TIMEZONES = [
  'Asia/Kolkata', 'UTC', 'America/New_York', 'America/Chicago',
  'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris',
  'Europe/Berlin', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Asia/Shanghai', 'Australia/Sydney', 'Pacific/Auckland',
]

const INDUSTRIES = [
  'Technology', 'E-commerce', 'Healthcare', 'Finance & Banking', 'Education',
  'Real Estate', 'Manufacturing', 'Retail', 'Media & Entertainment',
  'Hospitality & Tourism', 'Logistics & Supply Chain', 'Agriculture',
  'Legal & Professional Services', 'Non-Profit', 'Government', 'Other',
]

const FIELD_TABS: Record<string, string> = {
  legalName: 'basic',
  country: 'basic',
  website: 'basic',
  contactPerson: 'contact',
  email: 'contact',
  address: 'address',
  pan: 'legal',
  gstin: 'legal',
  billingName: 'billing',
  billingEmail: 'billing',
  currency: 'billing',
  loginEmail: 'internal',
  password: 'internal',
}

export default function ClientForm({ client, adminProfiles = [] }: ClientFormProps) {
  const router = useRouter()
  const isEditing = !!client
  const [activeTab, setActiveTab] = useState('basic')
  const [taxApplicable, setTaxApplicable] = useState(client?.taxApplicable ?? true)
  const [poRequired, setPoRequired] = useState(client?.poRequired ?? false)
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)
  const [err, setErr] = useState<Record<string, string[]>>({})

  const validateField = (name: string, value: string) => {
    let errorMsg = ''
    if (name === 'legalName') {
      if (!value.trim()) errorMsg = 'Legal name is required'
    } else if (name === 'country') {
      if (!value.trim()) errorMsg = 'Country is required'
    } else if (name === 'website') {
      if (value.trim() && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(value.trim())) {
        errorMsg = 'Enter a valid URL (e.g. https://example.com)'
      }
    } else if (name === 'contactPerson') {
      if (!value.trim()) errorMsg = 'Primary contact name is required'
    } else if (name === 'email') {
      if (!value.trim()) errorMsg = 'Primary email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) errorMsg = 'Invalid email address'
    } else if (name === 'address') {
      if (!value.trim()) errorMsg = 'Billing address is required'
    } else if (name === 'pan') {
      if (value.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value.trim().toUpperCase())) {
        errorMsg = 'Invalid PAN format (must match ABCDE1234F)'
      }
    } else if (name === 'gstin') {
      if (value.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value.trim().toUpperCase())) {
        errorMsg = 'Invalid GSTIN format (e.g. 29ABCDE1234F1Z5)'
      }
    } else if (name === 'billingName') {
      if (!value.trim()) errorMsg = 'Billing name is required'
    } else if (name === 'billingEmail') {
      if (!value.trim()) errorMsg = 'Billing email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) errorMsg = 'Invalid billing email address'
    }

    setLocalErrors(prev => ({
      ...prev,
      [name]: errorMsg
    }))

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
    const hasError = !!(err[field] || localErrors[field])
    return `form-input${hasError ? ' form-input--error' : ''}`
  }

  const displayError = (field: string) => {
    const errorMsg = localErrors[field] || (err[field] ? err[field][0] : '')
    if (!errorMsg) return null
    return <p className="form-error">{errorMsg}</p>
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    
    const fieldsToValidate = [
      'legalName',
      'country',
      'website',
      'contactPerson',
      'email',
      'address',
      'pan',
      'gstin',
      'billingName',
      'billingEmail',
      'currency'
    ]

    let firstErrorField = ''
    let hasErrors = false

    fieldsToValidate.forEach(field => {
      const val = (formData.get(field) as string) ?? ''
      const isValid = validateField(field, val)
      if (!isValid) {
        hasErrors = true
        if (!firstErrorField) {
          firstErrorField = field
        }
      }
    })

    if (hasErrors) {
      toast.error('Please correct the validation errors before submitting.')
      if (firstErrorField) {
        const tab = FIELD_TABS[firstErrorField]
        if (tab) {
          setActiveTab(tab)
        }
        setTimeout(() => {
          const el = document.getElementById(firstErrorField)
          if (el) el.focus()
        }, 120)
      }
      return
    }

    setPending(true)
    const rawData = Object.fromEntries(formData.entries())

    const endpoint = isEditing ? `/api/admin/clients/${client.id}` : '/api/admin/clients'
    const method = isEditing ? 'PUT' : 'POST'

    const res = await apiClient(endpoint, {
      method,
      body: JSON.stringify(rawData),
    })

    setPending(false)

    if (res.success) {
      toast.success(isEditing ? 'Client updated successfully.' : 'Client created successfully.')
      router.push(isEditing ? `/admin/clients/${client.id}` : `/admin/clients/${(res.data as any)?.id || ''}`)
    } else {
      toast.error(res.error?.message || 'Operation failed')
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/clients" className="btn btn--ghost btn--icon">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="page-header__title">
            {isEditing ? `Edit — ${client.name}` : 'New Client'}
          </h1>
          <p className="page-header__subtitle">
            {isEditing ? 'Update client information across all sections.' : 'Create a comprehensive client profile.'}
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 'var(--space-1)', padding: 'var(--space-1)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-lg)',
              border: 'none', cursor: 'pointer',
              fontSize: 'var(--text-sm)', fontWeight: activeTab === tab.id ? 'var(--font-semibold)' : 'var(--font-normal)',
              background: activeTab === tab.id ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.15s',
              fontFamily: 'var(--font-family)',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Basic Information */}
      <div className="card" style={{ display: activeTab === 'basic' ? 'block' : 'none' }}>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-6)' }}>
          Basic Information
        </h2>
        <div className="settings-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="clientType">Client Type</label>
            <select id="clientType" name="clientType" className="form-select" defaultValue={client?.clientType ?? 'ORGANIZATION'}>
              <option value="ORGANIZATION">Organization / Company</option>
              <option value="INDIVIDUAL">Individual / Freelancer</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="status">Account Status</label>
            <select id="status" name="status" className="form-select" defaultValue={client?.status ?? 'ACTIVE'}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" htmlFor="legalName">
              Legal / Full Name <span className="form-required">*</span>
            </label>
            <input id="legalName" name="legalName" className={fieldClass('legalName')}
              defaultValue={client?.legalName ?? client?.name ?? ''} placeholder="Acme Technologies Pvt Ltd" required
              onChange={handleChange} onBlur={handleBlur} />
            {displayError('legalName')}
            <p className="form-hint">Exact legal name as per registration / incorporation documents</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="displayName">Display / Trade Name</label>
            <input id="displayName" name="displayName" className="form-input"
              defaultValue={client?.displayName ?? ''} placeholder="Acme Tech" />
            <p className="form-hint">Shorter name used in day-to-day communication</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="industry">Industry</label>
            <select id="industry" name="industry" className="form-select" defaultValue={client?.industry ?? ''}>
              <option value="">— Select Industry —</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="country">Country <span className="form-required">*</span></label>
            <CountrySelect name="country" id="country" defaultValue={client?.country ?? ''} placeholder="Select country…" required
              onChange={(val) => validateField('country', val)} />
            {displayError('country')}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="stateProvince">State / Province</label>
            <input id="stateProvince" name="stateProvince" className="form-input"
              defaultValue={client?.stateProvince ?? ''} placeholder="e.g. Maharashtra, California" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="city">City</label>
            <input id="city" name="city" className="form-input"
              defaultValue={client?.city ?? ''} placeholder="e.g. Mumbai" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="timezone">Time Zone</label>
            <select id="timezone" name="timezone" className="form-select" defaultValue={client?.timezone ?? ''}>
              <option value="">— Select Timezone —</option>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="website">Website</label>
            <input id="website" name="website" type="url" className={fieldClass('website')}
              defaultValue={client?.website ?? ''} placeholder="https://acme.com"
              onChange={handleChange} onBlur={handleBlur} />
            {displayError('website')}
            <p className="form-hint">Must start with http:// or https://</p>
          </div>
        </div>
      </div>

      {/* ── TAB 2: Contact Information */}
      <div className="card" style={{ display: activeTab === 'contact' ? 'block' : 'none' }}>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-6)' }}>
          Contact Information
        </h2>
        <div className="settings-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="contactPerson">Primary Contact Name <span className="form-required">*</span></label>
            <input id="contactPerson" name="contactPerson" className={fieldClass('contactPerson')}
              defaultValue={client?.contactPerson ?? ''} placeholder="Rahul Sharma" required
              onChange={handleChange} onBlur={handleBlur} />
            {displayError('contactPerson')}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="designation">Designation / Role</label>
            <input id="designation" name="designation" className="form-input"
              defaultValue={client?.designation ?? ''} placeholder="CEO, CTO, Founder…" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Primary Email <span className="form-required">*</span></label>
            <input id="email" name="email" type="email" className={fieldClass('email')}
              defaultValue={client?.email ?? ''} placeholder="contact@acme.com" required
              onChange={handleChange} onBlur={handleBlur} />
            {displayError('email')}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="phone">Phone</label>
            <input id="phone" name="phone" className="form-input"
              defaultValue={client?.phone ?? ''} placeholder="+91 98765 43210" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="whatsapp">WhatsApp</label>
            <input id="whatsapp" name="whatsapp" className="form-input"
              defaultValue={client?.whatsapp ?? ''} placeholder="+91 98765 43210" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="preferredComm">Preferred Communication</label>
            <select id="preferredComm" name="preferredComm" className="form-select" defaultValue={client?.preferredComm ?? ''}>
              <option value="">— Select —</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="slack">Slack</option>
              <option value="teams">Microsoft Teams</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── TAB 3: Address */}
      <div className="card" style={{ display: activeTab === 'address' ? 'block' : 'none' }}>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-6)' }}>
          Address Information
        </h2>
        <div className="settings-grid">
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" htmlFor="address">Billing Address <span className="form-required">*</span></label>
            <textarea id="address" name="address" className={fieldClass('address')} rows={3}
              defaultValue={client?.address ?? ''} placeholder="Full billing address including street, area, landmark…" required
              onChange={handleChange} onBlur={handleBlur} />
            {displayError('address')}
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" htmlFor="registeredAddress">Registered / Business Address</label>
            <textarea id="registeredAddress" name="registeredAddress" className="form-textarea" rows={3}
              defaultValue={client?.registeredAddress ?? ''} placeholder="Registered office address as per legal documents…" />
            <p className="form-hint">Leave blank if same as billing address</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="billingCity">City</label>
            <input id="billingCity" name="billingCity" className="form-input"
              defaultValue={client?.billingCity ?? ''} placeholder="Mumbai" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="billingState">State / Province</label>
            <input id="billingState" name="billingState" className="form-input"
              defaultValue={client?.billingState ?? ''} placeholder="Maharashtra" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="billingCountry">Country (Billing)</label>
            <CountrySelect name="billingCountry" id="billingCountry" defaultValue={client?.billingCountry ?? ''} placeholder="Same as primary…" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="postalCode">Postal / ZIP Code</label>
            <input id="postalCode" name="postalCode" className="form-input"
              defaultValue={client?.postalCode ?? ''} placeholder="400001" />
          </div>
        </div>
      </div>

      {/* ── TAB 4: Legal & Registration */}
      <div className="card" style={{ display: activeTab === 'legal' ? 'block' : 'none' }}>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-6)' }}>
          Legal &amp; Registration
        </h2>
        <div className="settings-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="entityType">Entity Type</label>
            <select id="entityType" name="entityType" className="form-select" defaultValue={client?.entityType ?? ''}>
              <option value="">— Select —</option>
              <option value="Private Limited">Private Limited (Pvt Ltd)</option>
              <option value="Public Limited">Public Limited</option>
              <option value="LLP">LLP (Limited Liability Partnership)</option>
              <option value="Partnership">Partnership Firm</option>
              <option value="Sole Proprietorship">Sole Proprietorship</option>
              <option value="Individual">Individual</option>
              <option value="Trust/NGO">Trust / NGO</option>
              <option value="Government">Government Entity</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="registrationNo">Registration / Company No.</label>
            <input id="registrationNo" name="registrationNo" className="form-input"
              defaultValue={client?.registrationNo ?? ''} placeholder="CIN / Company No." style={{ fontFamily: 'monospace' }} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="countryOfRegistration">Country of Registration</label>
            <CountrySelect name="countryOfRegistration" id="countryOfRegistration"
              defaultValue={client?.countryOfRegistration ?? ''} placeholder="Where registered…" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="taxId">Tax ID (Generic)</label>
            <input id="taxId" name="taxId" className="form-input"
              defaultValue={client?.taxId ?? ''} placeholder="EIN, TIN, ABN, etc." style={{ fontFamily: 'monospace' }} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pan">PAN (India)</label>
            <input id="pan" name="pan" className={fieldClass('pan')}
              defaultValue={client?.pan ?? ''} placeholder="AAAAA1234A" maxLength={10}
              style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
              onChange={handleChange} onBlur={handleBlur} />
            {displayError('pan')}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="gstin">GSTIN (India)</label>
            <input id="gstin" name="gstin" className={fieldClass('gstin')}
              defaultValue={client?.gstin ?? ''} placeholder="27AAAAA0000A1Z5" maxLength={15}
              style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
              onChange={handleChange} onBlur={handleBlur} />
            {displayError('gstin')}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="vatNumber">VAT / GST Number (International)</label>
            <input id="vatNumber" name="vatNumber" className="form-input"
              defaultValue={client?.vatNumber ?? ''} placeholder="VAT / GST registration no." style={{ fontFamily: 'monospace' }} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="authorizedRep">Authorized Representative</label>
            <input id="authorizedRep" name="authorizedRep" className="form-input"
              defaultValue={client?.authorizedRep ?? ''} placeholder="Name of authorized signatory" />
          </div>
        </div>
      </div>

      {/* ── TAB 5: Billing & Payment */}
      <div className="card" style={{ display: activeTab === 'billing' ? 'block' : 'none' }}>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-6)' }}>
          Billing &amp; Payment
        </h2>
        <div className="settings-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="billingName">Billing Name <span className="form-required">*</span></label>
            <input id="billingName" name="billingName" className={fieldClass('billingName')}
              defaultValue={client?.billingName ?? ''} placeholder="Name to appear on invoices" required
              onChange={handleChange} onBlur={handleBlur} />
            {displayError('billingName')}
            <p className="form-hint">The full organization name to receive invoices</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="billingEmail">Billing Email <span className="form-required">*</span></label>
            <input id="billingEmail" name="billingEmail" type="email" className={fieldClass('billingEmail')}
              defaultValue={client?.billingEmail ?? ''} placeholder="accounts@acme.com" required
              onChange={handleChange} onBlur={handleBlur} />
            {displayError('billingEmail')}
            <p className="form-hint">Invoices and payment updates will be sent here</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="currency">Invoice Currency <span className="form-required">*</span></label>
            <select id="currency" name="currency" className="form-select" defaultValue={client?.currency ?? 'INR'} required
              onChange={handleChange} onBlur={handleBlur}>
              <option value="INR">🇮🇳 INR — Indian Rupee</option>
              <option value="USD">🇺🇸 USD — US Dollar</option>
              <option value="EUR">🇪🇺 EUR — Euro</option>
              <option value="GBP">🇬🇧 GBP — British Pound</option>
              <option value="AED">🇦🇪 AED — UAE Dirham</option>
              <option value="SGD">🇸🇬 SGD — Singapore Dollar</option>
              <option value="AUD">🇦🇺 AUD — Australian Dollar</option>
              <option value="CAD">🇨🇦 CAD — Canadian Dollar</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="paymentTerms">Payment Terms</label>
            <select id="paymentTerms" name="paymentTerms" className="form-select" defaultValue={client?.paymentTerms ?? ''}>
              <option value="">— Select —</option>
              <option value="immediate">Immediate / Advance</option>
              <option value="Net 7">Net 7 Days</option>
              <option value="Net 15">Net 15 Days</option>
              <option value="Net 30">Net 30 Days</option>
              <option value="Net 45">Net 45 Days</option>
              <option value="Net 60">Net 60 Days</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                <input type="checkbox" name="taxApplicable" id="taxApplicable" style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
                  checked={taxApplicable} onChange={(e) => setTaxApplicable(e.target.checked)} />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>Tax / GST Applicable</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                <input type="checkbox" name="poRequired" id="poRequired" style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
                  checked={poRequired} onChange={(e) => setPoRequired(e.target.checked)} />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>PO Required for Invoicing</span>
              </label>
            </div>
          </div>

          {taxApplicable && (
            <div className="form-group">
              <label className="form-label" htmlFor="taxRate">Tax Rate (%)</label>
              <input id="taxRate" name="taxRate" type="number" step="0.01" min="0" max="100"
                className="form-input" defaultValue={client?.taxRate ? String(client.taxRate) : '18'} />
            </div>
          )}

          {poRequired && (
            <div className="form-group">
              <label className="form-label" htmlFor="poNumber">PO Number</label>
              <input id="poNumber" name="poNumber" className="form-input"
                defaultValue={client?.poNumber ?? ''} placeholder="PO-2024-001" />
            </div>
          )}

          <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              Payment Information
            </h3>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="paymentMethod">Preferred Payment Method</label>
            <select id="paymentMethod" name="paymentMethod" className="form-select" defaultValue={client?.paymentMethod ?? ''}>
              <option value="">— Select —</option>
              <option value="bank_transfer">Bank Transfer / NEFT / RTGS</option>
              <option value="upi">UPI</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="wise">Wise</option>
              <option value="crypto">Cryptocurrency</option>
              <option value="cheque">Cheque / DD</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="paymentProvider">Bank / Payment Provider</label>
            <input id="paymentProvider" name="paymentProvider" className="form-input"
              defaultValue={client?.paymentProvider ?? ''} placeholder="HDFC Bank, PayPal, Wise…" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="paymentReference">Account / Reference No.</label>
            <input id="paymentReference" name="paymentReference" className="form-input"
              defaultValue={client?.paymentReference ?? ''} placeholder="Account or UPI ID" style={{ fontFamily: 'monospace' }} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="txnFeeResponsibility">Transaction Fee Borne By</label>
            <select id="txnFeeResponsibility" name="txnFeeResponsibility" className="form-select" defaultValue={client?.txnFeeResponsibility ?? ''}>
              <option value="">— Not Specified —</option>
              <option value="agency">Agency</option>
              <option value="client">Client</option>
              <option value="split">Split 50/50</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" htmlFor="paymentInstructions">Payment Instructions</label>
            <textarea id="paymentInstructions" name="paymentInstructions" className="form-textarea" rows={3}
              defaultValue={client?.paymentInstructions ?? ''} placeholder="Bank details, SWIFT/IBAN, transfer notes…" />
          </div>
        </div>
      </div>

      {/* ── TAB 6: Internal / Admin */}
      <div className="card" style={{ display: activeTab === 'internal' ? 'block' : 'none' }}>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-6)' }}>
          Internal / Admin Settings
        </h2>
        <div className="settings-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="clientSource">Client Source</label>
            <select id="clientSource" name="clientSource" className="form-select" defaultValue={client?.clientSource ?? ''}>
              <option value="">— Select Source —</option>
              <option value="referral">Referral</option>
              <option value="direct">Direct / Walk-in</option>
              <option value="linkedin">LinkedIn</option>
              <option value="website">Website / Inbound</option>
              <option value="upwork">Upwork</option>
              <option value="freelancer">Freelancer.com</option>
              <option value="fiverr">Fiverr</option>
              <option value="toptal">Toptal</option>
              <option value="guru">Guru</option>
              <option value="peopleperhour">PeoplePerHour</option>
              <option value="instagram">Instagram</option>
              <option value="twitter">X / Twitter</option>
              <option value="cold_outreach">Cold Outreach</option>
              <option value="partnership">Partnership</option>
              <option value="event">Event / Conference</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="externalPlatformUrl">External Platform URL</label>
            <input
              id="externalPlatformUrl"
              name="externalPlatformUrl"
              className="form-input"
              type="url"
              defaultValue={(client as any)?.externalPlatformUrl ?? ''}
              placeholder="https://www.upwork.com/jobs/… or contract profile link"
            />
            <p className="form-hint">Contract or profile link on Upwork, Freelancer, Fiverr, etc. Client will be redirected here for payments.</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="clientPriority">Client Priority</label>
            <select id="clientPriority" name="clientPriority" className="form-select" defaultValue={client?.clientPriority ?? 'MEDIUM'}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="VIP">VIP</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="riskLevel">Risk Level</label>
            <select id="riskLevel" name="riskLevel" className="form-select" defaultValue={client?.riskLevel ?? 'LOW'}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="accountManagerId">Account Manager</label>
            <select id="accountManagerId" name="accountManagerId" className="form-select" defaultValue={client?.accountManagerId ?? ''}>
              <option value="">— Unassigned —</option>
              {adminProfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="onboardingStatus">Onboarding Status</label>
            <select id="onboardingStatus" name="onboardingStatus" className="form-select" defaultValue={client?.onboardingStatus ?? 'PENDING'}>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="verificationStatus">Verification Status</label>
            <select id="verificationStatus" name="verificationStatus" className="form-select" defaultValue={client?.verificationStatus ?? 'UNVERIFIED'}>
              <option value="UNVERIFIED">Unverified</option>
              <option value="PENDING">Pending Verification</option>
              <option value="VERIFIED">Verified</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" htmlFor="internalTags">Internal Tags</label>
            <input id="internalTags" name="internalTags" className="form-input"
              defaultValue={client?.internalTags?.join(', ') ?? ''} placeholder="enterprise, fintech, priority-support (comma-separated)" />
            <p className="form-hint">Comma-separated tags for internal categorisation</p>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" htmlFor="internalNotes">Internal Notes</label>
            <textarea id="internalNotes" name="internalNotes" className="form-textarea" rows={4}
              defaultValue={client?.internalNotes ?? ''} placeholder="Private notes, escalation history, known issues…" />
            <p className="form-hint">Visible to admins only — not shared with the client</p>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
        <Link href="/admin/clients" className="btn btn--ghost">Cancel</Link>
        <button type="submit" className={`btn btn--primary${pending ? ' btn--loading' : ''}`} disabled={pending}>
          {pending ? '' : isEditing ? 'Save Changes' : 'Create Client'}
        </button>
      </div>
    </form>
  )
}
