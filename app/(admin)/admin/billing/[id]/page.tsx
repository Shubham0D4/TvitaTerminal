import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import InvoiceActions from './InvoiceActions'
import type { LineItemInput } from '../InvoiceForm'

export const metadata = {
  title: 'Tax Invoice — Tvita Admin',
  description: 'GST compliant tax invoice breakdown and payment status.',
}

function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount))
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminInvoiceDetailPage({ params }: PageProps) {
  const { id } = await params

  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        project: true,
      },
    }),
    prisma.appSettings.findFirst(),
  ])

  if (!invoice) {
    notFound()
  }

  const lineItems: LineItemInput[] = (invoice.lineItems as any) ?? []

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <InvoiceActions invoiceId={invoice.id} status={invoice.status} />

      {/* Printable Invoice Container */}
      <div
        className="card print-area"
        style={{
          background: 'var(--bg-elevated)',
          padding: 'var(--space-8)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-default)',
        }}
      >
        {/* Header: Agency & Invoice # */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-8)' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--accent-primary)' }}>
              {settings?.companyName ?? 'Tvita Digital Agency'}
            </h1>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)', lineHeight: 1.5 }}>
              {settings?.companyAddress && <div>{settings.companyAddress}</div>}
              {settings?.companyEmail && <div>Email: {settings.companyEmail}</div>}
              {settings?.companyGstin && (
                <div style={{ fontFamily: 'monospace', marginTop: 2 }}>
                  GSTIN: <strong>{settings.companyGstin}</strong>
                </div>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              TAX INVOICE
            </div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', marginTop: 2 }}>
              {invoice.invoiceNo}
            </div>
            <span className={`badge badge--${invoice.status.toLowerCase()}`} style={{ marginTop: 'var(--space-2)' }}>
              {invoice.status}
            </span>
          </div>
        </div>

        <div className="divider mb-6" />

        {/* Bill To & Dates */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Billed To
            </div>
            <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginTop: 'var(--space-1)' }}>
              {invoice.client.name}
            </div>
            {invoice.client.contactPerson && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Attn: {invoice.client.contactPerson}
              </div>
            )}
            {invoice.client.address && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                {invoice.client.address}
              </div>
            )}
            {invoice.client.gstin && (
              <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace', color: 'var(--text-primary)', marginTop: 4 }}>
                GSTIN: <strong>{invoice.client.gstin}</strong>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', textAlign: 'right' }}>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Issue Date: </span>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                {formatDate(invoice.issuedDate)}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Payment Due: </span>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                {formatDate(invoice.dueDate)}
              </span>
            </div>
            {invoice.paidDate && (
              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Paid On: </span>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'var(--color-success)' }}>
                  {formatDate(invoice.paidDate)}
                </span>
              </div>
            )}
            {invoice.project && (
              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Project: </span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-primary)' }}>
                  {invoice.project.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="table-wrapper mb-6">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Item Description</th>
                <th style={{ textAlign: 'center', width: '60px' }}>Qty</th>
                <th style={{ textAlign: 'right', width: '120px' }}>Rate</th>
                <th style={{ textAlign: 'right', width: '120px' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                    {item.description}
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{item.qty}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                    {formatCurrency(item.rate)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Tax Calculation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-8)' }}>
          <div style={{ maxWidth: 360 }}>
            {settings?.bankAccount && (
              <div style={{ background: 'var(--bg-overlay)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 4 }}>
                  Bank Transfer Details (NEFT / RTGS / IMPS)
                </div>
                <div>Bank Name: {settings.bankName}</div>
                <div>Account No: <strong style={{ fontFamily: 'monospace' }}>{settings.bankAccount}</strong></div>
                <div>IFSC Code: <strong style={{ fontFamily: 'monospace' }}>{settings.bankIfsc}</strong></div>
                {settings.bankBranch && <div>Branch: {settings.bankBranch}</div>}
              </div>
            )}
          </div>

          <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div className="flex justify-between" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              <span>Subtotal:</span>
              <span>{formatCurrency(Number(invoice.subtotal))}</span>
            </div>

            {Number(invoice.taxAmount) > 0 && (
              <>
                <div className="flex justify-between" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>CGST ({(Number(invoice.taxRate) / 2)}%):</span>
                  <span>{formatCurrency(Number(invoice.taxAmount) / 2)}</span>
                </div>
                <div className="flex justify-between" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>SGST ({(Number(invoice.taxRate) / 2)}%):</span>
                  <span>{formatCurrency(Number(invoice.taxAmount) / 2)}</span>
                </div>
              </>
            )}

            <div className="divider" style={{ margin: 'var(--space-2) 0' }} />

            <div className="flex justify-between" style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
              <span>Total Amount:</span>
              <span style={{ color: 'var(--accent-primary)' }}>{formatCurrency(Number(invoice.amount))}</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        {settings?.invoiceFooter && (
          <div style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)' }}>
            {settings.invoiceFooter}
          </div>
        )}
      </div>
    </div>
  )
}
