import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Users, Plus, Mail, Phone, FolderKanban, CheckCircle2, Shield } from 'lucide-react'
import TeamRowActions from './TeamRowActions'

export const metadata = {
  title: 'Members — Tvita Admin',
  description: 'Manage agency members, assign roles, and review active project workloads.',
}

type SearchParams = Promise<{ search?: string; role?: string }>

export default async function AdminTeamPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams

  const teamMembers = await prisma.profile.findMany({
    where: {
      role: { in: ['ADMIN', 'TEAM_MEMBER'] },
      ...(params.search && {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { email: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
      ...(params.role && params.role !== 'ALL' && { role: params.role as any }),
    },
    include: {
      _count: {
        select: {
          projectsLed: true,
          projectMembers: true,
          tasksAssigned: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Members</h1>
          <p className="page-header__subtitle">
            Manage agency members, assign roles, and review active project workloads.
          </p>
        </div>
        <div className="page-header__actions">
          <Link href="/admin/team/new" className="btn btn--primary">
            <Plus size={16} />
            Add Member
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <form className="filter-bar__search" method="GET">
          <Users size={15} className="filter-bar__search-icon" />
          <input
            name="search"
            className="filter-bar__search-input"
            placeholder="Search team members by name or email..."
            defaultValue={params.search ?? ''}
          />
          {params.role && <input type="hidden" name="role" value={params.role} />}
        </form>

        {(['ALL', 'ADMIN', 'TEAM_MEMBER'] as const).map((r) => (
          <Link
            key={r}
            href={`/admin/team?${params.search ? `search=${params.search}&` : ''}role=${r}`}
            className={`filter-chip${(!params.role && r === 'ALL') || params.role === r ? ' filter-chip--active' : ''}`}
          >
            {r === 'ALL' ? 'All Roles' : r === 'ADMIN' ? 'Admins' : 'Team Members'}
          </Link>
        ))}
      </div>

      {teamMembers.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Users size={28} />
            <div className="empty-state__title">No members found</div>
            <div className="empty-state__desc">Add members to assign projects and tasks.</div>
            <Link href="/admin/team/new" className="btn btn--primary btn--sm">
              <Plus size={14} />
              Add Member
            </Link>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Role</th>
                  <th>Project Sub-Role</th>
                  <th>Monthly Salary</th>
                  <th>Contact Email</th>
                  <th>Led Projects</th>
                  <th>Assigned Tasks</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: 'var(--accent-primary-muted)',
                            color: 'var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 'var(--font-bold)',
                          }}
                        >
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Link
                            href={`/admin/team/${m.id}`}
                            style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)', textDecoration: 'none' }}
                          >
                            {m.name}
                          </Link>
                          {m.phone && (
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                              {m.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge--${m.role === 'ADMIN' ? 'active' : 'inactive'}`}>
                        {m.role}
                      </span>
                    </td>
                    <td>
                      {m.teamRole ? (
                        <span className="badge" style={{
                          fontSize: 10,
                          background: m.teamRole === 'TEAM_LEAD' ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)',
                          color: m.teamRole === 'TEAM_LEAD' ? '#8b5cf6' : '#3b82f6',
                        }}>
                          {m.teamRole === 'TEAM_LEAD' ? 'TEAM LEAD' : 'TEAM MEMBER'}
                        </span>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>—</span>}
                    </td>
                    <td style={{ fontWeight: 'var(--font-medium)', color: m.salary ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {m.salary ? `₹${Number(m.salary).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{m.email}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{m._count.projectsLed}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{m._count.tasksAssigned}</td>
                    <td>
                      {!m.passwordHash ? (
                        <span className="badge badge--pending" title="Invitation sent, awaiting password setup">
                          Invited (Pending)
                        </span>
                      ) : (
                        <span className={`badge badge--${m.isActive ? 'active' : 'inactive'}`}>
                          {m.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td>
                      <TeamRowActions memberId={m.id} isActive={m.isActive} hasPassword={Boolean(m.passwordHash)} email={m.email} />
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
