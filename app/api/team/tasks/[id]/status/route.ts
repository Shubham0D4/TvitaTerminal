import { apiSuccess, Errors } from '@/lib/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser } from '@/lib/auth/server'
import { createNotification } from '@/lib/notifications'
import { prisma } from '@/lib/prisma'
import { TaskStatus } from '@prisma/client'
import { NextRequest } from 'next/server'

async function recalculateProjectProgress(projectId: string) {
  const allTasks = await prisma.task.findMany({
    where: { projectId },
    select: { status: true },
  })

  if (allTasks.length === 0) {
    await prisma.project.update({ where: { id: projectId }, data: { progress: 0 } })
    return 0
  }

  const completedTasks = allTasks.filter((t) => t.status === 'COMPLETED').length
  const progress = Math.round((completedTasks / allTasks.length) * 100)
  await prisma.project.update({ where: { id: projectId }, data: { progress } })
  return progress
}

function isValidTransition(
  role: string,
  teamRole: string | null | undefined,
  currentStatus: TaskStatus,
  targetStatus: TaskStatus
): boolean {
  if (role === 'ADMIN' || teamRole === 'TEAM_LEAD') return true

  if (teamRole === 'DEVELOPER') {
    if (currentStatus === 'TODO' && targetStatus === 'IN_PROGRESS') return true
    if (currentStatus === 'IN_PROGRESS' && (targetStatus === 'READY_FOR_TESTING' || targetStatus === 'BLOCKED')) return true
    if (currentStatus === 'CHANGES_REQUIRED' && (targetStatus === 'IN_PROGRESS' || targetStatus === 'READY_FOR_TESTING')) return true
    if (targetStatus === 'BLOCKED') return true
    return false
  }

  if (teamRole === 'TESTER') {
    if (currentStatus === 'READY_FOR_TESTING' && targetStatus === 'IN_TESTING') return true
    if (currentStatus === 'IN_TESTING' && (targetStatus === 'COMPLETED' || targetStatus === 'CHANGES_REQUIRED')) return true
    if (targetStatus === 'BLOCKED') return true
    return false
  }

  return true
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) {
    return Errors.UNAUTHORIZED()
  }

  const { id: taskId } = await params

  try {
    const profile = await prisma.profile.findUnique({ where: { id: user.id } })
    if (!profile) return Errors.NOT_FOUND('Profile')

    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true, developer: true, tester: true },
    })

    if (!existing) return Errors.NOT_FOUND('Task')

    const body = await request.json()
    const { status: targetStatus } = body

    if (!targetStatus) {
      return Errors.VALIDATION('status is required')
    }

    const currentStatus = existing.status

    const allowed = isValidTransition(profile.role, profile.teamRole, currentStatus, targetStatus as TaskStatus)
    if (!allowed) {
      return Errors.FORBIDDEN(`Role ${profile.teamRole || profile.role} is not permitted to transition task from ${currentStatus} to ${targetStatus}`)
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { status: targetStatus as TaskStatus },
    })

    await prisma.taskActivity.create({
      data: {
        taskId,
        actorId: user.id,
        action: 'STATUS_CHANGED',
        fromValue: currentStatus,
        toValue: targetStatus,
        note: `Status updated by ${profile.name} (${profile.teamRole || profile.role})`,
      },
    })

    await recalculateProjectProgress(existing.projectId)

    if (targetStatus === 'READY_FOR_TESTING' && existing.testerId) {
      await createNotification({
        userId: existing.testerId,
        title: 'Task Ready for Testing',
        message: `Task "${existing.title}" was submitted for QA.`,
        type: 'INFO',
        entityType: 'task',
        entityId: taskId,
      })
    } else if (targetStatus === 'CHANGES_REQUIRED' && existing.developerId) {
      await createNotification({
        userId: existing.developerId,
        title: 'Changes Required on Task',
        message: `Task "${existing.title}" failed QA and requires changes.`,
        type: 'WARNING',
        entityType: 'task',
        entityId: taskId,
      })
    }

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'STATUS_CHANGE',
      entityType: 'task',
      entityId: taskId,
      entityLabel: existing.title,
      oldValue: { status: currentStatus },
      newValue: { status: targetStatus },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Update task status API error:', error)
    return Errors.INTERNAL('Failed to update task status')
  }
}
