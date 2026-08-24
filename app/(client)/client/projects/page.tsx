import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FolderKanban } from 'lucide-react'
import Image from 'next/image'

import { prisma } from '@/lib/prisma'
import { getServerUser, getClientSubTeamContext, redirectToLogin } from '@/lib/auth/server'
import ProjectCarousel from '@/app/components/client/ProjectCarousel'

export const metadata = {
  title: 'Projects — Tvita Client Portal',
  description: 'Track ongoing project deliverables, timelines, and milestones.',
}

/** Used when a project has no banner of its own. */
const FALLBACK_BANNER = '/menu%20img.webp'

/** Finished work lives under History rather than in the active deck. */
const CLOSED = ['COMPLETED', 'CANCELLED']

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

interface ClientProjectsPageProps {
  searchParams: Promise<{ search?: string }>
}

export default async function ClientProjectsPage({ searchParams }: ClientProjectsPageProps) {
  const { search } = await searchParams
  const query = search?.trim() ?? ''

  const user = await getServerUser()
  if (!user) redirectToLogin()

  // Sub-team users resolve their client via the sub-team relation.
  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx && !subTeamCtx.policy.projects) redirect('/client/home')

  const client = await prisma.client.findFirst({
    where: subTeamCtx
      ? { id: subTeamCtx.clientId }
      : { OR: [{ profileId: user.id }, { email: user.email }] },
  })

  if (!client) {
    return (
      <div className="card">
        <div className="empty-state">
          <FolderKanban size={28} />
          <div className="empty-state__title">No Client Account Linked</div>
          <div className="empty-state__desc">
            Your user account is not linked to a client organization yet. Please contact agency support.
          </div>
        </div>
      </div>
    )
  }

  const projects = await prisma.project.findMany({
    where: {
      clientId: client.id,
      ...(subTeamCtx && subTeamCtx.allowedProjectIds.length > 0
        ? { id: { in: subTeamCtx.allowedProjectIds } }
        : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { description: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      description: true,
      banner: true,
      status: true,
      progress: true,
      endDate: true,
      updatedAt: true,
      // Names the phase on the ticket stub. The process tree itself is a
      // fixed pipeline, so it needs nothing from here.
      milestones: {
        where: { clientVisible: true },
        orderBy: { sortOrder: 'asc' },
        select: { name: true, status: true },
      },
      // Latest notes from the team, shown against the milestone underway.
      updates: {
        where: { clientVisible: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true, title: true, content: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const active = projects.filter((project) => !CLOSED.includes(project.status))
  const history = projects.filter((project) => CLOSED.includes(project.status))

  return (
    <div className="projects">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Projects</h1>
          <p className="page-header__subtitle">
            Deliverables and milestone status for {client.name}.
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FolderKanban size={28} />
            <div className="empty-state__title">
              {query ? 'No projects match that search' : 'No active projects'}
            </div>
            <div className="empty-state__desc">
              {query
                ? 'Try a different name or keyword.'
                : 'You have no active projects registered with us at this time.'}
            </div>
          </div>
        </div>
      ) : (
        <div className="projects__stack">
          <ProjectCarousel
            fallbackImage={FALLBACK_BANNER}
            projects={active.map((project) => ({
              id: project.id,
              name: project.name,
              banner: project.banner,
              status: project.status,
              progress: project.progress,
              phase: project.milestones.find((m) => m.status !== 'COMPLETED')?.name,
              updates: project.updates.map((update) => ({
                id: update.id,
                title: update.title,
                content: update.content,
                createdAt: update.createdAt.toISOString(),
              })),
            }))}
          />

          {history.length > 0 && (
            <section className="phist" aria-label="Project history">
              <h2 className="phist__title">History</h2>

              <ul className="phist__list">
                {history.map((project) => (
                  <li key={project.id} className="phrow">
                    <Link href={`/client/projects/${project.id}`} className="phrow__link">
                      <span className="phrow__avatar" aria-hidden="true">
                        {initials(project.name)}
                      </span>

                      <span className="phrow__body">
                        <span className="phrow__name">
                          {project.name}
                          {project.status === 'COMPLETED' && (
                            <Image
                              src="/check.png"
                              alt="Completed"
                              width={17}
                              height={17}
                              className="phrow__check"
                            />
                          )}
                        </span>
                        {project.description && (
                          <span className="phrow__desc">{project.description}</span>
                        )}
                      </span>

                      <span className="phrow__year">
                        {(project.endDate ?? project.updatedAt).getFullYear()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
