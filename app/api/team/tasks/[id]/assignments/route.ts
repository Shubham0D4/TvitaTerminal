import { apiSuccess, Errors } from '@/lib/api-response'
import { getServerUser, isAdmin, isTeamLead } from '@/lib/auth/server'
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
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  })
  if (!task) {
    return Errors.NOT_FOUND('Task')
  }

  const isLeadOrAdmin = isAdmin(user) || task.project?.leadId === user.id || isTeamLead(user)
  if (!isLeadOrAdmin) {
    return Errors.FORBIDDEN()
  }

  try {
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
    return Errors.INTERNAL('Failed to update assignments')
  }
}
