import { prisma } from '@/lib/prisma'
import ProjectForm from '../ProjectForm'

export const metadata = {
  title: 'New Project — Tvita Admin',
  description: 'Create a new project and assign deliverables to client and team.',
}

type SearchParams = Promise<{ clientId?: string }>

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { clientId } = await searchParams

  const [clients, teamMembers] = await Promise.all([
    prisma.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.profile.findMany({
      where: { role: { in: ['ADMIN', 'TEAM_MEMBER'] }, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="form-shell">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Create Project</h1>
          <p className="page-header__subtitle">
            Scope, timeline, client, and project lead — then open the workspace
          </p>
        </div>
      </div>

      <ProjectForm
        clients={clients}
        teamMembers={teamMembers}
        initialClientId={clientId}
      />
    </div>
  )
}
