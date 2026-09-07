import { redirect } from 'next/navigation'

import { getServerUser, redirectToLogin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import TicketsWorkspace from '@/app/components/client/TicketsWorkspace'
import { clientProjectWhere, getClientActor, hasClientPolicy } from '@/lib/auth/access'

export const metadata = {
  title: 'Tickets — Tvita Client Portal',
}

export default async function ClientTicketsPage() {
  const user = await getServerUser()
  if (!user) redirectToLogin()

  const actor = await getClientActor(user)
  if (!actor || !hasClientPolicy(actor.subTeam, 'issues')) redirect('/client/home')

  const projects = await prisma.project.findMany({
    where: clientProjectWhere(actor.client.id, actor.subTeam),
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
