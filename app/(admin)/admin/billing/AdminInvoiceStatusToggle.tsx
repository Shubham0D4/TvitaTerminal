'use client'

import { useState } from 'react'
import { apiClient } from '@/shared/utilities/api-client'
import toast from 'react-hot-toast'
import { RefreshCw } from 'lucide-react'

interface AdminInvoiceStatusToggleProps {
  invoiceId: string
  currentStatus: string
}

export default function AdminInvoiceStatusToggle({
  invoiceId,
  currentStatus: initialStatus,
}: AdminInvoiceStatusToggleProps) {
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState(false)

  const handleUpdateStatus = async (newStatus: string) => {
    if (newStatus === status || loading) return
    setLoading(true)
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
        if (res.error?.code === 'UNAUTHORIZED' || res.error?.message?.toLowerCase().includes('unauthorized')) {
          toast.error('Session expired. Please log in as Admin.')
          window.location.href = '/login'
          return
        }
        toast.error(res.error?.message || 'Failed to update invoice status')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <select
        value={status}
        onChange={(e) => handleUpdateStatus(e.target.value)}
        disabled={loading}
        className={`badge badge--${status.toLowerCase()}`}
        style={{
          cursor: 'pointer',
          outline: 'none',
          border: '1px solid var(--border-subtle, #e2e8f0)',
          padding: '3px 8px',
          borderRadius: 'var(--radius-sm)',
          fontWeight: 600,
          fontSize: '11px',
        }}
      >
        <option value="PAID">PAID</option>
        <option value="PENDING">PENDING</option>
        <option value="OVERDUE">OVERDUE</option>
        <option value="DRAFT">DRAFT</option>
        <option value="CANCELLED">CANCELLED</option>
      </select>
      {loading && <RefreshCw size={12} className="animate-spin text-muted" />}
    </div>
  )
}
