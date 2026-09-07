'use server'

import { prisma } from '@/lib/prisma'
import { getServerUser, redirectToLogin } from '@/lib/auth/server'
import { writeAuditLog } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { assertProjectManage } from '@/lib/auth/access'
import { AuthorizationError, NotFoundError } from '@/lib/errors'

export async function publishProjectUpdate(data: {
  projectId: string
  title: string
  content: string
  clientVisible?: boolean
}): Promise<{ success: boolean; message: string }> {
  const user = await getServerUser()
  if (!user) redirectToLogin()

  try {
    await assertProjectManage(user, data.projectId)
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError) {
      return { success: false, message: error.message }
    }
    throw error
  }

  if (!data.title.trim() || !data.content.trim()) {
    return { success: false, message: 'Title and content are required.' }
  }

  const update = await prisma.projectUpdate.create({
    data: {
      projectId: data.projectId,
      title: data.title.trim(),
      content: data.content.trim(),
      authorId: user.id,
      clientVisible: data.clientVisible ?? true,
    },
  })

  await writeAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'CREATE',
    entityType: 'project',
    entityId: update.id,
    entityLabel: data.title,
  })

  revalidatePath('/team/projects')
  revalidatePath(`/client/projects/${data.projectId}`)
  return { success: true, message: 'Project status update published successfully.' }
}
