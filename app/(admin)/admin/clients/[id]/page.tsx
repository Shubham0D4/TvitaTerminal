import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Building2, Mail, Phone, MapPin, FileText, FolderKanban,
  CreditCard, Plus, Layers, Globe, Edit, Users, User, ShieldCheck,
  Star, AlertTriangle, Clock, CheckCircle2, ExternalLink,
} from 'lucide-react'
import { getCountryDisplay, getFlagEmoji } from '@/shared/utilities/countries'
import ClientContactsSection from './ClientContactsSection'
import AdminSubTeamsSection from './AdminSubTeamsSection'
import ClientDangerZone from './ClientDangerZone'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const c = await prisma.client.findUnique({ where: { id }, select: { name: true } })
  return {
    title: `${c?.name ?? 'Client'} — Tvita Admin`,
    description: 'Client profile, projects, contacts, invoices, and documents.',
  }
}

function formatCurrency(amount: number | string, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(Number(amount))
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-4" style={{ padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flexShrink: 0, minWidth: 140 }}>{label}</span>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontFamily: mono ? 'monospace' : undefined, textAlign: 'right' }}>
        {value}
      </span>
    </div>
  )
}

const priorityColors: Record<string, string> = {
  LOW: '#64748b', MEDIUM: '#f59e0b', HIGH: '#ef4444', VIP: '#8b5cf6',
}
const riskColors: Record<string, string> = {
  LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#ef4444',
}

