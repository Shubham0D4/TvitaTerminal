import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/auth/server'
import { redirect, notFound } from 'next/navigation'
import ClientInvoiceActions from './ClientInvoiceActions'
import type { LineItemInput } from '@/app/(admin)/admin/billing/InvoiceForm'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await prisma.invoice.findUnique({ where: { id }, select: { invoiceNo: true } })
  return {
    title: invoice ? `${invoice.invoiceNo} — Tvita Client Portal` : 'Invoice — Tvita Client Portal',
    description: 'Tax invoice details and PDF download.',
  }
}

function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount))
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

  const [invoice, settings] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id, clientId: client.id },
      include: { client: true, project: true },
    }),
    prisma.appSettings.findFirst(),
  ])

  if (!invoice) notFound()

  const lineItems: LineItemInput[] = (invoice.lineItems as any) ?? []

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <ClientInvoiceActions invoiceId={invoice.id} invoiceNo={invoice.invoiceNo} />

      {/* Printable Invoice */}
      <div
        className="card print-area"
        style={{ background: 'var(--bg-elevated)', padding: 'var(--space-8)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
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
            <span className={`badge badge--${invoice.status.toLowerCase()}`} style={{ marginTop: 'var(--space-2)', display: 'inline-flex' }}>
              {invoice.status}
            </span>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border-subtle)', margin: 'var(--space-4) 0 var(--space-6)' }} />

        {/* Bill To & Dates */}
        <div className="grid grid-cols-2 gap-6" style={{ marginBottom: 'var(--space-8)' }}>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
              Billed To
            </div>
            <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              {invoice.client.name}
            </div>
            {invoice.client.contactPerson && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{invoice.client.contactPerson}</div>
            )}
            {invoice.client.gstin && (
              <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: 2 }}>
                GSTIN: {invoice.client.gstin}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Invoice Date:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>{formatDate(invoice.issuedDate)}</span>
              <span style={{ color: 'var(--text-muted)' }}>Due Date:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>{formatDate(invoice.dueDate)}</span>
              {invoice.project && (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>Project:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>{invoice.project.name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        {lineItems.length > 0 && (
          <div className="table-wrapper" style={{ marginBottom: 'var(--space-6)' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '50%' }}>Description</th>
                  <th>Qty</th>
                  <th>Rate (₹)</th>
                  <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-primary)' }}>{item.description}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{item.qty}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatCurrency(item.rate)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: 260 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(invoice.subtotal))}</span>
              </div>
              {Number(invoice.taxAmount) > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Tax ({Number(invoice.taxRate)}%)</span>
                  <span>{formatCurrency(Number(invoice.taxAmount))}</span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: 'var(--space-3)',
                  borderTop: '2px solid var(--border-default)',
                  fontWeight: 'var(--font-bold)',
                  fontSize: 'var(--text-lg)',
                  color: 'var(--text-primary)',
                }}
              >
                <span>Total</span>
                <span style={{ color: 'var(--accent-primary)' }}>{formatCurrency(Number(invoice.amount))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bank / Payment Notes */}
        {invoice.notes && (
          <div style={{ marginTop: 'var(--space-8)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
              Payment Instructions
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {invoice.notes}
            </div>
          </div>
        )}

        <div style={{ marginTop: 'var(--space-8)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
          This is a computer-generated invoice and does not require a physical signature.
        </div>
      </div>
    </div>
  )
}
