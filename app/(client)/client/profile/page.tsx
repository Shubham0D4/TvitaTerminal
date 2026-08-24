import { prisma } from '@/lib/prisma'
import { getServerUser, getClientSubTeamContext } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Mail, FolderKanban, Phone, MapPin, Globe, Building2,
  CreditCard, FileText, Hash, Calendar, User, Shield,
} from 'lucide-react'
import ChangePasswordForm from '@/app/components/profile/ChangePasswordForm'
import ProfileAvatarUpload from '@/app/components/profile/ProfileAvatarUpload'
import SignOutButton from '@/app/components/client/SignOutButton'

export const metadata = {
  title: 'My Profile — Tvita Client Portal',
  description: 'Manage account profile and organization contact info.',
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flexShrink: 0, minWidth: 140 }}>{label}</span>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontFamily: mono ? 'monospace' : undefined, textAlign: 'right', wordBreak: 'break-word' }}>
        {value}
      </span>
    </div>
  )
}

export default async function ClientProfilePage() {
  const user = await getServerUser()
  if (!user) redirect('/login')

  const isSubTeamMember = !!(await getClientSubTeamContext(user.id))

  const client = await prisma.client.findFirst({
    where: {
      OR: [
        { profileId: user.id },
        { email: user.email },
        // Also find client for sub-team members
        ...(isSubTeamMember ? [{
          subTeams: {
            some: {
              members: { some: { profileId: user.id } },
            },
          },
        }] : []),
      ],
    },
    include: {
      projects: {
        select: { id: true, name: true, status: true, progress: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const userProfile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true },
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Account Profile</h1>
          <p className="page-header__subtitle">
            {isSubTeamMember ? 'Your user account information.' : 'User credentials and organization contact information.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Profile + Security (2 cols) */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* Personal Info Card */}
          <div className="card">
            <div className="flex items-center gap-4 mb-6">
              <ProfileAvatarUpload currentAvatarUrl={userProfile?.avatarUrl} userName={user.name} />
              <div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                  {user.name}
                </h2>
                <div className="flex items-center gap-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                  <Mail size={13} />
                  <span>{user.email}</span>
                  <span className="badge badge--active">{isSubTeamMember ? 'Team Member' : 'Client'}</span>
                </div>
              </div>
            </div>

            {/* Company info — always show name/contact, full details only for primary client */}
            {client && (
              <div style={{ paddingTop: 'var(--space-5)', borderTop: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={15} style={{ color: 'var(--accent-primary)' }} />
                  Organization Details
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <InfoRow label="Company" value={client.name} />
                  <InfoRow label="Contact Person" value={client.contactPerson} />

                  {/* Sub-team members only see company name + contact */}
                  {!isSubTeamMember && (
                    <>
                      {/* Contact */}
                      {client.email && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flexShrink: 0, minWidth: 140 }}>Business Email</span>
                          <a href={`mailto:${client.email}`} style={{ fontSize: 'var(--text-sm)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Mail size={12} />{client.email}
                          </a>
                        </div>
                      )}
                      {client.phone && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flexShrink: 0, minWidth: 140 }}>Phone</span>
                          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={12} />{client.phone}
                          </span>
                        </div>
                      )}
                      <InfoRow label="WhatsApp" value={client.whatsapp} />
                      <InfoRow label="Designation" value={client.designation} />
                      <InfoRow label="Industry" value={client.industry} />
                      <InfoRow label="Country" value={client.country} />
                      <InfoRow label="City / State" value={[client.city, client.stateProvince].filter(Boolean).join(', ') || null} />
                      <InfoRow label="Timezone" value={client.timezone} />
                      {client.website && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flexShrink: 0, minWidth: 140 }}>Website</span>
                          <a href={client.website} target="_blank" rel="noreferrer" style={{ fontSize: 'var(--text-sm)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Globe size={12} /> Visit
                          </a>
                        </div>
                      )}
                      {client.address && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flexShrink: 0, minWidth: 140 }}>Address</span>
                          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', textAlign: 'right', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                            <MapPin size={12} style={{ flexShrink: 0, marginTop: 2 }} />{client.address}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Legal & Tax — primary client only */}
            {!isSubTeamMember && client && (client.gstin || client.pan || client.taxId || client.registrationNo || client.entityType) && (
              <div style={{ paddingTop: 'var(--space-5)', marginTop: 'var(--space-5)', borderTop: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={15} style={{ color: 'var(--accent-primary)' }} />
                  Legal & Tax Information
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <InfoRow label="Legal Name" value={client.legalName} />
                  <InfoRow label="Entity Type" value={client.entityType} />
                  <InfoRow label="Registration No." value={client.registrationNo} mono />
                  <InfoRow label="GSTIN" value={client.gstin} mono />
                  <InfoRow label="PAN" value={client.pan} mono />
                  <InfoRow label="Tax ID" value={client.taxId} mono />
                  <InfoRow label="VAT Number" value={client.vatNumber} mono />
                  <InfoRow label="Authorized Rep." value={client.authorizedRep} />
                </div>
              </div>
            )}

            {/* Billing — primary client only */}
            {!isSubTeamMember && client && (
              <div style={{ paddingTop: 'var(--space-5)', marginTop: 'var(--space-5)', borderTop: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CreditCard size={15} style={{ color: 'var(--accent-primary)' }} />
                  Billing Details
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <InfoRow label="Billing Name" value={client.billingName || client.name} />
                  <InfoRow label="Billing Email" value={client.billingEmail || client.email} />
                  <InfoRow label="Currency" value={client.currency} />
                  <InfoRow label="Payment Terms" value={client.paymentTerms} />
                </div>
              </div>
            )}
          </div>

          {/* Security */}
          <div className="card">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={16} style={{ color: 'var(--accent-primary)' }} />
              Security &amp; Password
            </h3>
            <ChangePasswordForm />
          </div>
        </div>

        {/* Right: My Projects */}
        <div>
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <FolderKanban size={18} style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                My Projects ({client?.projects.length ?? 0})
              </h3>
            </div>

            {!client || client.projects.length === 0 ? (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                No projects found. Projects assigned to your account will appear here.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {client.projects.map(proj => (
                  <Link
                    key={proj.id}
                    href={`/client/projects/${proj.id}`}
                    style={{ display: 'block', padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textDecoration: 'none' }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {proj.name}
                      </span>
                      <span className={`badge badge--${proj.status.toLowerCase().replace(/_/g, '-')}`} style={{ fontSize: 9, flexShrink: 0 }}>
                        {proj.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="progress-bar-container" style={{ flex: 1 }}>
                        <div className="progress-bar-fill" style={{ width: `${proj.progress}%` }} />
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{proj.progress}%</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Account metadata — primary client only */}
          {!isSubTeamMember && client && (
            <div className="card" style={{ marginTop: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={14} style={{ color: 'var(--accent-primary)' }} />
                Account Info
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 'var(--text-xs)' }}>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Client Type</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>{client.clientType || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Status</span>
                  <span className={`badge badge--${client.status.toLowerCase()}`} style={{ fontSize: 10 }}>{client.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} /> Member Since</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(client.createdAt))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Currency</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)' }}>{client.currency}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <SignOutButton />
    </div>
  )
}
