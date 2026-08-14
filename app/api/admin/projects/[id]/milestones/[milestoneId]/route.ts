import { apiSuccess, Errors } from '@/lib/api-response'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

async function recalcProgress(projectId: string) {
  const all = await prisma.milestone.findMany({ where: { projectId } })
  const done = all.filter((m) => m.status === 'COMPLETED').length
  const pct = all.length > 0 ? Math.round((done / all.length) * 100) : 0
  await prisma.project.update({ where: { id: projectId }, data: { progress: pct } })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id: projectId, milestoneId } = await params

  try {
    const existing = await prisma.milestone.findUnique({ where: { id: milestoneId } })
    if (!existing) {
      return Errors.NOT_FOUND('Milestone')
    }

    const body = await request.json()
    const { name, description, dueDate, status, assigneeId, clientVisible, imageUrls } = body

    const isCompleting = status === 'COMPLETED'

    const updated = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        name: name ?? existing.name,
        description: description !== undefined ? description : existing.description,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate,
        status: status ?? existing.status,
        clientVisible: clientVisible !== undefined ? Boolean(clientVisible) : (isCompleting ? true : existing.clientVisible),
        completedDate: isCompleting ? new Date() : (status && status !== 'COMPLETED' ? null : existing.completedDate),
        assigneeId: assigneeId !== undefined ? assigneeId : existing.assigneeId,
        imageUrls: Array.isArray(imageUrls) ? imageUrls : existing.imageUrls,
      },
    })

    await recalcProgress(projectId)
    return apiSuccess(updated)
  } catch (error) {
    console.error('Admin milestone PUT API error:', error)
    return Errors.INTERNAL('Failed to update milestone')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id: projectId, milestoneId } = await params

  try {
    await prisma.milestone.delete({ where: { id: milestoneId } })
    await recalcProgress(projectId)
    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('Admin milestone DELETE API error:', error)
    return Errors.INTERNAL('Failed to delete milestone')
  }
}
