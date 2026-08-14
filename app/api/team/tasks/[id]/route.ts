import { apiSuccess, Errors } from '@/lib/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { TaskPriority, TaskStatus } from '@prisma/client'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
        developer: { select: { id: true, name: true, email: true } },
        tester: { select: { id: true, name: true, email: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: { actor: { select: { name: true } } },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { name: true } } },
        },
      },
    })

    if (!task) {
      return Errors.NOT_FOUND('Task')
    }

    return apiSuccess(task)
  } catch (error) {
    console.error('Task GET API error:', error)
    return Errors.INTERNAL('Failed to fetch task')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const existing = await prisma.task.findUnique({ where: { id } })
    if (!existing) {
      return Errors.NOT_FOUND('Task')
    }

    const body = await request.json()
    const { title, description, priority, developerId, testerId, dueDate, clientVisible } = body

    const updated = await prisma.task.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        description: description !== undefined ? description : existing.description,
        priority: priority ? (priority as TaskPriority) : existing.priority,
        developerId: developerId !== undefined ? developerId : existing.developerId,
        testerId: testerId !== undefined ? testerId : existing.testerId,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate,
        clientVisible: clientVisible !== undefined ? Boolean(clientVisible) : existing.clientVisible,
      },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Task PUT API error:', error)
    return Errors.INTERNAL('Failed to update task')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const task = await prisma.task.findUnique({ where: { id } })
    if (!task) {
      return Errors.NOT_FOUND('Task')
    }

    await prisma.task.delete({ where: { id } })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'DELETE',
      entityType: 'task',
      entityId: id,
      entityLabel: task.title,
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('Task DELETE API error:', error)
    return Errors.INTERNAL('Failed to delete task')
  }
}
