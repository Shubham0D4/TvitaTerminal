import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { getServerUser } from '@/lib/auth/server'
import { assertProjectManage } from '@/lib/auth/access'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) {
    return Errors.UNAUTHORIZED()
  }

  const { id: taskId } = await params

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    })
    if (!task) {
      return Errors.NOT_FOUND('Task')
    }

    await assertProjectManage(user, task.projectId)

    const body = await request.json()
    const { developerId, testerId } = body

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        developerId: developerId || null,
        testerId: testerId || null,
      },
    })

    await prisma.taskActivity.create({
      data: {
        taskId,
        actorId: user.id,
        action: 'ASSIGNED',
        note: 'Updated developer / tester assignments',
      },
    })

    return apiSuccess(updatedTask)
  } catch (error) {
    console.error('Task assignment API error:', error)
    return fromUnknownError(error, 'Failed to update assignments')
  }
}
