import { apiSuccess, Errors } from '@/lib/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser, isTeamMember, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { TaskPriority, TaskStatus } from '@prisma/client'
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

async function autoAssignLeastBusyMember(projectId: string, targetTeamRole: 'DEVELOPER' | 'TESTER'): Promise<string | null> {
  const projectMembers = await prisma.projectMember.findMany({
    where: { projectId },
    include: { profile: true },
  })

  const eligibleProfiles = projectMembers
    .map((pm) => pm.profile)
    .filter((p) => p.isActive && p.teamRole === targetTeamRole)

  if (eligibleProfiles.length === 0) {
    const globalProfiles = await prisma.profile.findMany({
      where: { isActive: true, role: 'TEAM_MEMBER', teamRole: targetTeamRole },
    })
    if (globalProfiles.length === 0) return null
    eligibleProfiles.push(...globalProfiles)
  }

  let leastBusyProfileId: string | null = null
  let minActiveTasks = Infinity

  for (const candidate of eligibleProfiles) {
    const activeTasksCount = await prisma.task.count({
      where: {
        ...(targetTeamRole === 'DEVELOPER' ? { developerId: candidate.id } : { testerId: candidate.id }),
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    })

    if (activeTasksCount < minActiveTasks) {
      minActiveTasks = activeTasksCount
      leastBusyProfileId = candidate.id
    }
  }

  return leastBusyProfileId
}

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || (!isTeamMember(user) && !isAdmin(user))) {
    return Errors.UNAUTHORIZED()
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || ''
  const projectId = searchParams.get('projectId') || ''

  try {
    const where: any = {}
    if (status) where.status = status
    if (projectId) where.projectId = projectId

    if (!isAdmin(user) && user.teamRole !== 'TEAM_LEAD') {
      where.OR = [
        { developerId: user.id },
        { testerId: user.id },
        { assigneeId: user.id },
      ]
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
        developer: { select: { id: true, name: true } },
        tester: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    })

    return apiSuccess(tasks)
  } catch (error) {
    console.error('Team tasks GET API error:', error)
    return Errors.INTERNAL('Failed to fetch tasks')
  }
}

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) {
    return Errors.UNAUTHORIZED()
  }

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile || (profile.role !== 'ADMIN' && profile.teamRole !== 'TEAM_LEAD')) {
    return Errors.FORBIDDEN()
  }

  try {
    const body = await request.json()
    const { projectId, milestoneId, title, description, priority, developerId, testerId, dueDate, clientVisible } = body

    if (!projectId || !title) {
      return Errors.VALIDATION('projectId and title are required')
    }

    let assignedDevId = developerId || null
    let assignedTesterId = testerId || null

    if (!assignedDevId) {
      assignedDevId = await autoAssignLeastBusyMember(projectId, 'DEVELOPER')
    }
    if (!assignedTesterId) {
      assignedTesterId = await autoAssignLeastBusyMember(projectId, 'TESTER')
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        milestoneId: milestoneId || null,
        title,
        description: description || null,
        priority: (priority as TaskPriority) || 'MEDIUM',
        status: 'TODO',
        developerId: assignedDevId,
        testerId: assignedTesterId,
        assigneeId: assignedDevId,
        dueDate: dueDate ? new Date(dueDate) : null,
        clientVisible: Boolean(clientVisible),
        createdById: user.id,
      },
    })

    await prisma.taskActivity.create({
      data: {
        taskId: task.id,
        actorId: user.id,
        action: 'CREATED',
        toValue: 'TODO',
        note: `Task created by ${profile.name}.${assignedDevId ? ' Developer auto-assigned.' : ''}${assignedTesterId ? ' Tester auto-assigned.' : ''}`,
      },
    })

    await recalculateProjectProgress(projectId)

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'CREATE',
      entityType: 'task',
      entityId: task.id,
      entityLabel: task.title,
      newValue: { projectId, developerId: assignedDevId, testerId: assignedTesterId },
    })

    return apiSuccess(task, 201)
  } catch (error) {
    console.error('Team task POST API error:', error)
    return Errors.INTERNAL('Failed to create task')
  }
}
