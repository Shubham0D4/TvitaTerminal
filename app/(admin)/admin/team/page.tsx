import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Users, Plus, Mail, ArrowUpRight, Search } from 'lucide-react'
import TeamRowActions from './TeamRowActions'
import PeopleToolbarFilters from './PeopleToolbarFilters'

export const metadata = {
  title: 'People — Tvita Admin',
  description: 'Manage agency people, roles, invitations, and project workloads.',
}

type SearchParams = Promise<{ search?: string; role?: string; status?: string; sort?: string }>

function peopleStatus(m: { passwordHash: string | null; isActive: boolean }) {
  if (!m.passwordHash) return { label: 'Invited', className: 'badge badge--pending' }
  if (m.isActive) return { label: 'Active', className: 'badge badge--active' }
  return { label: 'Inactive', className: 'badge badge--inactive' }
}

export default async function AdminPeoplePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const sort = params.sort || 'name'

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
      ...(params.status === 'ACTIVE' && { isActive: true, passwordHash: { not: null } }),
      ...(params.status === 'INACTIVE' && { isActive: false, passwordHash: { not: null } }),
      ...(params.status === 'INVITED' && { passwordHash: null }),
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
    orderBy:
      sort === 'recent'
        ? { createdAt: 'desc' }
        : sort === 'workload'
          ? { tasksAssigned: { _count: 'desc' } }
          : { name: 'asc' },
  })

  const allForStats = await prisma.profile.findMany({
    where: { role: { in: ['ADMIN', 'TEAM_MEMBER'] } },
    select: { role: true, isActive: true, passwordHash: true },
  })

  const totalPeople = allForStats.length
  const adminCount = allForStats.filter((m) => m.role === 'ADMIN').length
  const invitedCount = allForStats.filter((m) => !m.passwordHash).length
  const activeCount = allForStats.filter((m) => m.isActive && m.passwordHash).length

  return (
    <div className="people">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">People</h1>
          <p className="page-header__subtitle">
            Manage who has access, what they can do, and how work is distributed
          </p>
        </div>
        <div className="page-header__actions">
          <Link href="/admin/team/new" className="btn btn--primary">
            <Plus size={16} />
            Add Person
          </Link>
        </div>
      </div>

      <div className="people-toolbar">
        <div className="people-toolbar__stats" aria-label="Team composition">
          <div className="people-toolbar__stat">
            <strong>{totalPeople}</strong>
            <span>Total</span>
          </div>
          <div className="people-toolbar__stat">
            <strong>{activeCount}</strong>
            <span>Active</span>
          </div>
          <div className="people-toolbar__stat">
            <strong>{adminCount}</strong>
            <span>Admins</span>
          </div>
          <div className="people-toolbar__stat">
            <strong style={{ color: invitedCount > 0 ? 'var(--color-warning)' : undefined }}>
              {invitedCount}
            </strong>
            <span>Invites</span>
          </div>
        </div>

        <div className="people-toolbar__controls">
          <form className="people-toolbar__search" method="GET">
            <Search size={15} className="people-toolbar__search-icon" />
            <input
              name="search"
              className="people-toolbar__search-input"
              placeholder="Search name or email…"
              defaultValue={params.search ?? ''}
            />
            {params.role && <input type="hidden" name="role" value={params.role} />}
            {params.status && <input type="hidden" name="status" value={params.status} />}
            {params.sort && <input type="hidden" name="sort" value={params.sort} />}
          </form>

          <PeopleToolbarFilters
            search={params.search}
            status={params.status}
            role={params.role}
            sort={params.sort}
          />
        </div>
      </div>

      {teamMembers.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state__icon">
              <Users size={28} />
            </div>
            <div className="empty-state__title">No people found</div>
            <div className="empty-state__desc">
              Add someone to assign projects, milestones, and permissions.
            </div>
            <Link href="/admin/team/new" className="btn btn--primary btn--sm">
              <Plus size={14} />
              Add Person
            </Link>
          </div>
        </div>
      ) : (
        <div className="people__table-card">
          <div className="table-wrapper">
            <table className="table people__table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Role</th>
                  <th>Sub-role</th>
                  <th>Status</th>
                  <th>Led</th>
                  <th>Tasks</th>
                  <th>Salary</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((m) => {
                  const status = peopleStatus(m)
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="people__identity">
                          <div className="people__avatar" aria-hidden>
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="people__identity-text">
                            <Link href={`/admin/team/${m.id}`} className="people__name">
                              {m.name}
                            </Link>
                            <div className="people__email">
                              <Mail size={11} />
                              {m.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge--${m.role === 'ADMIN' ? 'active' : 'inactive'}`}>
                          {m.role === 'ADMIN' ? 'Admin' : 'Team Member'}
                        </span>
                      </td>
                      <td>
                        {m.teamRole ? (
                          <span className="people__subrole">
                            {m.teamRole === 'TEAM_LEAD' ? 'Team Lead' : 'Member'}
                          </span>
                        ) : (
                          <span className="people__muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className={status.className}>{status.label}</span>
                      </td>
                      <td className="people__num">{m._count.projectsLed}</td>
                      <td className="people__num">{m._count.tasksAssigned}</td>
                      <td className="people__salary">
                        {m.salary ? (
                          `₹${Number(m.salary).toLocaleString('en-IN')}`
                        ) : (
                          <span className="people__muted">—</span>
                        )}
                      </td>
                      <td>
                        <div className="people__actions">
                          <TeamRowActions
                            memberId={m.id}
                            isActive={m.isActive}
                            hasPassword={Boolean(m.passwordHash)}
                            email={m.email}
                          />
                          <Link
                            href={`/admin/team/${m.id}`}
                            className="btn btn--ghost btn--xs"
                            title="Open profile"
                          >
                            Open <ArrowUpRight size={12} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="people__footer">
            Showing {teamMembers.length} of {totalPeople} people
          </div>
        </div>
      )}
    </div>
  )
}
