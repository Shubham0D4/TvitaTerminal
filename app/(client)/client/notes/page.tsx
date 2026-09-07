import { redirect } from 'next/navigation'

import { getServerUser, redirectToLogin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import NotesWorkspace from '@/app/components/client/NotesWorkspace'
import { clientProjectWhere, getClientActor, hasClientPolicy } from '@/lib/auth/access'
import { agencyNameForClient } from '@/lib/auth/visibility'

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
  if (!user) redirectToLogin()

  const actor = await getClientActor(user)
  if (!actor || !hasClientPolicy(actor.subTeam, 'notes')) redirect('/client/home')

  const projects = await prisma.project.findMany({
    where: clientProjectWhere(actor.client.id, actor.subTeam),
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      banner: true,
      status: true,
      leadId: true,
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
          creator: { select: { id: true, name: true, role: true } },
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
          author: note.creatorId === user.id
            ? (note.creator?.name ?? 'You')
            : agencyNameForClient(note.creator, project.leadId),
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