type PageProps = { params: Promise<{ id: string }> }

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params

  const [client, adminProfiles] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { tasks: true } } },
        },
        subscriptions: { orderBy: { createdAt: 'desc' }, include: { plan: true } },
        invoices: { orderBy: { createdAt: 'desc' } },
        contacts: { orderBy: { createdAt: 'asc' } },
        subTeams: { orderBy: { createdAt: 'desc' } },
        accountManager: { select: { name: true } },
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
      },
    }),
    prisma.profile.findMany({
      where: { isActive: true, role: { in: ['ADMIN', 'TEAM_MEMBER'] } },
      select: { id: true, name: true },
    }),
  ])

  if (!client) notFound()

  const activeSub = client.subscriptions.find((s: any) => s.status === 'ACTIVE')
  const totalBilled = client.invoices.reduce((acc: number, inv: any) => acc + Number(inv.amount), 0)
  const pendingAmount = client.invoices
    .filter((i: any) => i.status === 'PENDING' || i.status === 'OVERDUE')
    .reduce((acc: number, inv: any) => acc + Number(inv.amount), 0)

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/admin/clients" className="btn btn--ghost btn--icon">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                <User size={24} />
              </span>
              <h1 className="page-header__title">{client.name}</h1>
              <span className={`badge badge--${client.status.toLowerCase()}`}>{client.status}</span>
              {client.clientPriority === 'VIP' && (
                <span className="badge" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>⭐ VIP</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 4, flexWrap: 'wrap' }}>
              {client.legalName && client.legalName !== client.name && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{client.legalName}</span>
              )}
              {client.country && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {getCountryDisplay(client.country)}
                </span>
              )}
              {client.industry && (
                <span className="badge" style={{ background: 'var(--bg-overlay)', color: 'var(--text-muted)', fontSize: 10 }}>
                  {client.industry}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="page-header__actions">
          <Link href={`/admin/clients/${id}/edit`} className="btn btn--secondary">
            <Edit size={14} /> Edit Client
          </Link>
          <Link href={`/admin/billing/new?clientId=${id}`} className="btn btn--primary">
            <Plus size={14} /> New Invoice
          </Link>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Invoiced', value: formatCurrency(totalBilled, client.currency), icon: <CreditCard size={18} /> },
          { label: 'Outstanding', value: formatCurrency(pendingAmount, client.currency), icon: <Clock size={18} />, warn: pendingAmount > 0 },
          { label: 'Active Projects', value: String(client.projects.filter((p: any) => p.status === 'IN_PROGRESS').length), icon: <FolderKanban size={18} /> },
          { label: 'Total Projects', value: String(client.projects.length), icon: <Layers size={18} /> },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
            <div style={{ color: stat.warn ? 'var(--color-warning)' : 'var(--accent-primary)', marginBottom: 'var(--space-2)', display: 'flex', justifyContent: 'center' }}>
              {stat.icon}
            </div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: stat.warn ? 'var(--color-warning)' : 'var(--text-primary)' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Main 3-col layout ── */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left sidebar: Profile info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* Quick Profile Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                Quick Profile
              </h2>
              <Link href={`/admin/clients/${id}/edit`} className="btn btn--ghost btn--xs">
                <Edit size={12} /> Edit
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <InfoRow label="Client Type" value={client.clientType} />
              <InfoRow label="Legal Name" value={client.legalName} />
              <InfoRow label="Display Name" value={client.displayName} />
              <InfoRow label="Country" value={client.country ? getCountryDisplay(client.country) : null} />
              <InfoRow label="City / State" value={[client.city, client.stateProvince].filter(Boolean).join(', ') || null} />
              <InfoRow label="Timezone" value={client.timezone} />
              <InfoRow label="Industry" value={client.industry} />
              {client.website && (
                <div className="flex items-center justify-between" style={{ padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Website</span>
                  <a href={client.website} target="_blank" rel="noreferrer"
                    style={{ fontSize: 'var(--text-sm)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Globe size={12} /> Visit
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="card">
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              Contact
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {client.contactPerson && (
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Primary Contact</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                    {client.contactPerson}
                    {client.designation && <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}> · {client.designation}</span>}
                  </div>
                </div>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`} className="flex items-center gap-2" style={{ fontSize: 'var(--text-sm)', color: 'var(--accent-primary)', textDecoration: 'none' }}>
                  <Mail size={13} /> {client.email}
                </a>
              )}
              {client.phone && (
                <div className="flex items-center gap-2" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  <Phone size={13} /> {client.phone}
                </div>
              )}
              {client.whatsapp && (
                <div className="flex items-center gap-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>📱</span> WA: {client.whatsapp}
                </div>
              )}
              {client.address && (
                <div className="flex items-start gap-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  <MapPin size={13} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ lineHeight: 1.5 }}>{client.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Legal & Tax */}
          <div className="card">
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              Legal &amp; Tax
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <InfoRow label="Entity Type" value={client.entityType} />
              <InfoRow label="Reg. Number" value={client.registrationNo} mono />
              <InfoRow label="Reg. Country" value={client.countryOfRegistration ? getCountryDisplay(client.countryOfRegistration) : null} />
              <InfoRow label="Tax ID" value={client.taxId} mono />
              <InfoRow label="PAN" value={client.pan} mono />
              <InfoRow label="GSTIN" value={client.gstin} mono />
              <InfoRow label="VAT No." value={client.vatNumber} mono />
              <InfoRow label="Auth. Rep." value={client.authorizedRep} />
              <InfoRow label="Member Since" value={formatDate(client.createdAt)} />
            </div>
          </div>

          {/* Internal */}
          <div className="card">
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              Internal
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Priority</span>
                <span className="badge" style={{ background: `${priorityColors[client.clientPriority] ?? '#64748b'}20`, color: priorityColors[client.clientPriority] ?? '#64748b' }}>
                  {client.clientPriority}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Risk Level</span>
                <span className="badge" style={{ background: `${riskColors[client.riskLevel] ?? '#64748b'}20`, color: riskColors[client.riskLevel] ?? '#64748b' }}>
                  {client.riskLevel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Onboarding</span>
                <span className="badge" style={{ background: client.onboardingStatus === 'COMPLETED' ? 'rgba(16,185,129,0.12)' : 'var(--bg-overlay)', color: client.onboardingStatus === 'COMPLETED' ? '#10b981' : 'var(--text-muted)' }}>
                  {client.onboardingStatus.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Verification</span>
                <span className="badge" style={{ background: client.verificationStatus === 'VERIFIED' ? 'rgba(16,185,129,0.12)' : 'var(--bg-overlay)', color: client.verificationStatus === 'VERIFIED' ? '#10b981' : 'var(--text-muted)' }}>
                  {client.verificationStatus}
                </span>
              </div>
              {client.accountManager && (
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Account Mgr</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>{client.accountManager.name}</span>
                </div>
              )}
              {client.clientSource && (
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Source</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{client.clientSource}</span>
                </div>
              )}
              {client.internalTags.length > 0 && (
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 6 }}>Tags</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {client.internalTags.map((tag: string) => (
                      <span key={tag} className="badge" style={{ background: 'var(--bg-overlay)', color: 'var(--text-muted)', fontSize: 10 }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {client.internalNotes && (
                <div style={{ paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>Internal Notes</div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {client.internalNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
          <ClientDangerZone clientId={id} clientName={client.name} />
        </div>

        {/* Right 2-col area: Projects, Contacts, Invoices, Billing Info */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* Additional Contacts */}
          <ClientContactsSection clientId={id} contacts={client.contacts} />

          {/* Client Internal Sub-Teams */}
          <AdminSubTeamsSection clientId={id} subTeams={client.subTeams} />

          {/* Billing Profile */}
          <div className="card">
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              Billing Configuration
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Billing Name</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{client.billingName || client.name}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Billing Email</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{client.billingEmail || client.email || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Currency</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)' }}>{client.currency}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Payment Terms</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{client.paymentTerms || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Tax Applicable</div>
                <span className={`badge badge--${client.taxApplicable ? 'active' : 'inactive'}`}>
                  {client.taxApplicable ? `Yes (${client.taxRate ?? '—'}%)` : 'No'}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>PO Required</div>
                <span className={`badge badge--${client.poRequired ? 'active' : 'inactive'}`}>
                  {client.poRequired ? `Yes${client.poNumber ? ` — ${client.poNumber}` : ''}` : 'No'}
                </span>
              </div>
              {client.paymentMethod && (
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Payment Method</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{client.paymentMethod.replace('_', ' ')}</div>
                </div>
              )}
              {client.paymentProvider && (
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Payment Provider</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{client.paymentProvider}</div>
                </div>
              )}
            </div>
            {client.paymentInstructions && (
              <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>Payment Instructions</div>
                <pre style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {client.paymentInstructions}
                </pre>
              </div>
            )}
          </div>

          {/* Active Subscription */}
          {activeSub && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>Active Plan</h2>
                <Layers size={16} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                {activeSub.plan.name}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--accent-primary)', marginTop: 2 }}>
                {formatCurrency(Number(activeSub.plan.price), client.currency)} / {activeSub.plan.billingCycle.toLowerCase()}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
                Renewal: {formatDate(activeSub.renewalDate)}
              </div>
            </div>
          )}

          {/* Projects */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                Projects ({client.projects.length})
              </h2>
              <Link href={`/admin/projects/new?clientId=${id}`} className="btn btn--ghost btn--sm">
                <Plus size={14} /> New Project
              </Link>
            </div>
            {client.projects.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                <FolderKanban size={24} />
                <p className="empty-state__desc">No projects for this client yet.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Project</th><th>Status</th><th>Progress</th><th>Tasks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.projects.map((project: any) => (
                      <tr key={project.id}>
                        <td>
                          <Link href={`/admin/projects/${project.id}`}
                            style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>
                            {project.name}
                          </Link>
                        </td>
                        <td>
                          <span className={`badge badge--${project.status.toLowerCase().replace('_', '-')}`}>
                            {project.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="progress-bar-container" style={{ width: 80 }}>
                              <div className="progress-bar-fill" style={{ width: `${project.progress}%` }} />
                            </div>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{project.progress}%</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{project._count.tasks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Invoices */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                Invoices ({client.invoices.length})
              </h2>
              <Link href={`/admin/billing/new?clientId=${id}`} className="btn btn--ghost btn--sm">
                <Plus size={14} /> Create Invoice
              </Link>
            </div>
            {client.invoices.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                <CreditCard size={24} />
                <p className="empty-state__desc">No invoices issued.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr><th>Invoice #</th><th>Amount</th><th>Status</th><th>Due Date</th></tr>
                  </thead>
                  <tbody>
                    {client.invoices.map((invoice: any) => (
                      <tr key={invoice.id}>
                        <td>
                          <Link href={`/admin/billing/${invoice.id}`}
                            style={{ color: 'var(--accent-primary)', fontWeight: 'var(--font-medium)' }}>
                            {invoice.invoiceNo}
                          </Link>
                        </td>
                        <td style={{ fontWeight: 'var(--font-medium)' }}>
                          {formatCurrency(Number(invoice.amount), client.currency)}
                        </td>
                        <td>
                          <span className={`badge badge--${invoice.status.toLowerCase()}`}>{invoice.status}</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{formatDate(invoice.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
