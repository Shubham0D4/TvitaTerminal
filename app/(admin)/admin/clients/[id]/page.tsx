import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Building2, Mail, Phone, MapPin, FileText, FolderKanban,
  CreditCard, Plus, Layers, Globe, Edit, Users, User, ShieldCheck,
  Star, AlertTriangle, Clock, CheckCircle2, ExternalLink,
} from 'lucide-react'
import { getCountryDisplay, getFlagEmoji } from '@/lib/utils/countries'
import ClientContactsSection from './ClientContactsSection'
import AdminSubTeamsSection from './AdminSubTeamsSection'
import ClientDangerZone from './ClientDangerZone'
import AdminNotesSection from './AdminNotesSection'
import AdminTicketsSection from './AdminTicketsSection'

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

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function ClientDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { tab } = await searchParams
  const currentTab = tab ?? 'overview'

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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <User size={14} /> },
    { id: 'projects', label: 'Projects', icon: <FolderKanban size={14} /> },
    { id: 'billing', label: 'Invoices & Billing', icon: <CreditCard size={14} /> },
    { id: 'team', label: 'Contacts & Teams', icon: <Users size={14} /> },
    { id: 'notes', label: 'Notes & Updates', icon: <FileText size={14} /> },
    { id: 'tickets', label: 'Tickets & Issues', icon: <AlertTriangle size={14} /> },
  ]

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          {/* Back button is handled by AdminNavbar Focus Mode, but keeping a text label header */}
          <div>
            <div className="flex items-center gap-3">
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
          <Link href={`/admin/clients/${id}/edit`} className="btn btn--secondary btn--sm">
            <Edit size={14} /> Edit Client
          </Link>
          <Link href={`/admin/billing/new?clientId=${id}`} className="btn btn--primary btn--sm">
            <Plus size={14} /> New Invoice
          </Link>
        </div>
      </div>

      {/* ── Tabs Bar ── */}
      <div className="filter-bar mb-6" style={{ background: 'var(--bg-surface)', padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex gap-2">
          {tabs.map((t) => {
            const isActive = currentTab === t.id
            return (
              <Link
                key={t.id}
                href={`/admin/clients/${id}?tab=${t.id}`}
                className={`filter-chip${isActive ? ' filter-chip--active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {t.icon}
                <span>{t.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Tab Contents ── */}
      {currentTab === 'overview' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Quick Profile */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                  Quick Profile
                </h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <InfoRow label="Client Type" value={client.clientType} />
                <InfoRow label="Display Name" value={client.displayName} />
                <InfoRow label="Timezone" value={client.timezone} />
                {client.website && (
                  <div className="flex items-center justify-between" style={{ padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Website</span>
                    <a href={client.website} target="_blank" rel="noreferrer"
                      style={{ fontSize: 'var(--text-sm)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Globe size={12} /> Visit website
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Details */}
            <div className="card">
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
                Primary Contact
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {client.contactPerson && (
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Contact Person</div>
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
                {client.address && (
                  <div className="flex items-start gap-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    <MapPin size={13} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ lineHeight: 1.5 }}>{client.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Internal Settings */}
            <div className="card">
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
                Internal Settings
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
                {client.accountManager && (
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Account Manager</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)' }}>{client.accountManager.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Area (2 columns span) */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Legal & Tax configuration */}
            <div className="card">
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
                Legal &amp; Tax Identifiers
              </h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <InfoRow label="Entity Type" value={client.entityType} />
                <InfoRow label="Reg. Number" value={client.registrationNo} mono />
                <InfoRow label="PAN" value={client.pan} mono />
                <InfoRow label="GSTIN" value={client.gstin} mono />
                <InfoRow label="Tax ID / VAT No." value={client.taxId || client.vatNumber} mono />
                <InfoRow label="Authorized Rep." value={client.authorizedRep} />
              </div>
            </div>

            {/* Billing configuration */}
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
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Default Currency</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)' }}>{client.currency}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Payment Terms</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{client.paymentTerms || 'Due on Receipt'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Tax Status</div>
                  <span className={`badge badge--${client.taxApplicable ? 'active' : 'inactive'}`}>
                    {client.taxApplicable ? `Tax Applicable (${client.taxRate ?? '0'}%)` : 'Tax Exempt'}
                  </span>
                </div>
                {client.paymentMethod && (
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Preferred Method</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{client.paymentMethod.replace('_', ' ')}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Danger Zone */}
            <ClientDangerZone clientId={id} clientName={client.name} />
          </div>
        </div>
      )}

      {currentTab === 'projects' && (
        <div className="flex flex-col gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                Projects ({client.projects.length})
              </h2>
              <Link href={`/admin/projects/new?clientId=${id}`} className="btn btn--primary btn--sm flex items-center gap-1">
                <Plus size={14} /> New Project
              </Link>
            </div>

            {client.projects.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                <FolderKanban size={24} className="text-muted" />
                <p className="empty-state__desc" style={{ marginTop: 8 }}>No projects for this client yet.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Project Name</th>
                      <th>Status</th>
                      <th>Progress</th>
                      <th>Tasks</th>
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
                            <div className="progress-bar-container" style={{ width: 120, height: 6 }}>
                              <div className="progress-bar-fill" style={{ width: `${project.progress}%` }} />
                            </div>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>{project.progress}%</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{project._count.tasks} active tasks</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {currentTab === 'billing' && (
        <div className="flex flex-col gap-6">
          {/* Billing Overview Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card flex flex-col justify-between" style={{ padding: 'var(--space-4)' }}>
              <span className="text-xs font-semibold text-muted">TOTAL BILLED</span>
              <div className="mt-2">
                <span className="text-xl font-bold">{formatCurrency(totalBilled, client.currency)}</span>
              </div>
            </div>
            <div className="card flex flex-col justify-between" style={{ padding: 'var(--space-4)', borderColor: pendingAmount > 0 ? 'var(--color-warning)' : undefined }}>
              <span className="text-xs font-semibold text-muted">OUTSTANDING BALANCE</span>
              <div className="mt-2">
                <span className="text-xl font-bold" style={{ color: pendingAmount > 0 ? 'var(--color-warning)' : undefined }}>{formatCurrency(pendingAmount, client.currency)}</span>
              </div>
            </div>
            <div className="card flex flex-col justify-between" style={{ padding: 'var(--space-4)' }}>
              <span className="text-xs font-semibold text-muted">INVOICES RAISED</span>
              <div className="mt-2">
                <span className="text-xl font-bold">{client.invoices.length} invoices</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                Invoices History
              </h2>
              <Link href={`/admin/billing/new?clientId=${id}`} className="btn btn--primary btn--sm flex items-center gap-1">
                <Plus size={14} /> Create Invoice
              </Link>
            </div>

            {client.invoices.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                <CreditCard size={24} className="text-muted" />
                <p className="empty-state__desc" style={{ marginTop: 8 }}>No invoices issued.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.invoices.map((invoice: any) => (
                      <tr key={invoice.id}>
                        <td>
                          <Link href={`/admin/billing/${invoice.id}`}
                            style={{ color: 'var(--accent-primary)', fontWeight: 'var(--font-medium)' }}>
                            #{invoice.invoiceNo}
                          </Link>
                        </td>
                        <td style={{ fontWeight: 'var(--font-semibold)' }}>
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
      )}

      {currentTab === 'team' && (
        <div className="flex flex-col gap-6">
          {/* Additional Contacts */}
          <ClientContactsSection clientId={id} contacts={client.contacts} />

          {/* Client Internal Sub-Teams */}
          <AdminSubTeamsSection clientId={id} subTeams={client.subTeams} />
        </div>
      )}

      {currentTab === 'notes' && (
        <AdminNotesSection clientId={id} projects={client.projects} />
      )}

      {currentTab === 'tickets' && (
        <AdminTicketsSection clientId={id} projects={client.projects} />
      )}
    </div>
  )
}
