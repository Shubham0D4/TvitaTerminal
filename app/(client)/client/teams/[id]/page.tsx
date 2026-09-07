import { DEFAULT_CLIENT_TEAM_NAME, getServerUser, getClientSubTeamContext, redirectToLogin, redirectToPortal } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import TeamDetailsManager from './TeamDetailsManager'
import { publicMemberProfile } from '@/lib/auth/access'

export const metadata = {
  title: 'Team Details — Tvita Client Portal',
  description: 'Manage team members, roles, and project access.',
}

export default async function SubTeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser()
  if (!user) redirectToLogin()
  if (user.role !== 'CLIENT') redirectToPortal(user)

  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx) redirect('/client/home')

  const { id } = await params

  const client = await prisma.client.findFirst({
    where: { OR: [{ profileId: user.id }, { email: user.email }] },
    select: {
      id: true,
      projects: {
        select: { id: true, name: true, status: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!client) redirect('/client/home')

  const subTeam = await prisma.clientSubTeam.findFirst({
    where: { id, clientId: client.id },
    include: {
      roles: true,
      members: {
        orderBy: { createdAt: 'desc' },
        include: {
          role: true,
          profile: { select: { email: true, name: true, isActive: true, passwordHash: true } },
        },
      },
    },
  })

  if (!subTeam) redirect('/client/teams')
  if (subTeam.name === DEFAULT_CLIENT_TEAM_NAME) redirect('/client/teams')

  const serializedSubTeam = JSON.parse(JSON.stringify({
    ...subTeam,
    members: subTeam.members.map((m) => ({
      ...m,
      profile: publicMemberProfile(m.profile),
    })),
  }))
  const serializedProjects = JSON.parse(JSON.stringify(client.projects))

  return (
    <TeamDetailsManager
      subTeam={serializedSubTeam}
      clientProjects={serializedProjects}
    />
  )
}
