import { prisma } from '@/lib/prisma'
import { getServerUser, getClientSubTeamContext } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, FileText, CheckCircle2, Clock, ExternalLink } from 'lucide-react'
import PaymentRedirect from '@/app/components/billing/PaymentRedirect'

export const metadata = {
  title: 'Invoices — Tvita Client Portal',
  description: 'View and pay agency invoices and download PDF receipts.',
}

function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount))
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

export default async function ClientInvoicesPage() {
  const user = await getServerUser()
  if (!user) redirect('/login')

  // Sub-teams do not have access to financial data
  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx && !subTeamCtx.policy.invoices) redirect('/client/home')

  const client = await prisma.client.findFirst({
    where: subTeamCtx
      ? { id: subTeamCtx.clientId }
      : { OR: [{ profileId: user.id }, { email: user.email }] },
  })

  if (!client) {
    return (
      <div className="card">
        <div className="empty-state">
          <CreditCard size={28} />
          <div className="empty-state__title">No Client Account Linked</div>
        </div>
      </div>
    )
  }

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

  const invoices = await prisma.invoice.findMany({
    where: { clientId: client.id },
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const totalOutstanding = invoices.filter((i) => i.status === 'PENDING').reduce((acc, i) => acc + Number(i.amount), 0)

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Invoices & Statements</h1>
          <p className="page-header__subtitle">
            Billing history and tax invoices for {client.name}.
          </p>
        </div>
      </div>

      {totalOutstanding > 0 && (
        <div
          className="card mb-6"
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-warning" />
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                Outstanding Amount: {formatCurrency(totalOutstanding)}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Please clear pending invoices by their due dates. Bank transfer details are available inside each invoice.
              </div>
            </div>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <CreditCard size={28} />
            <div className="empty-state__title">No Invoices Issued</div>
            <div className="empty-state__desc">You have no invoices issued to date.</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Project</th>
                  <th>Issued Date</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 'var(--font-medium)', color: 'var(--accent-primary)' }}>
                      {inv.invoiceNo}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {inv.project?.name ?? 'General'}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {formatDate(inv.issuedDate)}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {formatDate(inv.dueDate)}
                    </td>
                    <td style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                      {formatCurrency(Number(inv.amount))}
                    </td>
                    <td>
                      <span className={`badge badge--${inv.status.toLowerCase()}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link href={`/client/invoices/${inv.id}`} className="btn btn--ghost btn--xs">
                          View
                        </Link>
                        <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer" className="btn btn--secondary btn--xs">
                          Download PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
