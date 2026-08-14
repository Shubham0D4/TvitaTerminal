import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/auth/server'
import { notFound, redirect } from 'next/navigation'
import type { LineItemInput } from '@/app/(admin)/admin/billing/InvoiceForm'

export const metadata = {
  title: 'Tax Invoice — Tvita Print Service',
  description: 'GST compliant tax invoice print rendering document.',
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
    // Verify client matches this invoice
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

  const lineItems: LineItemInput[] = (invoice.lineItems as any) ?? []

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', background: '#fff', color: '#000' }}>
      {/* Print-specific style overrides to ensure clean white background and solid borders */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: #fff !important;
            color: #000 !important;
            font-size: 12pt;
          }
          * {
            color: #000 !important;
            background: transparent !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          .table th, .table td {
            border: 1px solid #ccc !important;
          }
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          margin-bottom: 15px;
        }
        .table th, .table td {
          border: 1px solid var(--border-default, #ccc);
          padding: 8px 12px;
          text-align: left;
        }
        .table th {
          background-color: var(--bg-overlay, #f9f9f9);
          font-weight: bold;
        }
        .flex {
          display: flex;
        }
        .justify-between {
          justify-content: space-between;
        }
        .grid {
          display: grid;
        }
        .grid-cols-2 {
          grid-template-columns: 1fr 1fr;
        }
        .gap-6 {
          gap: 24px;
        }
        .mb-8 {
          margin-bottom: 32px;
        }
        .mb-6 {
          margin-bottom: 24px;
        }
        .divider {
          height: 1px;
          background: #ccc;
          margin: 16px 0;
        }
        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: bold;
          text-transform: uppercase;
        }
        .badge--paid {
          background-color: #d1fae5;
          color: #065f46;
        }
        .badge--pending {
          background-color: #fef3c7;
          color: #92400e;
        }
        .badge--overdue {
          background-color: #fee2e2;
          color: #991b1b;
        }
      `}} />

      {/* Invoice Container */}
      <div className="print-area">
        {/* Header: Agency & Invoice # */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111', margin: 0 }}>
              {settings?.companyName ?? 'Tvita Digital Agency'}
            </h1>
            <div style={{ fontSize: '12px', color: '#444', marginTop: '6px', lineHeight: 1.5 }}>
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
            <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.05em', color: '#666' }}>
              TAX INVOICE
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111', marginTop: 2 }}>
              {invoice.invoiceNo}
            </div>
            <span className={`badge badge--${invoice.status.toLowerCase()}`} style={{ marginTop: '8px' }}>
              {invoice.status}
            </span>
          </div>
        </div>

        <div className="divider" />

        {/* Bill To & Dates */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Billed To
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111', marginTop: '4px' }}>
              {invoice.client.name}
            </div>
            {invoice.client.contactPerson && (
              <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>
                Attn: {invoice.client.contactPerson}
              </div>
            )}
            {invoice.client.address && (
              <div style={{ fontSize: '12px', color: '#444', marginTop: 4, lineHeight: 1.4 }}>
                {invoice.client.address}
              </div>
            )}
            {invoice.client.gstin && (
              <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#111', marginTop: 4 }}>
                GSTIN: <strong>{invoice.client.gstin}</strong>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'right' }}>
            <div style={{ fontSize: '12px' }}>
              <span style={{ color: '#666' }}>Issue Date: </span>
              <span style={{ fontWeight: '500', color: '#111' }}>
                {formatDate(invoice.issuedDate)}
              </span>
            </div>
            <div style={{ fontSize: '12px' }}>
              <span style={{ color: '#666' }}>Payment Due: </span>
              <span style={{ fontWeight: '500', color: '#111' }}>
                {formatDate(invoice.dueDate)}
              </span>
            </div>
            {invoice.paidDate && (
              <div style={{ fontSize: '12px' }}>
                <span style={{ color: '#666' }}>Paid On: </span>
                <span style={{ fontWeight: '500', color: '#065f46' }}>
                  {formatDate(invoice.paidDate)}
                </span>
              </div>
            )}
            {invoice.project && (
              <div style={{ fontSize: '12px' }}>
                <span style={{ color: '#666' }}>Project: </span>
                <span style={{ color: '#111' }}>
                  {invoice.project.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table className="table mb-6">
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
                <td style={{ color: '#555' }}>{idx + 1}</td>
                <td style={{ fontWeight: '500', color: '#111' }}>
                  {item.description}
                </td>
                <td style={{ textAlign: 'center', color: '#555' }}>{item.qty}</td>
                <td style={{ textAlign: 'right', color: '#555' }}>
                  {formatCurrency(item.rate)}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#111' }}>
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals & Tax Calculation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div style={{ maxWidth: '360px' }}>
            {settings?.bankAccount && (
              <div style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '6px', fontSize: '11px', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 'bold', color: '#111', marginBottom: 4 }}>
                  Bank Transfer Details (NEFT / RTGS / IMPS)
                </div>
                <div>Bank Name: {settings.bankName}</div>
                <div>Account No: <strong style={{ fontFamily: 'monospace' }}>{settings.bankAccount}</strong></div>
                <div>IFSC Code: <strong style={{ fontFamily: 'monospace' }}>{settings.bankIfsc}</strong></div>
                {settings.bankBranch && <div>Branch: {settings.bankBranch}</div>}
              </div>
            )}
          </div>

          <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="flex justify-between" style={{ fontSize: '13px', color: '#444' }}>
              <span>Subtotal:</span>
              <span>{formatCurrency(Number(invoice.subtotal))}</span>
            </div>

            {Number(invoice.taxAmount) > 0 && (
              <>
                <div className="flex justify-between" style={{ fontSize: '12px', color: '#444' }}>
                  <span>CGST ({(Number(invoice.taxRate) / 2)}%):</span>
                  <span>{formatCurrency(Number(invoice.taxAmount) / 2)}</span>
                </div>
                <div className="flex justify-between" style={{ fontSize: '12px', color: '#444' }}>
                  <span>SGST ({(Number(invoice.taxRate) / 2)}%):</span>
                  <span>{formatCurrency(Number(invoice.taxAmount) / 2)}</span>
                </div>
              </>
            )}

            <div className="divider" style={{ margin: '8px 0' }} />

            <div className="flex justify-between" style={{ fontSize: '15px', fontWeight: 'bold', color: '#000' }}>
              <span>Total Amount:</span>
              <span>{formatCurrency(Number(invoice.amount))}</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        {settings?.invoiceFooter && (
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#666', paddingTop: '16px', borderTop: '1px solid #ccc' }}>
            {settings.invoiceFooter}
          </div>
        )}
      </div>
    </div>
  )
}
