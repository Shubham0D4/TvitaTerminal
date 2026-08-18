'use client'

import { ArrowLeft, Download, Printer } from 'lucide-react'
import Link from 'next/link'

interface Props {
  invoiceId: string
  invoiceNo: string
}

export default function ClientInvoiceActions({ invoiceId, invoiceNo }: Props) {
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
      <Link href="/client/invoices" className="btn btn--ghost">
        <ArrowLeft size={16} />
        Back to Invoices
      </Link>

      <div className="flex items-center gap-3">
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {invoiceNo}
        </span>

        {/* Direct PDF Download button */}
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

        {/* Print button */}
        <button
          type="button"
          onClick={handlePrint}
          className="btn btn--secondary btn--sm"
        >
          <Printer size={15} />
          Print
        </button>
      </div>
    </div>
  )
}
