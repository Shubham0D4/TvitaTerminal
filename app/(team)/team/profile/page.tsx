import { prisma } from '@/lib/prisma'
import { getServerUser, redirectToLogin } from '@/lib/auth/server'
import Link from 'next/link'
import { Mail, FolderKanban } from 'lucide-react'
import ChangePasswordForm from '@/app/components/profile/ChangePasswordForm'
import ProfileAvatarUpload from '@/app/components/profile/ProfileAvatarUpload'

export const metadata = {
  title: 'My Profile — Tvita Team',
  description: 'Manage account credentials and member profile.',
}

export default async function TeamProfilePage() {
  const user = await getServerUser()
  if (!user) redirectToLogin()

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

  const title = user.teamRole === 'TEAM_LEAD' ? 'Team Lead' : 'Team Member'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">My Profile</h1>
          <p className="page-header__subtitle">Account, security, and where you are assigned.</p>
        </div>
      </div>

      <div className="team-profile">
        <div className="team-profile__main">
          <div className="card">
            <div className="team-profile__identity">
              <ProfileAvatarUpload currentAvatarUrl={profile?.avatarUrl} userName={user.name} />
              <div>
                <h2 className="team-profile__name">{user.name}</h2>
                <div className="team-profile__meta">
                  <Mail size={13} />
                  <span>{user.email}</span>
                  <span className="badge badge--active">{title}</span>
                </div>
              </div>
            </div>

            {profile && (
              <dl className="team-profile__facts">
                <div>
                  <dt>Phone</dt>
                  <dd>{profile.phone ?? '—'}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className={`badge badge--${profile.isActive ? 'active' : 'inactive'}`}>
                      {profile.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Projects</dt>
                  <dd>{profile.projectMembers.length}</dd>
                </div>
                <div>
                  <dt>On the job</dt>
                  <dd>Project roles are assigned per project by the lead or admin.</dd>
                </div>
              </dl>
            )}
          </div>

          <div className="card">
            <h3 className="team-profile__h">Security</h3>
            <ChangePasswordForm />
          </div>
        </div>

        <aside>
          <div className="card">
            <div className="team-profile__aside-h">
              <FolderKanban size={18} />
              <h3>Assignments ({profile?.projectMembers.length ?? 0})</h3>
            </div>

            {!profile || profile.projectMembers.length === 0 ? (
              <p className="team-profile__empty">You have not been assigned to a project yet.</p>
            ) : (
              <ul className="team-profile__projects">
                {profile.projectMembers.map((pm) => (
                  <li key={pm.id}>
                    <Link href={`/team/projects/${pm.project.id}`} className="team-profile__project">
                      <span className="team-profile__project-name">{pm.project.name}</span>
                      <span className="team-profile__project-client">{pm.project.client.name}</span>
                      <span className="badge">{pm.role.replace(/_/g, ' ')}</span>
                      <span className="team-profile__project-bar">
                        <span className="progress-bar-container">
                          <span className="progress-bar-fill" style={{ width: `${pm.project.progress}%` }} />
                        </span>
                        <span>{pm.project.progress}%</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
