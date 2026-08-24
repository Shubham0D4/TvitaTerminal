import { redirect } from 'next/navigation'

import { getServerUser, getClientSubTeamContext } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import NotesWorkspace from '@/app/components/client/NotesWorkspace'

export const metadata = {
  title: 'Notes — Tvita Client Portal',
}

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'Ongoing',
  ON_HOLD: 'On hold',
  CLIENT_REVIEW: 'In review',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export default async function ClientNotesPage() {
  const user = await getServerUser()
  if (!user) redirect('/login')

  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx && subTeamCtx.policy.notes === false) redirect('/client/home')

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
      banner: true,
      status: true,
      notes: {
        // Clients only ever see notes shared with them.
        where: { type: 'EXTERNAL_CLIENT' },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          content: true,
          attachments: true,
          createdAt: true,
          creatorId: true,
          creator: { select: { name: true } },
        },
      },
    },
  })

  return (
    <NotesWorkspace
      currentUserId={user.id}
      projects={projects.map((project) => ({
        id: project.id,
        name: project.name,
        banner: project.banner,
        status: STATUS_LABELS[project.status] ?? project.status,
        notes: project.notes.map((note) => ({
          id: note.id,
          content: note.content,
          author: note.creator?.name ?? 'Team',
          isMine: note.creatorId === user.id,
          createdAt: note.createdAt.toISOString(),
          attachments: Array.isArray(note.attachments)
            ? (note.attachments as Array<{ name?: string; url?: string }>)
                .filter((file) => Boolean(file?.name))
                .map((file) => ({ name: String(file.name), url: file.url ?? '#' }))
            : [],
        })),
      }))}
    />
  )
}
