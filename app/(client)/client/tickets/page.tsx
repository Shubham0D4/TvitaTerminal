import { redirect } from 'next/navigation'

import { getServerUser, getClientSubTeamContext, redirectToLogin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import TicketsWorkspace from '@/app/components/client/TicketsWorkspace'

export const metadata = {
  title: 'Tickets — Tvita Client Portal',
}

export default async function ClientTicketsPage() {
  const user = await getServerUser()
  if (!user) redirectToLogin()

  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx && subTeamCtx.policy.issues === false) redirect('/client/home')

  const client = await prisma.client.findFirst({
    where: subTeamCtx
      ? { id: subTeamCtx.clientId }
      : { OR: [{ profileId: user.id }, { email: user.email }] },
    select: { id: true },
  })
  if (!client) redirect('/client/home')

  const allowedProjectIds = subTeamCtx?.allowedProjectIds ?? []
  const projectFilter =
    allowedProjectIds.length > 0
      ? { clientId: client.id, id: { in: allowedProjectIds } }
      : { clientId: client.id }

  const projects = await prisma.project.findMany({
    where: projectFilter,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      tickets: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          createdAt: true,
        },
      },
    },
  })

  // Newest first across every project the client can see.
  const tickets = projects
    .flatMap((project) =>
      project.tickets.map((ticket) => ({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        projectName: project.name,
        createdAt: ticket.createdAt.toISOString(),
      })),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <TicketsWorkspace
      tickets={tickets}
      projects={projects.map((project) => ({ id: project.id, name: project.name }))}
    />
  )
}
