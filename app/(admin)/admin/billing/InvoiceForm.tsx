'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { apiClient } from '@/shared/utilities/api-client'
import type { Client, Project } from '@prisma/client'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

export interface LineItemInput {
  description: string
  sacCode?: string
  qty: number
  rate: number
  amount: number
}

interface InvoiceFormProps {
  clients: Pick<Client, 'id' | 'name' | 'gstin' | 'country'>[]
  projects: Pick<Project, 'id' | 'name' | 'clientId'>[]
  initialClientId?: string
  initialProjectId?: string
}

export default function InvoiceForm({
  clients,
  projects,
  initialClientId,
  initialProjectId,
}: InvoiceFormProps) {
  const router = useRouter()
  const [selectedClientId, setSelectedClientId] = useState(initialClientId ?? '')
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId ?? '')
  const [taxRate, setTaxRate] = useState(18)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [poNumber, setPoNumber] = useState('')
  const [taxType, setTaxType] = useState<'AUTO' | 'INTRA_STATE' | 'INTER_STATE' | 'EXPORT'>('AUTO')
  const [status, setStatus] = useState<'PENDING' | 'PAID' | 'DRAFT' | 'OVERDUE'>('PENDING')
  const [placeOfSupply, setPlaceOfSupply] = useState('')
  const [reverseCharge, setReverseCharge] = useState(false)
  const [pending, setPending] = useState(false)
  const [currency, setCurrency] = useState('INR')
  const [rates, setRates] = useState<Record<string, number>>({ INR: 83.25, USD: 1.0, EUR: 0.92, GBP: 0.79 })

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates) {
          setRates(data.rates)
        }
      })
      .catch(err => console.error('Failed to fetch exchange rates:', err))
  }, [])

  const handleCurrencyChange = (newCurrency: string) => {
    const rateFromUSDToPrev = rates[currency] || 1
    const rateFromUSDToNew = rates[newCurrency] || 1
    
    const updated = lineItems.map(item => {
      const rateInUSD = item.rate / rateFromUSDToPrev
      const newRate = Math.round(rateInUSD * rateFromUSDToNew * 100) / 100
      return {
        ...item,
        rate: newRate,
        amount: item.qty * newRate
      }
    })
    setLineItems(updated)
    setCurrency(newCurrency)
  }

  const formatValue = (val: number) => {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
    }).format(val)
  }

  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    { description: 'Software Development & IT Consulting', sacCode: '998314', qty: 1, rate: 10000, amount: 10000 },
  ])

  // Filter projects by selected client
  const filteredProjects = selectedClientId
    ? projects.filter((p) => p.clientId === selectedClientId)
    : projects

  const handleItemChange = (index: number, field: keyof LineItemInput, val: string | number) => {
    const updated = [...lineItems]
    const item = { ...updated[index] }

    if (field === 'description') {
      item.description = String(val)
    } else if (field === 'sacCode') {
      item.sacCode = String(val)
    } else if (field === 'qty') {
      item.qty = Math.max(1, Number(val) || 1)
      item.amount = item.qty * item.rate
    } else if (field === 'rate') {
      item.rate = Math.max(0, Number(val) || 0)
      item.amount = item.qty * item.rate
    }

    updated[index] = item
    setLineItems(updated)
  }

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', sacCode: '998314', qty: 1, rate: 0, amount: 0 }])
  }

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const subtotal = lineItems.reduce((acc, i) => acc + i.amount, 0)
  const taxableAmount = Math.max(0, subtotal - discountAmount)
  const activeTaxRate = taxType === 'EXPORT' ? 0 : taxRate
  const taxAmount = (taxableAmount * activeTaxRate) / 100
  const grandTotal = taxableAmount + taxAmount

  // Default dates: Today & +15 days
  const [todayStr] = useState(() => new Date().toISOString().split('T')[0])
  const [dueDateStr] = useState(() => new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedClientId) {
      toast.error('Please select a client.')
      return
    }

    setPending(true)
    const form = e.currentTarget
    const formData = new FormData(form)
    const rawData = Object.fromEntries(formData.entries())

    const payload = {
      clientId: rawData.clientId,
      projectId: rawData.projectId || null,
      issuedDate: rawData.issuedDate,
      dueDate: rawData.dueDate,
      notes: rawData.notes || null,
      poNumber: poNumber || null,
      discountAmount: Number(discountAmount) || 0,
      taxType: taxType === 'AUTO' ? undefined : taxType,
      placeOfSupply: placeOfSupply || undefined,
      reverseCharge,
      taxRate: Number(taxRate) || 0,
      currency: currency,
      status: status,
      lineItems: lineItems,
    }

    const res = await apiClient<{ id: string }>('/api/admin/billing/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    setPending(false)

    if (res.success && res.data) {
      toast.success('GST Invoice created successfully.')
      router.push(`/admin/billing/${res.data.id}`)
    } else {
      toast.error(res.error?.message || 'Failed to create invoice')
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <Link href="/admin/billing" className="btn btn--ghost btn--icon" title="Back to invoices">
            <ArrowLeft size={18} />
          </Link>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
            GST Tax Invoice Builder
          </h2>
        </div>

        <div className="settings-grid mb-6">
          <div className="form-group">
            <label className="form-label" htmlFor="clientId">
              Billed To (Client) <span className="form-required">*</span>
            </label>
            <select
              id="clientId"
              name="clientId"
              className="form-select"
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value)
                setSelectedProjectId('')
              }}
              required
            >
              <option value="" disabled>Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.gstin ? `(GSTIN: ${c.gstin})` : ''}
                </option>
              ))}
            </select>
            <p className="form-hint">Select the client profile to populate legal and state tax information</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="projectId">Associated Project (Optional)</label>
            <select
              id="projectId"
              name="projectId"
              className="form-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">None / General Invoice</option>
              {filteredProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p className="form-hint">Link this invoice with an active client project</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="poNumber">PO / Contract Number</label>
            <input
              id="poNumber"
              name="poNumber"
              className="form-input"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="e.g. PO-2026-0814"
            />
            <p className="form-hint">Client Purchase Order or contract reference number</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="issuedDate">Issue Date <span className="form-required">*</span></label>
            <input
              id="issuedDate"
              name="issuedDate"
              type="date"
              className="form-input"
              defaultValue={todayStr}
              required
            />
            <p className="form-hint">Official date of invoice issuance</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="dueDate">Due Date <span className="form-required">*</span></label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              className="form-input"
              defaultValue={dueDateStr}
              required
            />
            <p className="form-hint">Payment deadline for client remittance</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="currency">Invoice Currency <span className="form-required">*</span></label>
            <select
              id="currency"
              name="currency"
              className="form-select"
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              required
            >
              <option value="INR">INR (₹) — Domestic GST</option>
              <option value="USD">USD ($) — Export</option>
              <option value="EUR">EUR (€) — Export</option>
              <option value="GBP">GBP (£) — Export</option>
            </select>
            <p className="form-hint">Currency denomination for line items and tax breakdown</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="taxType">GST Tax Type</label>
            <select
              id="taxType"
              name="taxType"
              className="form-select"
              value={taxType}
              onChange={(e) => setTaxType(e.target.value as any)}
            >
              <option value="AUTO">Auto-Detect (CGST+SGST / IGST / Export)</option>
              <option value="INTRA_STATE">Intra-State (CGST 9% + SGST 9%)</option>
              <option value="INTER_STATE">Inter-State (IGST 18%)</option>
              <option value="EXPORT">Export / International (Zero-Rated 0%)</option>
            </select>
            <p className="form-hint">GST treatment rule based on client location</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="placeOfSupply">Place of Supply (Optional)</label>
            <input
              id="placeOfSupply"
              name="placeOfSupply"
              className="form-input"
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
              placeholder="e.g. Maharashtra — 27"
            />
            <p className="form-hint">Leave blank to auto-derive from client state details</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="status">Initial Status <span className="form-required">*</span></label>
            <select
              id="status"
              name="status"
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="PENDING">Pending (Unpaid / Sent)</option>
              <option value="PAID">Paid (Mark as Paid)</option>
              <option value="DRAFT">Draft</option>
              <option value="OVERDUE">Overdue</option>
            </select>
            <p className="form-hint">Set to Paid if payment was received upfront</p>
          </div>
        </div>

        {/* Dynamic Line Items Section */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
            Line Items & Services
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {lineItems.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '3fr 1fr 1fr 1.5fr 1.5fr 40px',
                  gap: 'var(--space-3)',
                  alignItems: 'center',
                }}
              >
                <div>
                  <input
                    className="form-input"
                    placeholder="Description of service / deliverable"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <input
                    className="form-input"
                    placeholder="SAC Code"
                    value={item.sacCode ?? '998314'}
                    onChange={(e) => handleItemChange(index, 'sacCode', e.target.value)}
                  />
                </div>

                <div>
                  <input
                    type="number"
                    min={1}
                    className="form-input"
                    placeholder="Qty"
                    value={item.qty}
                    onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className="form-input"
                    placeholder={`Rate (${currency === 'INR' ? '₹' : currency})`}
                    value={item.rate}
                    onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                    required
                  />
                </div>

                <div style={{ padding: '0 var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', textAlign: 'right' }}>
                  {formatValue(item.amount)}
                </div>

                <div>
                  <button
                    type="button"
                    className="btn btn--ghost btn--icon"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length === 1}
                    style={{ opacity: lineItems.length === 1 ? 0.3 : 1 }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={addLineItem}
            style={{ marginTop: 'var(--space-3)' }}
          >
            <Plus size={14} />
            Add Line Item
          </button>
        </div>

        {/* Invoice Summary & Tax Calculation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ width: '48%', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div>
              <label className="form-label" htmlFor="notes">Notes & Terms of Payment</label>
              <textarea
                id="notes"
                name="notes"
                className="form-textarea"
                placeholder="Payment due within 15 days. Subject to Mumbai jurisdiction."
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                id="reverseCharge"
                name="reverseCharge"
                type="checkbox"
                checked={reverseCharge}
                onChange={(e) => setReverseCharge(e.target.checked)}
              />
              <label htmlFor="reverseCharge" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                Applicable for Reverse Charge Mechanism (RCM)
              </label>
            </div>
          </div>

          <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div className="flex items-center justify-between" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              <span>Subtotal:</span>
              <span>{formatValue(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              <span>Discount:</span>
              <input
                type="number"
                min={0}
                className="form-input"
                style={{ width: '100px', height: '28px', padding: '2px 6px', textAlign: 'right' }}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center justify-between" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              <span>Taxable Subtotal:</span>
              <span>{formatValue(taxableAmount)}</span>
            </div>

            <div className="flex items-center justify-between" style={{ fontSize: 'var(--text-sm)' }}>
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--text-muted)' }}>GST Rate:</span>
                <select
                  id="taxRate"
                  name="taxRate"
                  className="form-select"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  disabled={taxType === 'EXPORT'}
                  style={{ width: '70px', padding: '2px 6px', height: '28px' }}
                >
                  <option value={18}>18%</option>
                  <option value={12}>12%</option>
                  <option value={5}>5%</option>
                  <option value={0}>0%</option>
                </select>
              </div>
              <span style={{ color: 'var(--text-primary)' }}>{formatValue(taxAmount)}</span>
            </div>

            <div className="divider" style={{ margin: 'var(--space-2) 0' }} />

            <div className="flex items-center justify-between" style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
              <span>Total Invoice Amount:</span>
              <span style={{ color: 'var(--accent-primary)' }}>{formatValue(grandTotal)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
          <Link href="/admin/billing" className="btn btn--ghost">Cancel</Link>
          <button
            type="submit"
            className={`btn btn--primary${pending ? ' btn--loading' : ''}`}
            disabled={pending || !selectedClientId}
          >
            {pending ? '' : 'Generate & Email GST Invoice'}
          </button>
        </div>
      </div>
    </form>
  )
}
