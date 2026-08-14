'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import toast from 'react-hot-toast'
import { CheckCircle2, Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface InvoiceActionsProps {
  invoiceId: string
  status: string
}

export default function InvoiceActions({ invoiceId, status }: InvoiceActionsProps) {
  const [isPending, setIsPending] = useState(false)

  const handleMarkPaid = async () => {
    setIsPending(true)
    const res = await apiClient(`/api/admin/billing/invoices/${invoiceId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'PAID' }),
    })
    setIsPending(false)

    if (res.success) {
      toast.success('Invoice marked as paid.')
      window.location.reload()
    } else {
      toast.error(res.error?.message || 'Failed to mark invoice as paid')
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
    <div className="no-print flex items-center justify-between mb-6">
      <Link href="/admin/billing" className="btn btn--ghost">
        <ArrowLeft size={16} />
        Back to Invoices
      </Link>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handlePrint} className="btn btn--secondary">
          <Printer size={16} />
          Print / Save PDF
        </button>

        {status === 'PENDING' && (
          <button
            type="button"
            onClick={handleMarkPaid}
            className={`btn btn--primary${isPending ? ' btn--loading' : ''}`}
            disabled={isPending}
          >
            <CheckCircle2 size={16} />
            Mark as Paid
          </button>
        )}
      </div>
    </div>
  )
}
