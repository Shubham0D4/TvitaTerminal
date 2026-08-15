import { getServerUser, getClientSubTeamContext } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import TeamDetailsManager from './TeamDetailsManager'

export const metadata = {
  title: 'Sub-Team Details — Tvita Client Portal',
  description: 'Manage sub-team members, roles, and project access boundaries.',
}

export default async function SubTeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser()
  if (!user || user.role !== 'CLIENT') redirect('/login')

  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx) redirect('/client/dashboard')

  const { id } = await params

  const client = await prisma.client.findFirst({
    where: { profileId: user.id },
    select: {
      id: true,
      projects: {
        select: { id: true, name: true, status: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!client) redirect('/client/dashboard')

  const subTeam = await prisma.clientSubTeam.findFirst({
    where: { id, clientId: client.id },
    include: {
      roles: true,
      members: {
        orderBy: { createdAt: 'desc' },
        include: {
          role: true,
          profile: { select: { email: true, name: true, isActive: true } },
        },
      },
    },
  })

  if (!subTeam) redirect('/client/teams')

  const serializedSubTeam = JSON.parse(JSON.stringify(subTeam))
  const serializedProjects = JSON.parse(JSON.stringify(client.projects))

  return (
    <TeamDetailsManager
      subTeam={serializedSubTeam}
      clientProjects={serializedProjects}
    />
  )
}
