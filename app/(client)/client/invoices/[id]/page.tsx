import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/auth/server'
import { redirect, notFound } from 'next/navigation'
import ClientInvoiceActions from './ClientInvoiceActions'
import PaymentRedirect from '@/app/components/billing/PaymentRedirect'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await prisma.invoice.findUnique({ where: { id }, select: { invoiceNo: true } })
  return {
    title: invoice ? `${invoice.invoiceNo} — Tvita Client Portal` : 'Invoice — Tvita Client Portal',
    description: 'Tax invoice details and PDF download.',
  }
}

function formatCurrency(amount: number | string, currency = 'INR'): string {
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : `${currency} `
  return `${symbol}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

type PageProps = { params: Promise<{ id: string }> }

export default async function ClientInvoiceDetailPage({ params }: PageProps) {
  const { id } = await params
  const user = await getServerUser()
  if (!user) redirect('/login')

  // Verify this invoice belongs to this client
  const client = await prisma.client.findFirst({
    where: { OR: [{ profileId: user.id }, { email: user.email }] },
  })
  if (!client) redirect('/client/invoices')

  // External platform redirect
  const externalSources = ['upwork', 'freelancer', 'fiverr', 'toptal', 'guru', 'peopleperhour']
  const isExternal = client.clientSource && externalSources.includes(client.clientSource)
  const externalUrl = (client as any).externalPlatformUrl as string | null
  if (isExternal && externalUrl) {
    return (
      <PaymentRedirect
        clientSource={client.clientSource!}
        externalPlatformUrl={externalUrl}
        clientName={client.name}
      />
    )
  }

  const [invoice, settings] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id, clientId: client.id },
      include: { client: true, project: true },
    }),
    prisma.appSettings.findFirst(),
  ])

  if (!invoice) notFound()

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
    <div style={{ maxWidth: 860, margin: '0 auto', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <ClientInvoiceActions invoiceId={invoice.id} invoiceNo={invoice.invoiceNo} />

      {/* Printable Invoice Container */}
      <div
        className="card print-area"
        style={{
          background: '#ffffff',
          padding: '36px',
          borderRadius: '16px',
          border: '1px solid #1e40af',
          color: '#0f172a',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        }}
      >
        {/* Header: Agency & Invoice # */}
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
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  background: isPaid ? '#1e40af' : due > 0 ? '#dc2626' : '#1e40af',
                  color: '#ffffff',
                }}
              >
                STATUS: {invoice.status}
              </span>
            </div>
          </div>
        </div>

        <div style={{ height: '2px', background: '#1e40af', margin: '24px 0' }} />

        {/* From & Bill To */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
          <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #1e40af' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              1. Supplier (From)
            </div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
              {settings?.companyName ?? 'Tvita'}
            </div>
            {settings?.companyAddress && <div style={{ fontSize: '12px', color: '#0f172a', marginTop: '4px', lineHeight: 1.5 }}>{settings.companyAddress}</div>}
            <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#0f172a', marginTop: '8px' }}>
              GSTIN: <strong>{settings?.companyGstin || 'Not Specified'}</strong>
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #1e40af' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              2. Recipient (Billed To)
            </div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
              {invoice.client.legalName || invoice.client.name}
            </div>
            {invoice.client.contactPerson && (
              <div style={{ fontSize: '12px', color: '#0f172a', marginTop: '2px' }}>
                Attn: {invoice.client.contactPerson}
              </div>
            )}
            {invoice.client.address && (
              <div style={{ fontSize: '12px', color: '#0f172a', marginTop: '4px', lineHeight: 1.5 }}>
                {invoice.client.address}
              </div>
            )}
            <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#0f172a', marginTop: '8px' }}>
              GSTIN: {invoice.client.gstin ? <strong>{invoice.client.gstin}</strong> : 'Unregistered / Overseas'}
            </div>
          </div>
        </div>

        {/* Project & Dates */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '12px',
            border: '1px solid #1e40af',
          }}
        >
          <div>
            <span style={{ color: '#0f172a' }}>Project: </span>
            <strong style={{ color: '#1e40af' }}>{invoice.project?.name || 'General Services'}</strong>
          </div>
          {invoice.poNumber && (
            <div>
              <span style={{ color: '#0f172a' }}>PO / Ref #: </span>
              <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{invoice.poNumber}</strong>
            </div>
          )}
          <div>
            <span style={{ color: '#0f172a' }}>Issued: </span>
            <strong style={{ color: '#0f172a' }}>{formatDate(invoice.issuedDate)}</strong>
          </div>
          <div>
            <span style={{ color: '#0f172a' }}>Due Date: </span>
            <strong style={{ color: due > 0 ? '#dc2626' : '#0f172a' }}>{formatDate(invoice.dueDate)}</strong>
          </div>
        </div>

        {/* Line Items Table */}
        <div style={{ marginBottom: '32px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1e40af', color: '#ffffff' }}>
                <th style={{ padding: '10px 14px', fontSize: '12px', textAlign: 'left', width: '40px' }}>#</th>
                <th style={{ padding: '10px 14px', fontSize: '12px', textAlign: 'left' }}>Item Description</th>
                <th style={{ padding: '10px 14px', fontSize: '12px', textAlign: 'center', width: '90px' }}>SAC / HSN</th>
                <th style={{ padding: '10px 14px', fontSize: '12px', textAlign: 'center', width: '60px' }}>Qty</th>
                <th style={{ padding: '10px 14px', fontSize: '12px', textAlign: 'right', width: '120px' }}>Rate</th>
                <th style={{ padding: '10px 14px', fontSize: '12px', textAlign: 'right', width: '130px' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 14px', fontSize: '13px', color: '#0f172a' }}>{idx + 1}</td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                    {item.description}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', textAlign: 'center', fontFamily: 'monospace', color: '#0f172a' }}>
                    {item.sacCode || '998314'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', textAlign: 'center', color: '#0f172a' }}>{item.qty || item.quantity || 1}</td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', textAlign: 'right', color: '#0f172a' }}>
                    {formatCurrency(item.rate, invoice.currency)}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                    {formatCurrency(item.amount, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Breakdown & Bank Details */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div style={{ width: '48%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {settings?.bankAccount && (
              <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', fontSize: '12px', lineHeight: 1.7, border: '1px solid #1e40af' }}>
                <div style={{ fontWeight: '700', color: '#1e40af', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Bank Transfer Details (NEFT / RTGS / UPI)
                </div>
                <div>Bank Name: <strong>{settings.bankName}</strong></div>
                <div>Account No: <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{settings.bankAccount}</strong></div>
                <div>IFSC Code: <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{settings.bankIfsc}</strong></div>
                {settings.bankBranch && <div>Branch: {settings.bankBranch}</div>}
                {(settings as any)?.bankUpiId && <div>UPI ID: <strong style={{ fontFamily: 'monospace', color: '#1e40af' }}>{(settings as any).bankUpiId}</strong></div>}
              </div>
            )}

            <div style={{ fontSize: '11px', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', color: '#0f172a' }}>
              <span>Place of Supply: <strong>{invoice.placeOfSupply || 'Maharashtra — 27'}</strong></span>
              <span>Reverse Charge: <strong>{invoice.reverseCharge ? 'Yes' : 'No'}</strong></span>
            </div>
          </div>

          <div style={{ width: '46%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#0f172a' }}>
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal, invoice.currency)}</span>
            </div>

            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#0f172a' }}>
                <span>Discount:</span>
                <span>-{formatCurrency(discount, invoice.currency)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
              <span>Taxable Amount:</span>
              <span>{formatCurrency(taxable, invoice.currency)}</span>
            </div>

            {taxType === 'INTRA_STATE' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#0f172a' }}>
                  <span>CGST ({(taxRate / 2).toFixed(1)}%):</span>
                  <span>{formatCurrency(Number(invoice.cgstAmount || taxAmount / 2), invoice.currency)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#0f172a' }}>
                  <span>SGST ({(taxRate / 2).toFixed(1)}%):</span>
                  <span>{formatCurrency(Number(invoice.sgstAmount || taxAmount / 2), invoice.currency)}</span>
                </div>
              </>
            )}

            {taxType === 'INTER_STATE' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#0f172a' }}>
                <span>IGST ({taxRate}%):</span>
                <span>{formatCurrency(Number(invoice.igstAmount || taxAmount), invoice.currency)}</span>
              </div>
            )}

            {taxType === 'EXPORT' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#0f172a' }}>
                <span>GST (Export / Zero-Rated):</span>
                <span>{formatCurrency(0, invoice.currency)}</span>
              </div>
            )}

            <div style={{ height: '1px', background: '#0f172a', margin: '8px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '800', color: '#1e40af' }}>
              <span>Total Invoice Amount:</span>
              <span>{formatCurrency(totalAmount, invoice.currency)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#0f172a' }}>
              <span>Amount Paid:</span>
              <span>{formatCurrency(paid, invoice.currency)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '800', color: due > 0 ? '#dc2626' : '#1e40af', background: due > 0 ? '#fff1f2' : '#ffffff', border: due > 0 ? '1px solid #dc2626' : '1px solid #1e40af', padding: '8px 12px', borderRadius: '6px' }}>
              <span>Amount Due:</span>
              <span>{formatCurrency(due, invoice.currency)}</span>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        {invoice.notes && (
          <div style={{ fontSize: '12px', color: '#0f172a', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '24px', background: '#ffffff' }}>
            <strong>Notes & Payment Terms:</strong> {invoice.notes}
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: '11px', color: '#0f172a', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          This is an official computer-generated tax invoice. No physical signature is required.
        </div>
      </div>
    </div>
  )
}
