'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/utils/api-client'
import Link from 'next/link'
import { ArrowLeft, Lock, Building2, Phone, MapPin, ScrollText, CreditCard, Wallet, Settings, Check, ChevronLeft, ChevronRight, Sliders } from 'lucide-react'
import CountrySelect from '@/app/components/ui/CountrySelect'
import type { Client } from '@prisma/client'

interface ClientFormProps {
  client?: Client | null
  adminProfiles?: { id: string; name: string }[]
}

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

interface FormRowProps {
  label: string
  htmlFor: string
  hint?: string
  required?: boolean
  error?: React.ReactNode
  show?: boolean
  children: React.ReactNode
}

function FormRow({ label, htmlFor, hint, required, error, show = true, children }: FormRowProps) {
  return (
    <div className="form-row" style={{ display: show ? undefined : 'none' }}>
      <div className="form-row__meta">
        <label htmlFor={htmlFor} className="form-label" style={{ margin: 0, fontWeight: 600 }}>
          {label} {required && <span className="form-required">*</span>}
        </label>
        {hint && <span className="form-hint" style={{ marginTop: '4px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{hint}</span>}
      </div>
      <div className="form-row__control">
        {children}
        {error}
      </div>
    </div>
  )
}

export default function ClientForm({ client, adminProfiles = [] }: ClientFormProps) {
  const router = useRouter()
  const isEditing = !!client
  const [currentStep, setCurrentStep] = useState(1)
  const [showAdvanced, setShowAdvanced] = useState(isEditing)
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

  const validateStep = (stepNumber: number): boolean => {
    let fieldsToValidate: string[] = []
    if (stepNumber === 1) {
      fieldsToValidate = ['legalName', 'country', 'website', 'contactPerson', 'email']
    } else if (stepNumber === 2) {
      fieldsToValidate = ['address', 'pan', 'gstin']
    } else if (stepNumber === 3) {
      fieldsToValidate = ['billingName', 'billingEmail']
    }

    let hasErrors = false
    let firstErrorField = ''

    fieldsToValidate.forEach(field => {
      const el = document.getElementById(field) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null
      const val = el ? el.value : ''
      const isValid = validateField(field, val)
      if (!isValid) {
        hasErrors = true
        if (!firstErrorField) {
          firstErrorField = field
        }
      }
    })

    if (hasErrors) {
      toast.error('Please correct the validation errors in the current step.')
      if (firstErrorField) {
        const el = document.getElementById(firstErrorField)
        if (el) el.focus()
      }
      return false
    }

    return true
  }

  const handleStepClick = (stepNum: number) => {
    if (stepNum < currentStep) {
      setCurrentStep(stepNum)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    
    if (stepNum === 2 && currentStep === 1) {
      if (validateStep(1)) {
        setCurrentStep(2)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } else if (stepNum === 3) {
      if (currentStep === 1) {
        if (validateStep(1) && validateStep(2)) {
          setCurrentStep(3)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      } else if (currentStep === 2) {
        if (validateStep(2)) {
          setCurrentStep(3)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => prev - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Validate all steps before submission
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return
    }

    setPending(true)
    const form = e.currentTarget
    const formData = new FormData(form)
    const rawData = Object.fromEntries(formData.entries())

    // Convert checkbox values explicitely
    rawData.taxApplicable = taxApplicable ? 'true' : ''
    rawData.poRequired = poRequired ? 'true' : ''

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
      <div className="flex items-center justify-between flex-wrap gap-4">
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

        {/* Quick Add vs. Comprehensive Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '20px',
            border: '1px solid var(--border-default)',
            background: showAdvanced ? 'rgba(35, 64, 184, 0.08)' : 'var(--bg-surface)',
            color: showAdvanced ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.15s ease'
          }}
        >
          <Sliders size={13} />
          <span>{showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}</span>
        </button>
      </div>

      {/* Visual Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4) var(--space-6)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', marginBottom: 'var(--space-2)' }}>
        {[
          { step: 1, label: 'Profile & Contact' },
          { step: 2, label: 'Address & Legal' },
          { step: 3, label: 'Billing & Settings' }
        ].map((s, idx) => {
          const isCurrent = currentStep === s.step
          const isCompleted = currentStep > s.step
          const isClickable = s.step < currentStep || (s.step === 2 && currentStep === 1) || (s.step === 3 && (currentStep === 2 || currentStep === 1))

          return (
            <div key={s.step} style={{ display: 'flex', alignItems: 'center', flex: idx < 2 ? 1 : 'none' }}>
              <div 
                onClick={() => isClickable && handleStepClick(s.step)}
                className={isClickable ? 'step-badge-interactive' : ''}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 'var(--space-3)',
                  cursor: isClickable ? 'pointer' : 'default',
                  userSelect: 'none'
                }}
              >
                <div 
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isCompleted ? 'rgba(30, 107, 80, 0.1)' : isCurrent ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    border: isCompleted ? '1.5px solid #1e6b50' : isCurrent ? '1.5px solid var(--accent-primary)' : '1.5px solid var(--border-default)',
                    color: isCompleted ? '#1e6b50' : isCurrent ? '#ffffff' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: 'var(--text-sm)',
                    transition: 'all 0.2s'
                  }}
                >
                  {isCompleted ? <Check size={16} /> : s.step}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: isCurrent ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isCurrent ? 600 : 500 }}>
                    Step {s.step}
                  </span>
                  <span style={{ fontSize: 'var(--text-sm)', color: isCurrent ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isCurrent ? 600 : 500, whiteSpace: 'nowrap' }}>
                    {s.label}
                  </span>
                </div>
              </div>
              {idx < 2 && (
                <div 
                  style={{
                    flex: 1,
                    height: '2px',
                    background: isCompleted ? '#1e6b50' : 'var(--border-subtle)',
                    margin: '0 var(--space-6)',
                    minWidth: '40px'
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* STEP 1: Company Profile & Contact */}
      {currentStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Basic Information Card */}
          <div 
            className="card" 
            style={{ 
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid rgba(16, 28, 107, 0.08)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.01)',
              padding: '24px'
            }}
          >
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              <Building2 size={18} style={{ color: 'var(--accent-primary)' }} />
              Company Profile
            </h2>
            <div>
              <FormRow label="Client Type" htmlFor="clientType" show={showAdvanced}>
                <select id="clientType" name="clientType" className="form-select" defaultValue={client?.clientType ?? 'ORGANIZATION'}>
                  <option value="ORGANIZATION">Organization / Company</option>
                  <option value="INDIVIDUAL">Individual / Freelancer</option>
                </select>
              </FormRow>

              <FormRow label="Legal / Full Name" htmlFor="legalName" required hint="Exact legal name as per registration / incorporation documents" error={displayError('legalName')}>
                <input id="legalName" name="legalName" className={fieldClass('legalName')}
                  defaultValue={client?.legalName ?? client?.name ?? ''} placeholder="Acme Technologies Pvt Ltd" required
                  onChange={handleChange} onBlur={handleBlur} />
              </FormRow>

              <FormRow label="Display / Trade Name" htmlFor="displayName" show={showAdvanced} hint="Shorter name used in day-to-day communication">
                <input id="displayName" name="displayName" className="form-input"
                  defaultValue={client?.displayName ?? ''} placeholder="Acme Tech" />
              </FormRow>

              <FormRow label="Industry" htmlFor="industry" show={showAdvanced}>
                <select id="industry" name="industry" className="form-select" defaultValue={client?.industry ?? ''}>
                  <option value="">— Select Industry —</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </FormRow>

              <FormRow label="Country" htmlFor="country" required error={displayError('country')}>
                <CountrySelect name="country" id="country" defaultValue={client?.country ?? ''} placeholder="Select country…" required
                  onChange={(val) => validateField('country', val)} />
              </FormRow>

              <FormRow label="State / Province" htmlFor="stateProvince" show={showAdvanced}>
                <input id="stateProvince" name="stateProvince" className="form-input"
                  defaultValue={client?.stateProvince ?? ''} placeholder="e.g. Maharashtra, California" />
              </FormRow>

              <FormRow label="City" htmlFor="city" show={showAdvanced}>
                <input id="city" name="city" className="form-input"
                  defaultValue={client?.city ?? ''} placeholder="e.g. Mumbai" />
              </FormRow>

              <FormRow label="Time Zone" htmlFor="timezone" show={showAdvanced}>
                <select id="timezone" name="timezone" className="form-select" defaultValue={client?.timezone ?? ''}>
                  <option value="">— Select Timezone —</option>
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </FormRow>

              <FormRow label="Website" htmlFor="website" show={showAdvanced} hint="Must start with http:// or https://" error={displayError('website')}>
                <input id="website" name="website" type="url" className={fieldClass('website')}
                  defaultValue={client?.website ?? ''} placeholder="https://acme.com"
                  onChange={handleChange} onBlur={handleBlur} />
              </FormRow>
            </div>
          </div>

          {/* Contact Information Card */}
          <div 
            className="card" 
            style={{ 
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid rgba(16, 28, 107, 0.08)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.01)',
              padding: '24px'
            }}
          >
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              <Phone size={18} style={{ color: 'var(--accent-primary)' }} />
              Primary Contact Information
            </h2>
            <div>
              <FormRow label="Primary Contact Name" htmlFor="contactPerson" required error={displayError('contactPerson')}>
                <input id="contactPerson" name="contactPerson" className={fieldClass('contactPerson')}
                  defaultValue={client?.contactPerson ?? ''} placeholder="Rahul Sharma" required
                  onChange={handleChange} onBlur={handleBlur} />
              </FormRow>

              <FormRow label="Designation / Role" htmlFor="designation" show={showAdvanced}>
                <input id="designation" name="designation" className="form-input"
                  defaultValue={client?.designation ?? ''} placeholder="CEO, CTO, Founder…" />
              </FormRow>

              <FormRow label="Primary Email" htmlFor="email" required error={displayError('email')}>
                <input id="email" name="email" type="email" className={fieldClass('email')}
                  defaultValue={client?.email ?? ''} placeholder="contact@acme.com" required
                  onChange={handleChange} onBlur={handleBlur} />
              </FormRow>

              <FormRow label="Phone" htmlFor="phone" show={showAdvanced}>
                <input id="phone" name="phone" className="form-input"
                  defaultValue={client?.phone ?? ''} placeholder="+91 98765 43210" />
              </FormRow>

              <FormRow label="WhatsApp" htmlFor="whatsapp" show={showAdvanced}>
                <input id="whatsapp" name="whatsapp" className="form-input"
                  defaultValue={client?.whatsapp ?? ''} placeholder="+91 98765 43210" />
              </FormRow>

              <FormRow label="Preferred Communication" htmlFor="preferredComm" show={showAdvanced}>
                <select id="preferredComm" name="preferredComm" className="form-select" defaultValue={client?.preferredComm ?? ''}>
                  <option value="">— Select —</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="slack">Slack</option>
                  <option value="teams">Microsoft Teams</option>
                </select>
              </FormRow>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Address & Legal Registration */}
      {currentStep === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Address Information Card */}
          <div 
            className="card" 
            style={{ 
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid rgba(16, 28, 107, 0.08)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.01)',
              padding: '24px'
            }}
          >
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              <MapPin size={18} style={{ color: 'var(--accent-primary)' }} />
              Address Information
            </h2>
            <div>
              <FormRow label="Billing Address" htmlFor="address" required error={displayError('address')}>
                <textarea id="address" name="address" className={fieldClass('address')} rows={3}
                  defaultValue={client?.address ?? ''} placeholder="Full billing address including street, area, landmark…" required
                  onChange={handleChange} onBlur={handleBlur} />
              </FormRow>

              <FormRow label="Registered / Business Address" htmlFor="registeredAddress" show={showAdvanced} hint="Leave blank if same as billing address">
                <textarea id="registeredAddress" name="registeredAddress" className="form-textarea" rows={3}
                  defaultValue={client?.registeredAddress ?? ''} placeholder="Registered office address as per legal documents…" />
              </FormRow>

              <FormRow label="City" htmlFor="billingCity" show={showAdvanced}>
                <input id="billingCity" name="billingCity" className="form-input"
                  defaultValue={client?.billingCity ?? ''} placeholder="Mumbai" />
              </FormRow>

              <FormRow label="State / Province" htmlFor="billingState" show={showAdvanced}>
                <input id="billingState" name="billingState" className="form-input"
                  defaultValue={client?.billingState ?? ''} placeholder="Maharashtra" />
              </FormRow>

              <FormRow label="Country (Billing)" htmlFor="billingCountry" show={showAdvanced}>
                <CountrySelect name="billingCountry" id="billingCountry" defaultValue={client?.billingCountry ?? ''} placeholder="Same as primary…" />
              </FormRow>

              <FormRow label="Postal / ZIP Code" htmlFor="postalCode" show={showAdvanced}>
                <input id="postalCode" name="postalCode" className="form-input"
                  defaultValue={client?.postalCode ?? ''} placeholder="400001" />
              </FormRow>
            </div>
          </div>

          {/* Legal & Registration Card */}
          <div 
            className="card" 
            style={{ 
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid rgba(16, 28, 107, 0.08)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.01)',
              padding: '24px'
            }}
          >
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              <ScrollText size={18} style={{ color: 'var(--accent-primary)' }} />
              Legal &amp; Registration
            </h2>
            <div>
              <FormRow label="Entity Type" htmlFor="entityType" show={showAdvanced}>
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
              </FormRow>

              <FormRow label="Registration / Company No." htmlFor="registrationNo" show={showAdvanced}>
                <input id="registrationNo" name="registrationNo" className="form-input"
                  defaultValue={client?.registrationNo ?? ''} placeholder="CIN / Company No." style={{ fontFamily: 'monospace' }} />
              </FormRow>

              <FormRow label="Country of Registration" htmlFor="countryOfRegistration" show={showAdvanced}>
                <CountrySelect name="countryOfRegistration" id="countryOfRegistration"
                  defaultValue={client?.countryOfRegistration ?? ''} placeholder="Where registered…" />
              </FormRow>

              <FormRow label="Tax ID (Generic)" htmlFor="taxId" show={showAdvanced}>
                <input id="taxId" name="taxId" className="form-input"
                  defaultValue={client?.taxId ?? ''} placeholder="EIN, TIN, ABN, etc." style={{ fontFamily: 'monospace' }} />
              </FormRow>

              <FormRow label="PAN (India)" htmlFor="pan" show={showAdvanced} error={displayError('pan')}>
                <input id="pan" name="pan" className={fieldClass('pan')}
                  defaultValue={client?.pan ?? ''} placeholder="AAAAA1234A" maxLength={10}
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                  onChange={handleChange} onBlur={handleBlur} />
              </FormRow>

              <FormRow label="GSTIN (India)" htmlFor="gstin" show={showAdvanced} error={displayError('gstin')}>
                <input id="gstin" name="gstin" className={fieldClass('gstin')}
                  defaultValue={client?.gstin ?? ''} placeholder="27AAAAA0000A1Z5" maxLength={15}
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                  onChange={handleChange} onBlur={handleBlur} />
              </FormRow>

              <FormRow label="VAT / GST Number (International)" htmlFor="vatNumber" show={showAdvanced}>
                <input id="vatNumber" name="vatNumber" className="form-input"
                  defaultValue={client?.vatNumber ?? ''} placeholder="VAT / GST registration no." style={{ fontFamily: 'monospace' }} />
              </FormRow>

              <FormRow label="Authorized Representative" htmlFor="authorizedRep" show={showAdvanced}>
                <input id="authorizedRep" name="authorizedRep" className="form-input"
                  defaultValue={client?.authorizedRep ?? ''} placeholder="Name of authorized signatory" />
              </FormRow>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Billing, Payment & Internal Settings */}
      {currentStep === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Billing & Payment Card */}
          <div 
            className="card" 
            style={{ 
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid rgba(16, 28, 107, 0.08)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.01)',
              padding: '24px'
            }}
          >
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              <CreditCard size={18} style={{ color: 'var(--accent-primary)' }} />
              Billing &amp; Payment
            </h2>
            <div>
              <FormRow label="Billing Name" htmlFor="billingName" required hint="The full organization name to receive invoices" error={displayError('billingName')}>
                <input id="billingName" name="billingName" className={fieldClass('billingName')}
                  defaultValue={client?.billingName ?? ''} placeholder="Name to appear on invoices" required
                  onChange={handleChange} onBlur={handleBlur} />
              </FormRow>

              <FormRow label="Billing Email" htmlFor="billingEmail" required hint="Invoices and payment updates will be sent here" error={displayError('billingEmail')}>
                <input id="billingEmail" name="billingEmail" type="email" className={fieldClass('billingEmail')}
                  defaultValue={client?.billingEmail ?? ''} placeholder="accounts@acme.com" required
                  onChange={handleChange} onBlur={handleBlur} />
              </FormRow>

              <FormRow label="Invoice Currency" htmlFor="currency" required>
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
              </FormRow>

              <FormRow label="Payment Terms" htmlFor="paymentTerms" show={showAdvanced}>
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
              </FormRow>

              <FormRow label="Billing Policies" htmlFor="taxApplicable" show={showAdvanced}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
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
              </FormRow>

              {taxApplicable && (
                <FormRow label="Tax Rate (%)" htmlFor="taxRate" show={showAdvanced}>
                  <input id="taxRate" name="taxRate" type="number" step="0.01" min="0" max="100"
                    className="form-input" defaultValue={client?.taxRate ? String(client.taxRate) : '18'} />
                </FormRow>
              )}

              {poRequired && (
                <FormRow label="PO Number" htmlFor="poNumber" show={showAdvanced}>
                  <input id="poNumber" name="poNumber" className="form-input"
                    defaultValue={client?.poNumber ?? ''} placeholder="PO-2024-001" />
                </FormRow>
              )}

              {showAdvanced && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 'var(--space-4) 0', marginTop: 'var(--space-2)' }}>
                  <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                    Payment Details
                  </h3>
                </div>
              )}

              <FormRow label="Preferred Payment Method" htmlFor="paymentMethod" show={showAdvanced}>
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
              </FormRow>

              <FormRow label="Bank / Payment Provider" htmlFor="paymentProvider" show={showAdvanced}>
                <input id="paymentProvider" name="paymentProvider" className="form-input"
                  defaultValue={client?.paymentProvider ?? ''} placeholder="HDFC Bank, PayPal, Wise…" />
              </FormRow>

              <FormRow label="Account / Reference No." htmlFor="paymentReference" show={showAdvanced}>
                <input id="paymentReference" name="paymentReference" className="form-input"
                  defaultValue={client?.paymentReference ?? ''} placeholder="Account or UPI ID" style={{ fontFamily: 'monospace' }} />
              </FormRow>

              <FormRow label="Transaction Fee Borne By" htmlFor="txnFeeResponsibility" show={showAdvanced}>
                <select id="txnFeeResponsibility" name="txnFeeResponsibility" className="form-select" defaultValue={client?.txnFeeResponsibility ?? ''}>
                  <option value="">— Not Specified —</option>
                  <option value="agency">Agency</option>
                  <option value="client">Client</option>
                  <option value="split">Split 50/50</option>
                </select>
              </FormRow>

              <FormRow label="Payment Instructions" htmlFor="paymentInstructions" show={showAdvanced}>
                <textarea id="paymentInstructions" name="paymentInstructions" className="form-textarea" rows={3}
                  defaultValue={client?.paymentInstructions ?? ''} placeholder="Bank details, SWIFT/IBAN, transfer notes…" />
              </FormRow>
            </div>
          </div>

          {/* Internal / Admin Settings Card */}
          <div 
            className="card" 
            style={{ 
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid rgba(16, 28, 107, 0.08)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.01)',
              padding: '24px'
            }}
          >
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              <Settings size={18} style={{ color: 'var(--accent-primary)' }} />
              Internal / Admin Settings
            </h2>
            <div>
              <FormRow label="Client Source" htmlFor="clientSource" show={showAdvanced}>
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
              </FormRow>

              <FormRow label="External Platform URL" htmlFor="externalPlatformUrl" show={showAdvanced} hint="Contract or profile link on Upwork, Freelancer, Fiverr, etc. Client will be redirected here for payments.">
                <input
                  id="externalPlatformUrl"
                  name="externalPlatformUrl"
                  className="form-input"
                  type="url"
                  defaultValue={(client as any)?.externalPlatformUrl ?? ''}
                  placeholder="https://www.upwork.com/jobs/… or contract profile link"
                />
              </FormRow>

              <FormRow label="Client Priority" htmlFor="clientPriority" show={showAdvanced}>
                <select id="clientPriority" name="clientPriority" className="form-select" defaultValue={client?.clientPriority ?? 'MEDIUM'}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="VIP">VIP</option>
                </select>
              </FormRow>

              <FormRow label="Risk Level" htmlFor="riskLevel" show={showAdvanced}>
                <select id="riskLevel" name="riskLevel" className="form-select" defaultValue={client?.riskLevel ?? 'LOW'}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </FormRow>

              <FormRow label="Account Manager" htmlFor="accountManagerId" show={showAdvanced}>
                <select id="accountManagerId" name="accountManagerId" className="form-select" defaultValue={client?.accountManagerId ?? ''}>
                  <option value="">— Unassigned —</option>
                  {adminProfiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </FormRow>

              <FormRow label="Onboarding Status" htmlFor="onboardingStatus" show={showAdvanced}>
                <select id="onboardingStatus" name="onboardingStatus" className="form-select" defaultValue={client?.onboardingStatus ?? 'PENDING'}>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </FormRow>

              <FormRow label="Verification Status" htmlFor="verificationStatus" show={showAdvanced}>
                <select id="verificationStatus" name="verificationStatus" className="form-select" defaultValue={client?.verificationStatus ?? 'UNVERIFIED'}>
                  <option value="UNVERIFIED">Unverified</option>
                  <option value="PENDING">Pending Verification</option>
                  <option value="VERIFIED">Verified</option>
                </select>
              </FormRow>

              <FormRow label="Internal Tags" htmlFor="internalTags" show={showAdvanced} hint="Comma-separated tags for internal categorisation">
                <input id="internalTags" name="internalTags" className="form-input"
                  defaultValue={client?.internalTags?.join(', ') ?? ''} placeholder="enterprise, fintech, priority-support (comma-separated)" />
              </FormRow>

              <FormRow label="Internal Notes" htmlFor="internalNotes" show={showAdvanced} hint="Visible to admins only — not shared with the client">
                <textarea id="internalNotes" name="internalNotes" className="form-textarea" rows={4}
                  defaultValue={client?.internalNotes ?? ''} placeholder="Private notes, escalation history, known issues…" />
              </FormRow>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: 'var(--space-4) 0', 
          borderTop: '1px solid var(--border-subtle)', 
          marginTop: 'var(--space-2)' 
        }}
      >
        <div>
          {currentStep > 1 && (
            <button 
              type="button" 
              onClick={handleBack} 
              className="btn btn--secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ChevronLeft size={16} /> Back
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Link href="/admin/clients" className="btn btn--ghost">Cancel</Link>
          {currentStep < 3 ? (
            <button 
              type="button" 
              onClick={handleNext} 
              className="btn btn--primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button 
              type="submit" 
              className={`btn btn--primary${pending ? ' btn--loading' : ''}`} 
              disabled={pending}
            >
              {pending ? '' : isEditing ? 'Save Changes' : 'Create Client'}
            </button>
          )}
        </div>
      </div>

    </form>
  )
}
