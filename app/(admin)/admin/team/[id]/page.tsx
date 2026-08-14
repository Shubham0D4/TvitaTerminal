import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, Shield, FolderKanban, CheckCircle2 } from 'lucide-react'
import AdminMemberEditForm from './AdminMemberEditForm'
import MemberDangerZone from './MemberDangerZone'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const member = await prisma.profile.findUnique({ where: { id }, select: { name: true } })
  return {
    title: member ? `${member.name} — Tvita Admin` : 'Edit Member — Tvita Admin',
    description: 'Edit member profile, role, and status.',
  }
}

type PageProps = { params: Promise<{ id: string }> }

export default async function AdminMemberDetailPage({ params }: PageProps) {
  const { id } = await params

  const member = await prisma.profile.findUnique({
    where: { id },
    include: {
      projectMembers: {
        include: {
          project: {
            select: { id: true, name: true, status: true, client: { select: { name: true } } },
          },
        },
        orderBy: { project: { createdAt: 'desc' } },
      },
      tasksAssigned: {
        select: { id: true, title: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  })

  if (!member || member.role === 'CLIENT') {
    notFound()
  }

  const projectRoleColor = (role: string) => {
    switch (role) {
      case 'TEAM_LEAD': return { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }
      case 'DEVELOPER': return { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' }
      case 'TESTER': return { bg: 'rgba(16,185,129,0.15)', color: '#10b981' }
      default: return { bg: 'rgba(107,114,128,0.12)', color: '#64748b' }
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/admin/team" className="btn btn--ghost btn--icon" title="Back to Members">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-header__title">{member.name}</h1>
              <span className={`badge badge--${member.isActive ? 'active' : 'inactive'}`}>
                {member.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className={`badge badge--${member.role === 'ADMIN' ? 'in-progress' : 'planned'}`}>
                {member.role === 'ADMIN' ? 'Admin' : 'Team Member'}
              </span>
            </div>
            <div className="flex items-center gap-3" style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1"><Mail size={12} />{member.email}</span>
              {member.phone && <span className="flex items-center gap-1"><Phone size={12} />{member.phone}</span>}
              {member.salary && (
                <span className="badge" style={{ fontSize: 10, background: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: 600 }}>
                  ₹{Number(member.salary).toLocaleString('en-IN')}/mo
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Edit Form */}
        <div style={{ gridColumn: 'span 2' }}>
          <AdminMemberEditForm member={{
            id: member.id,
            name: member.name,
            phone: member.phone,
            salary: member.salary ? Number(member.salary) : null,
            role: member.role,
            teamRole: member.teamRole,
            isActive: member.isActive,
          }} />

          {/* Recent Tasks */}
          {member.tasksAssigned.length > 0 && (
            <div className="card" style={{ marginTop: 'var(--space-6)' }}>
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
                Recent Assigned Tasks
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {member.tasksAssigned.map((t) => (
                  <div key={t.id} className="flex items-center justify-between" style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{t.title}</span>
                    <span className={`badge badge--${t.status.toLowerCase().replace(/_/g, '-')}`} style={{ fontSize: 9 }}>
                      {t.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Project Assignments */}
        <div>
          <div className="card">
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              Project Assignments ({member.projectMembers.length})
            </h2>

            {member.projectMembers.length === 0 ? (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Not assigned to any project yet. Sub-roles are assigned when added to a project.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {member.projectMembers.map((pm) => {
                  const roleStyle = projectRoleColor(pm.role)
                  return (
                    <div key={pm.id} style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/admin/projects/${pm.project.id}`}
                            style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--accent-primary)', textDecoration: 'none' }}
                          >
                            {pm.project.name}
                          </Link>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                            {pm.project.client.name}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <span className="badge" style={{ fontSize: 9, background: roleStyle.bg, color: roleStyle.color }}>
                            {pm.role.replace(/_/g, ' ')}
                          </span>
                          <span className={`badge badge--${pm.project.status.toLowerCase().replace(/_/g, '-')}`} style={{ fontSize: 9 }}>
                            {pm.project.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ marginTop: 'var(--space-6)' }}>
            <MemberDangerZone memberId={id} memberName={member.name} memberEmail={member.email} />
          </div>
        </div>
      </div>
    </div>
  )
}
