import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Mail, FolderKanban } from 'lucide-react'
import ChangePasswordForm from '@/components/profile/ChangePasswordForm'

export const metadata = {
  title: 'My Profile — Tvita Client Portal',
  description: 'Manage account profile and organization contact info.',
}

export default async function ClientProfilePage() {
  const user = await getServerUser()
  if (!user) redirect('/login')

  const client = await prisma.client.findFirst({
    where: {
      OR: [
        { profileId: user.id },
        { email: user.email },
      ],
    },
    include: {
      projects: {
        select: { id: true, name: true, status: true, progress: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Account Profile</h1>
          <p className="page-header__subtitle">
            User credentials and organization contact information.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Profile + Security (2 cols) */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div className="card">
            <div className="flex items-center gap-4 mb-6">
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'var(--accent-gradient)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'var(--font-bold)',
                  flexShrink: 0,
                }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                  {user.name}
                </h2>
                <div className="flex items-center gap-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                  <Mail size={13} />
                  <span>{user.email}</span>
                  <span className="badge badge--active">Client</span>
                </div>
              </div>
            </div>

            {client && (
              <div style={{ paddingTop: 'var(--space-5)', borderTop: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
                  Organization Details
                </h3>
                <div className="grid grid-cols-2 gap-4" style={{ fontSize: 'var(--text-sm)' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Company</span>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)', marginTop: 2 }}>{client.name}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Contact Person</span>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)', marginTop: 2 }}>{client.contactPerson ?? '—'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>GSTIN</span>
                    <div style={{ color: 'var(--text-primary)', fontFamily: 'monospace', marginTop: 2 }}>{client.gstin ?? '—'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>PAN</span>
                    <div style={{ color: 'var(--text-primary)', fontFamily: 'monospace', marginTop: 2 }}>{client.pan ?? '—'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
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
                {client.projects.map((proj) => (
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
        </div>
      </div>
    </div>
  )
}
