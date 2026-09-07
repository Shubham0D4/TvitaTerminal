import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { getServerUser } from '@/lib/auth/server'
import { canActOnAssignedWork } from '@/lib/auth/access'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { recalcProgress } from '@/lib/utils/project-progress'


export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) {
    return Errors.UNAUTHORIZED()
  }

  if (user.role === 'CLIENT') {
    return Errors.FORBIDDEN('Clients cannot update milestone status')
  }

  const { id: milestoneId } = await params

  try {
    const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } })
    if (!milestone) return Errors.NOT_FOUND('Milestone')

    const project = await prisma.project.findUnique({
      where: { id: milestone.projectId },
      select: { leadId: true },
    })
    if (!project) return Errors.NOT_FOUND('Project')

    if (!canActOnAssignedWork(user, project, [milestone.assigneeId])) {
      return Errors.FORBIDDEN('You can only complete milestones assigned to you')
    }

    const body = await request.json()
    const { status } = body

    if (!status) {
      return Errors.VALIDATION('status is required')
    }

    const isCompleting = status === 'COMPLETED'

    const updated = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status,
        clientVisible: isCompleting ? true : milestone.clientVisible,
        completedDate: isCompleting ? new Date() : (status !== 'COMPLETED' ? null : milestone.completedDate),
      },
    })

    await recalcProgress(milestone.projectId)

    return apiSuccess(updated)
  } catch (error) {
    console.error('Team milestone status PATCH API error:', error)
    return Errors.INTERNAL('Failed to update milestone status')
  }
}
