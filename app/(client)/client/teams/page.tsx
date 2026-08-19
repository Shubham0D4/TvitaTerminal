import { getServerUser, getClientSubTeamContext } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ClientTeamsManager from './ClientTeamsManager'

export const metadata = {
  title: 'My Team — Tvita Client Portal',
  description: 'Invite colleagues to access your projects.',
}

export default async function ClientTeamsPage() {
  const user = await getServerUser()
  if (!user || user.role !== 'CLIENT') redirect('/login')

  // Sub-team members cannot access team management
  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx) redirect('/client/dashboard')

  const client = await prisma.client.findFirst({
    where: { profileId: user.id },
    select: { id: true, name: true },
  })

  if (!client) redirect('/client/dashboard')

  // Fetch members from the default team (if it exists)
  const defaultTeam = await prisma.clientSubTeam.findFirst({
    where: { clientId: client.id, name: '__default__' },
  })

  const members = defaultTeam
    ? await prisma.clientSubTeamMember.findMany({
        where: { subTeamId: defaultTeam.id },
        include: {
          profile: { select: { email: true, name: true, isActive: true, passwordHash: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const serialized = JSON.parse(JSON.stringify(members))

  return (
    <ClientTeamsManager
      clientName={client.name}
      initialMembers={serialized}
    />
  )
}
