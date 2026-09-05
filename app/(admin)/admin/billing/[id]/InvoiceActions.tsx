'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import { Download, Printer, ArrowLeft, Mail, RefreshCw, CheckCircle2, Clock } from 'lucide-react'
import Link from 'next/link'

interface InvoiceActionsProps {
  invoiceId: string
  status: string
}

const INVOICE_STATUSES = [
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'DRAFT', label: 'Draft' },
]

export default function InvoiceActions({ invoiceId, status: currentStatus }: InvoiceActionsProps) {
  const [status, setStatus] = useState(currentStatus)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [reminderPending, setReminderPending] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status) return
    setIsUpdatingStatus(true)
    try {
      const res = await apiClient(`/api/admin/billing/invoices/${invoiceId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.success) {
        setStatus(newStatus)
        toast.success(`Invoice status updated to ${newStatus}`)
        window.location.reload()
      } else {
        toast.error(res.error?.message || 'Failed to update invoice status')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update invoice status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleSendReminder = async () => {
    setReminderPending(true)
    try {
      const res = await apiClient(`/api/admin/billing/invoices/${invoiceId}/reminder`, {
        method: 'POST',
      })
      if (res.success) {
        toast.success('Payment reminder sent to client.')
      } else {
        toast.error(res.error?.message || 'Failed to send payment reminder')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reminder')
    } finally {
      setReminderPending(false)
    }
  }

  const handlePrint = () => {
    const existing = document.getElementById('print-invoice-iframe')
    if (existing) {
      existing.remove()
    }
    const iframe = document.createElement('iframe')
    iframe.id = 'print-invoice-iframe'
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.visibility = 'hidden'
    document.body.appendChild(iframe)

    iframe.src = `/print/invoice/${invoiceId}`
    iframe.onload = () => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
      }
    }
  }

  return (
    <div className="no-print invoice-actions">
      <Link href="/admin/billing" className="btn btn--ghost invoice-actions__back">
        <ArrowLeft size={16} />
        Back to Invoices
      </Link>

      <div className="invoice-actions__tools">
        {/* Direct PDF Download */}
        <a
          href={`/api/invoices/${invoiceId}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="btn btn--primary btn--sm"
          title="Download PDF File"
        >
          <Download size={15} />
          Download PDF
        </a>

        {/* Print Button */}
        <button type="button" onClick={handlePrint} className="btn btn--secondary btn--sm">
          <Printer size={15} />
          Print Document
        </button>

        {/* Quick Mark Paid / Pending Buttons */}
        {status !== 'PAID' ? (
          <button
            type="button"
            onClick={() => handleStatusChange('PAID')}
            className="btn btn--secondary btn--sm"
            style={{ color: 'var(--color-success, #10b981)' }}
            disabled={isUpdatingStatus}
          >
            <CheckCircle2 size={15} />
            Mark as Paid
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleStatusChange('PENDING')}
            className="btn btn--secondary btn--sm"
            style={{ color: 'var(--color-warning, #f59e0b)' }}
            disabled={isUpdatingStatus}
          >
            <Clock size={15} />
            Mark as Pending
          </button>
        )}

        {/* Send Reminder */}
        {status === 'PENDING' && (
          <button
            type="button"
            onClick={handleSendReminder}
            className={`btn btn--secondary btn--sm${reminderPending ? ' btn--loading' : ''}`}
            disabled={reminderPending}
          >
            <Mail size={15} />
            Send Reminder
          </button>
        )}

        {/* Admin Status Dropdown Selector */}
        <div className="flex items-center gap-2" style={{ background: 'var(--bg-surface)', padding: '4px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'var(--text-muted)' }}>
            Status:
          </span>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isUpdatingStatus}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-semibold)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {INVOICE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {isUpdatingStatus && <RefreshCw size={12} className="animate-spin text-muted" />}
        </div>
      </div>
    </div>
  )
}
