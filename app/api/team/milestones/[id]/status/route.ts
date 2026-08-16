import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

async function recalcProgress(projectId: string) {
  const all = await prisma.milestone.findMany({ where: { projectId } })
  const done = all.filter((m) => m.status === 'COMPLETED').length
  const pct = all.length > 0 ? Math.round((done / all.length) * 100) : 0
  await prisma.project.update({ where: { id: projectId }, data: { progress: pct } })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) {
    return Errors.UNAUTHORIZED()
  }

  const { id: milestoneId } = await params

  try {
    const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } })
    if (!milestone) return Errors.NOT_FOUND('Milestone')

    const project = await prisma.project.findUnique({
      where: { id: milestone.projectId },
      select: { leadId: true },
    })

    const isLead = user.role === 'ADMIN' || project?.leadId === user.id
    if (!isLead && milestone.assigneeId !== user.id) {
      return Errors.FORBIDDEN('You are not assigned to this milestone')
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
