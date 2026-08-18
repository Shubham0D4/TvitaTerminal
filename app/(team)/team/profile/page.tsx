import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Mail, FolderKanban } from 'lucide-react'
import ChangePasswordForm from '@/components/profile/ChangePasswordForm'

export const metadata = {
  title: 'My Profile — Tvita Team',
  description: 'Manage account credentials and member profile.',
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

export default async function TeamProfilePage() {
  const user = await getServerUser()
  if (!user) redirect('/login')

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    include: {
      projectMembers: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              status: true,
              progress: true,
              client: { select: { name: true } },
            },
          },
        },
        orderBy: { project: { createdAt: 'desc' } },
      },
    },
  })

  const roleStyles: Record<string, { bg: string; color: string }> = {
    TEAM_LEAD: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' },
    MEMBER: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">My Profile</h1>
          <p className="page-header__subtitle">
            Account credentials, contact info, and project assignments.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Profile Info + Security */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Profile Card */}
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
                  <span className="badge badge--active">
                    {user.role === 'ADMIN' ? 'Administrator' : 'Member'}
                  </span>
                </div>
              </div>
            </div>

            {profile && (
              <div style={{ paddingTop: 'var(--space-5)', borderTop: '1px solid var(--border-subtle)' }}>
                <div className="grid grid-cols-2 gap-4" style={{ fontSize: 'var(--text-sm)' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Phone Number</span>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)', marginTop: 2 }}>
                      {profile.phone ?? '—'}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Account Status</span>
                    <div style={{ marginTop: 2 }}>
                      <span className={`badge badge--${profile.isActive ? 'active' : 'inactive'}`}>
                        {profile.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Projects</span>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)', marginTop: 2 }}>
                      {profile.projectMembers.length}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Note</span>
                    <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 2 }}>
                      Sub-roles are assigned per project.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Security Card */}
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
                My Projects ({profile?.projectMembers.length ?? 0})
              </h3>
            </div>

            {!profile || profile.projectMembers.length === 0 ? (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                You haven&apos;t been assigned to any projects yet. Admins and leads assign you when a project kicks off.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {profile.projectMembers.map((pm) => {
                  const rs = roleStyles[pm.role] ?? roleStyles.MEMBER
                  return (
                    <Link
                      key={pm.id}
                      href={`/team/projects/${pm.project.id}`}
                      style={{ display: 'block', padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textDecoration: 'none', transition: 'border-color var(--transition-fast)' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pm.project.name}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                            {pm.project.client.name}
                          </div>
                        </div>
                        <span className="badge" style={{ background: rs.bg, color: rs.color, fontSize: 9, flexShrink: 0 }}>
                          {pm.role.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2" style={{ marginTop: 'var(--space-2)' }}>
                        <div className="progress-bar-container" style={{ flex: 1 }}>
                          <div className="progress-bar-fill" style={{ width: `${pm.project.progress}%` }} />
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{pm.project.progress}%</span>
                        <span className={`badge badge--${pm.project.status.toLowerCase().replace(/_/g, '-')}`} style={{ fontSize: 9 }}>
                          {pm.project.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
