import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/auth/server'
import { notFound, redirect } from 'next/navigation'

export const metadata = {
  title: 'Tax Invoice — Tvita Print Service',
  description: 'GST compliant tax invoice print rendering document.',
}

function formatCurrency(amount: number | string, currency = 'INR'): string {
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : `${currency} `
  return `${symbol}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function InvoicePrintPage({ params }: PageProps) {
  const { id } = await params
  const user = await getServerUser()
  if (!user) {
    redirect('/login')
  }

  // 1. Fetch fresh invoice data from the database
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      project: true,
    },
  })

  if (!invoice) {
    notFound()
  }

  // 2. Perform strict authorization check
  let hasAccess = false
  if (user.role === 'ADMIN') {
    hasAccess = true
  } else if (user.role === 'CLIENT') {
    const client = await prisma.client.findFirst({
      where: { OR: [{ profileId: user.id }, { email: user.email }] },
    })
    if (client && invoice.clientId === client.id) {
      hasAccess = true
    }
  }

  if (!hasAccess) {
    redirect('/login')
  }

  // 3. Retrieve settings
  const settings = await prisma.appSettings.findFirst()

  const lineItems: Array<{ description: string; sacCode?: string; qty?: number; quantity?: number; rate: number; amount: number }> =
    (invoice.lineItems as any) ?? []

  const subtotal = Number(invoice.subtotal)
  const discount = Number(invoice.discountAmount || 0)
  const taxable = Math.max(0, subtotal - discount)
  const taxRate = Number(invoice.taxRate)
  const taxAmount = Number(invoice.taxAmount)
  const totalAmount = Number(invoice.amount)
  const isPaid = invoice.status === 'PAID'
  const paid = isPaid ? totalAmount : Number(invoice.amountPaid || 0)
  const due = Math.max(0, totalAmount - paid)

  const taxType = invoice.taxType || (Number(invoice.cgstAmount) > 0 ? 'INTRA_STATE' : Number(invoice.igstAmount) > 0 ? 'INTER_STATE' : 'EXPORT')

  return (
    <div style={{ padding: '36px', maxWidth: '860px', margin: '0 auto', background: '#ffffff', color: '#0f172a', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-size: 11pt;
            padding: 0 !important;
            margin: 0 !important;
          }
          * {
            box-shadow: none !important;
            text-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
          margin-bottom: 24px;
        }
        .table th {
          background-color: #1e40af;
          color: #ffffff;
          font-weight: 600;
          font-size: 12px;
          padding: 10px 14px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .table td {
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 14px;
          font-size: 13px;
          color: #0f172a;
        }
        .table tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .grid { display: grid; }
        .grid-cols-2 { grid-template-columns: 1fr 1fr; }
        .gap-8 { gap: 32px; }
        .mb-6 { margin-bottom: 24px; }
        .mb-8 { margin-bottom: 32px; }
        .divider { height: 2px; background: #1e40af; margin: 24px 0; }
        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .badge--paid { background-color: #1e40af; color: #ffffff; }
        .badge--pending { background-color: #fee2e2; color: #dc2626; border: 1px solid #dc2626; }
        .badge--overdue { background-color: #dc2626; color: #ffffff; }
      `}} />

      <div className="print-area">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1e40af', margin: 0, letterSpacing: '-0.02em' }}>
              {settings?.companyName ?? 'Tvita'}
            </h1>
            <div style={{ fontSize: '12px', color: '#0f172a', marginTop: '6px', lineHeight: 1.6 }}>
              {settings?.companyAddress && <div>{settings.companyAddress}</div>}
              {settings?.companyEmail && <div>Email: {settings.companyEmail}</div>}
              <div style={{ display: 'flex', gap: '20px', marginTop: '4px', fontFamily: 'monospace', fontWeight: '600' }}>
                {settings?.companyGstin && <div>GSTIN: <span style={{ color: '#1e40af' }}>{settings.companyGstin}</span></div>}
                {settings?.companyPan && <div>PAN: <span style={{ color: '#1e40af' }}>{settings.companyPan}</span></div>}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.1em', color: '#1e40af', textTransform: 'uppercase' }}>
              TAX INVOICE
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '4px', fontFamily: 'monospace' }}>
              {invoice.invoiceNo}
            </div>
            <div style={{ marginTop: '10px' }}>
              <span className={`badge badge--${invoice.status.toLowerCase()}`}>
                STATUS: {invoice.status}
              </span>
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* Supplier & Bill To */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div style={{ border: '1px solid #1e40af', padding: '16px 20px', borderRadius: '8px', background: '#ffffff' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              1. Supplier Details (From)
            </div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
              {settings?.companyName ?? 'Tvita'}
            </div>
            {settings?.companyAddress && <div style={{ fontSize: '12px', color: '#0f172a', marginTop: '4px', lineHeight: 1.5 }}>{settings.companyAddress}</div>}
            <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#0f172a', marginTop: '8px' }}>
              GSTIN: <strong>{settings?.companyGstin || 'Not Specified'}</strong>
            </div>
          </div>

          <div style={{ border: '1px solid #1e40af', padding: '16px 20px', borderRadius: '8px', background: '#ffffff' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              2. Recipient Details (Billed To)
            </div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
              {invoice.client.legalName || invoice.client.name}
            </div>
            {invoice.client.contactPerson && (
              <div style={{ fontSize: '12px', color: '#0f172a', marginTop: '2px' }}>Attn: {invoice.client.contactPerson}</div>
            )}
            {invoice.client.address && (
              <div style={{ fontSize: '12px', color: '#0f172a', marginTop: '4px', lineHeight: 1.5 }}>{invoice.client.address}</div>
            )}
            <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#0f172a', marginTop: '8px' }}>
              GSTIN: {invoice.client.gstin ? <strong>{invoice.client.gstin}</strong> : 'Unregistered / Overseas'}
            </div>
          </div>
        </div>

        {/* Project & Dates */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#ffffff', border: '1px solid #1e40af', borderRadius: '8px', marginBottom: '24px', fontSize: '12px' }}>
          <div>Project: <strong style={{ color: '#1e40af' }}>{invoice.project?.name || 'General Services'}</strong></div>
          {invoice.poNumber && <div>PO #: <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{invoice.poNumber}</strong></div>}
          <div>Issued Date: <strong>{formatDate(invoice.issuedDate)}</strong></div>
          <div>Due Date: <strong style={{ color: due > 0 ? '#dc2626' : '#0f172a' }}>{formatDate(invoice.dueDate)}</strong></div>
        </div>

        {/* Items Table */}
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Item Description</th>
              <th style={{ textAlign: 'center', width: '90px' }}>SAC / HSN</th>
              <th style={{ textAlign: 'center', width: '60px' }}>Qty</th>
              <th style={{ textAlign: 'right', width: '120px' }}>Rate</th>
              <th style={{ textAlign: 'right', width: '130px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, idx) => (
              <tr key={idx}>
                <td style={{ color: '#0f172a', fontWeight: '500' }}>{idx + 1}</td>
                <td style={{ fontWeight: '600', color: '#0f172a' }}>{item.description}</td>
                <td style={{ textAlign: 'center', fontFamily: 'monospace', color: '#0f172a' }}>{item.sacCode || '998314'}</td>
                <td style={{ textAlign: 'center', color: '#0f172a' }}>{item.qty || item.quantity || 1}</td>
                <td style={{ textAlign: 'right', color: '#0f172a' }}>{formatCurrency(item.rate, invoice.currency)}</td>
                <td style={{ textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{formatCurrency(item.amount, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals & Banking */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div style={{ width: '48%' }}>
            {settings?.bankAccount && (
              <div style={{ border: '1px solid #1e40af', padding: '16px', borderRadius: '8px', fontSize: '12px', lineHeight: 1.7, background: '#ffffff' }}>
                <div style={{ fontWeight: '700', color: '#1e40af', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Banking Details</div>
                <div>Bank: <strong>{settings.bankName}</strong></div>
                <div>Account: <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{settings.bankAccount}</strong></div>
                <div>IFSC Code: <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{settings.bankIfsc}</strong></div>
                {settings.bankBranch && <div>Branch: {settings.bankBranch}</div>}
                {(settings as any)?.bankUpiId && <div>UPI ID: <strong style={{ fontFamily: 'monospace', color: '#1e40af' }}>{(settings as any).bankUpiId}</strong></div>}
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#0f172a', marginTop: '10px', padding: '6px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              Place of Supply: <strong>{invoice.placeOfSupply || 'Maharashtra — 27'}</strong> | Reverse Charge: <strong>{invoice.reverseCharge ? 'Yes' : 'No'}</strong>
            </div>
          </div>

          <div style={{ width: '46%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="flex justify-between" style={{ fontSize: '13px', color: '#0f172a' }}>
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal, invoice.currency)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between" style={{ fontSize: '13px', color: '#0f172a' }}>
                <span>Discount:</span>
                <span>-{formatCurrency(discount, invoice.currency)}</span>
              </div>
            )}

            <div className="flex justify-between" style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
              <span>Taxable Amount:</span>
              <span>{formatCurrency(taxable, invoice.currency)}</span>
            </div>

            {taxType === 'INTRA_STATE' && (
              <>
                <div className="flex justify-between" style={{ fontSize: '12px', color: '#0f172a' }}>
                  <span>CGST ({(taxRate / 2).toFixed(1)}%):</span>
                  <span>{formatCurrency(Number(invoice.cgstAmount || taxAmount / 2), invoice.currency)}</span>
                </div>
                <div className="flex justify-between" style={{ fontSize: '12px', color: '#0f172a' }}>
                  <span>SGST ({(taxRate / 2).toFixed(1)}%):</span>
                  <span>{formatCurrency(Number(invoice.sgstAmount || taxAmount / 2), invoice.currency)}</span>
                </div>
              </>
            )}

            {taxType === 'INTER_STATE' && (
              <div className="flex justify-between" style={{ fontSize: '12px', color: '#0f172a' }}>
                <span>IGST ({taxRate}%):</span>
                <span>{formatCurrency(Number(invoice.igstAmount || taxAmount), invoice.currency)}</span>
              </div>
            )}

            {taxType === 'EXPORT' && (
              <div className="flex justify-between" style={{ fontSize: '12px', color: '#0f172a' }}>
                <span>GST (Export / 0%):</span>
                <span>{formatCurrency(0, invoice.currency)}</span>
              </div>
            )}

            <div style={{ height: '1px', background: '#0f172a', margin: '8px 0' }} />

            <div className="flex justify-between" style={{ fontSize: '16px', fontWeight: '800', color: '#1e40af' }}>
              <span>Total Amount:</span>
              <span>{formatCurrency(totalAmount, invoice.currency)}</span>
            </div>

            <div className="flex justify-between" style={{ fontSize: '12px', color: '#0f172a' }}>
              <span>Amount Paid:</span>
              <span>{formatCurrency(paid, invoice.currency)}</span>
            </div>

            <div className="flex justify-between" style={{ fontSize: '14px', fontWeight: '800', color: due > 0 ? '#dc2626' : '#1e40af', background: due > 0 ? '#fff1f2' : '#ffffff', border: due > 0 ? '1px solid #dc2626' : '1px solid #1e40af', padding: '8px 12px', borderRadius: '6px' }}>
              <span>Amount Due:</span>
              <span>{formatCurrency(due, invoice.currency)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div style={{ fontSize: '12px', color: '#0f172a', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '24px', background: '#ffffff' }}>
            <strong>Notes & Terms:</strong> {invoice.notes}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#0f172a', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          This is an official computer-generated tax invoice. No physical signature is required.
        </div>
      </div>
    </div>
  )
}
