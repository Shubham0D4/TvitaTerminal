import { apiSuccess, Errors } from '@/lib/api-response'
import { getServerUser } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) {
    return Errors.UNAUTHORIZED()
  }

  const { id: taskId } = await params
  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) {
    return Errors.NOT_FOUND('Task')
  }

  try {
    const body = await request.json()
    const { content } = body
    if (!content || !content.trim()) {
      return Errors.VALIDATION('Comment content is required')
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        authorId: user.id,
        content: content.trim(),
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    await prisma.taskActivity.create({
      data: {
        taskId,
        actorId: user.id,
        action: 'COMMENTED',
        note: `Added comment: "${content.trim().slice(0, 50)}${content.trim().length > 50 ? '...' : ''}"`,
      },
    })

    return apiSuccess(comment, 201)
  } catch (error) {
    console.error('Task add comment API error:', error)
    return Errors.INTERNAL('Failed to add comment')
  }
}
