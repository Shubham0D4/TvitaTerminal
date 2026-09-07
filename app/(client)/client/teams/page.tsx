import { DEFAULT_CLIENT_TEAM_NAME, getServerUser, getClientSubTeamContext, redirectToLogin, redirectToPortal } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ClientTeamsManager from './ClientTeamsManager'
import { publicMemberProfile } from '@/lib/auth/access'
import { ClientService } from '@/lib/services/client.service'

export const metadata = {
  title: 'Team — Tvita Client Portal',
  description: 'Invite colleagues to your projects. Billing stays with you.',
}

function parseAllowedProjectIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((id): id is string => typeof id === 'string' && id.length > 0 && id !== 'ALL')
}

export default async function ClientTeamsPage() {
  const user = await getServerUser()
  if (!user) redirectToLogin()
  if (user.role !== 'CLIENT') redirectToPortal(user)

  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx) redirect('/client/home')

  const client = await prisma.client.findFirst({
    where: { OR: [{ profileId: user.id }, { email: user.email }] },
    select: { id: true, name: true },
  })

  if (!client) redirect('/client/home')

  const defaultTeam = await ClientService.getOrCreateDefaultTeam(client.id)

  const [members, projects, extraTeams] = await Promise.all([
    prisma.clientSubTeamMember.findMany({
      where: { subTeamId: defaultTeam.id },
      include: {
        profile: { select: { email: true, name: true, isActive: true, passwordHash: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.project.findMany({
      where: { clientId: client.id },
      select: { id: true, name: true, status: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.clientSubTeam.findMany({
      where: { clientId: client.id, name: { not: DEFAULT_CLIENT_TEAM_NAME } },
      select: {
        id: true,
        name: true,
        status: true,
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const serialized = JSON.parse(JSON.stringify(
    members.map((m) => ({
      ...m,
      profile: publicMemberProfile(m.profile),
    }))
  ))

  return (
    <ClientTeamsManager
      clientName={client.name}
      teamId={defaultTeam.id}
      initialMembers={serialized}
      projects={JSON.parse(JSON.stringify(projects))}
      allowedProjectIds={parseAllowedProjectIds(defaultTeam.allowedProjects)}
      extraTeams={JSON.parse(JSON.stringify(extraTeams))}
    />
  )
}
