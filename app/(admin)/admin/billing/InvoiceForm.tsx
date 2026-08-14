'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import type { Client, Project } from '@prisma/client'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Calculator } from 'lucide-react'

export interface LineItemInput {
  description: string
  qty: number
  rate: number
  amount: number
}

interface InvoiceFormProps {
  clients: Pick<Client, 'id' | 'name' | 'gstin'>[]
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
  const [pending, setPending] = useState(false)

  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    { description: 'Agency Services', qty: 1, rate: 10000, amount: 10000 },
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
    setLineItems([...lineItems, { description: '', qty: 1, rate: 0, amount: 0 }])
  }

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const subtotal = lineItems.reduce((acc, i) => acc + i.amount, 0)
  const taxAmount = (subtotal * taxRate) / 100
  const grandTotal = subtotal + taxAmount

  const selectedClient = clients.find((c) => c.id === selectedClientId)

  // Default dates: Today & +15 days
  const todayStr = new Date().toISOString().split('T')[0]
  const dueDateStr = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

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
    rawData.lineItemsJson = JSON.stringify(lineItems)

    const res = await apiClient<{ id: string }>('/api/admin/billing/invoices', {
      method: 'POST',
      body: JSON.stringify(rawData),
    })

    setPending(false)

    if (res.success && res.data) {
      toast.success('Invoice created successfully.')
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
            GST Invoice Builder
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
                  {c.name} {c.gstin ? `(GST: ${c.gstin})` : ''}
                </option>
              ))}
            </select>
            <p className="form-hint">Select the active company/client profile to generate invoice for</p>
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
            <p className="form-hint">Associate this billing transaction with a specific project</p>
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
            <p className="form-hint">Creation date printed on the invoice</p>
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
            <p className="form-hint">Final day for payment receipt before invoice status becomes overdue</p>
          </div>
        </div>

        {/* Dynamic Line Items Section */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
            Line Items
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {lineItems.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '3fr 1fr 1.5fr 1.5fr 40px',
                  gap: 'var(--space-3)',
                  alignItems: 'center',
                }}
              >
                <div>
                  <input
                    className="form-input"
                    placeholder="Description of service / item"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    required
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
                    step={100}
                    className="form-input"
                    placeholder="Rate (₹)"
                    value={item.rate}
                    onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                    required
                  />
                </div>

                <div style={{ padding: '0 var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', textAlign: 'right' }}>
                  ₹{item.amount.toLocaleString('en-IN')}
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
          <div style={{ maxWidth: 360 }}>
            <label className="form-label" htmlFor="notes">Invoice Notes & Payment Instructions</label>
            <textarea
              id="notes"
              name="notes"
              className="form-textarea"
              placeholder="Payment due within 15 days. Bank transfer details will be attached."
              rows={3}
            />
          </div>

          <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div className="flex items-center justify-between" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              <span>Subtotal:</span>
              <span>₹{subtotal.toLocaleString('en-IN')}</span>
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
                  style={{ width: '70px', padding: '2px 6px', height: '28px' }}
                >
                  <option value={18}>18%</option>
                  <option value={12}>12%</option>
                  <option value={5}>5%</option>
                  <option value={0}>0%</option>
                </select>
              </div>
              <span style={{ color: 'var(--text-primary)' }}>₹{taxAmount.toLocaleString('en-IN')}</span>
            </div>

            <div className="divider" style={{ margin: 'var(--space-2) 0' }} />

            <div className="flex items-center justify-between" style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
              <span>Total Amount:</span>
              <span style={{ color: 'var(--accent-primary)' }}>₹{grandTotal.toLocaleString('en-IN')}</span>
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
            {pending ? '' : 'Generate Invoice'}
          </button>
        </div>
      </div>
    </form>
  )
}
