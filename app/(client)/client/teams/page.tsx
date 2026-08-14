import { getServerUser, getClientSubTeamContext } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ClientTeamsManager from './ClientTeamsManager'

export const metadata = {
  title: 'My Teams — Tvita Client Portal',
  description: 'Manage your internal teams and their access to project information.',
}

export default async function ClientTeamsPage() {
  const user = await getServerUser()
  if (!user || user.role !== 'CLIENT') redirect('/login')

  // Sub-team users cannot access team management
  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx) redirect('/client/dashboard')

  const client = await prisma.client.findFirst({
    where: { profileId: user.id },
    include: {
      projects: {
        select: { id: true, name: true, status: true },
        orderBy: { createdAt: 'desc' },
      },
      subTeams: {
        orderBy: { createdAt: 'desc' },
        include: {
          roles: true,
          members: {
            include: {
              role: true,
              profile: { select: { email: true, name: true, isActive: true } },
            },
          },
        },
      },
    },
  })

  if (!client) redirect('/client/dashboard')

  const serializedClient = JSON.parse(JSON.stringify(client))

  return (
    <ClientTeamsManager
      client={serializedClient}
      projects={serializedClient.projects}
      initialSubTeams={serializedClient.subTeams}
    />
  )
}
