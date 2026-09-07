import { TaskRepository } from '@/lib/repositories/task.repository'
import { taskToDTO, serializeDate } from '@/lib/dto/mappers'
import { writeAuditLog } from '@/lib/audit'
import { ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'
import { TaskPriority, TaskStatus } from '@prisma/client'
import type { AuthUser } from '@/lib/auth/server'
import { isAdmin, isTeamMember } from '@/lib/auth/server'
import { assertProjectAccess, assertProjectManage, canActOnAssignedWork, staffAccessibleProjectIds } from '@/lib/auth/access'
import { assertMilestoneBelongsToProject } from '@/lib/db/integrity'
import { recalcProgress } from '@/lib/utils/project-progress'

export class TaskService {
  static async recalculateProjectProgress(projectId: string) {
    return recalcProgress(projectId)
  }

  static async autoAssignLeastBusyMember(projectId: string, targetTeamRole: 'MEMBER' | 'TEAM_LEAD' = 'MEMBER'): Promise<string | null> {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { leadId: true } })
    const projectMembers = await prisma.projectMember.findMany({
      where: { projectId },
      include: { profile: true },
    })

    let eligibleProfiles = projectMembers
      .map((pm) => pm.profile)
      .filter((p) => p.isActive)

    if (project?.leadId) {
      const leadProfile = await prisma.profile.findUnique({ where: { id: project.leadId } })
      if (leadProfile && leadProfile.isActive && !eligibleProfiles.some((p) => p.id === leadProfile.id)) {
        eligibleProfiles.push(leadProfile)
      }
    }

    if (eligibleProfiles.length === 0) return null

    let leastBusyProfileId: string | null = null
    let minActiveTasks = Infinity

    for (const candidate of eligibleProfiles) {
      const activeTasksCount = await TaskRepository.count({
        OR: [
          { developerId: candidate.id },
          { testerId: candidate.id },
        ],
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      })

      if (activeTasksCount < minActiveTasks) {
        minActiveTasks = activeTasksCount
        leastBusyProfileId = candidate.id
      }
    }

    return leastBusyProfileId
  }

  static async getTasksList(
    params: { projectId?: string; status?: string; assigneeId?: string },
    actor: AuthUser
  ) {
    if (!isAdmin(actor) && !isTeamMember(actor)) {
      throw new AuthorizationError('Unauthorized')
    }

    const where: Record<string, unknown> = {}
    if (params.status) where.status = params.status
    if (params.assigneeId) where.assigneeId = params.assigneeId

    const accessibleIds = await staffAccessibleProjectIds(actor)
    if (params.projectId) {
      await assertProjectAccess(actor, params.projectId)
      where.projectId = params.projectId
    } else if (accessibleIds) {
      where.projectId = { in: accessibleIds.length > 0 ? accessibleIds : ['__none__'] }
    }

    const tasks = await TaskRepository.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
        developer: { select: { id: true, name: true } },
        tester: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    })

    return tasks.map(taskToDTO)
  }

  static async createTask(
    body: {
      projectId: string
      milestoneId?: string
      title: string
      description?: string
      priority?: TaskPriority
      developerId?: string
      testerId?: string
      dueDate?: string
      clientVisible?: boolean
    },
    actor: AuthUser
  ) {
    const { projectId, milestoneId, title, description, priority = 'MEDIUM', developerId, testerId, dueDate, clientVisible = false } = body

    if (!projectId || !title) {
      throw new ValidationError('projectId and title are required')
    }

    if (!isAdmin(actor) && !isTeamMember(actor)) {
      throw new AuthorizationError('Unauthorized')
    }
    await assertProjectAccess(actor, projectId)

    if (milestoneId) {
      await assertMilestoneBelongsToProject(milestoneId, projectId)
    }

    let assignedDevId = developerId || null
    let assignedTesterId = testerId || null

    if (!assignedDevId) {
      assignedDevId = await this.autoAssignLeastBusyMember(projectId, 'MEMBER')
    }

    const task = await TaskRepository.create({
      projectId,
      milestoneId: milestoneId || null,
      title,
      description: description || null,
      priority,
      status: 'TODO',
      developerId: assignedDevId,
      testerId: assignedTesterId,
      assigneeId: assignedDevId || actor.id,
      dueDate: dueDate ? new Date(dueDate) : null,
      clientVisible,
      createdById: actor.id,
    })

    await TaskRepository.createActivity({
      taskId: task.id,
      actorId: actor.id,
      action: 'CREATED',
      toValue: 'TODO',
      note: `Task created by ${actor.name}.${assignedDevId ? ' Developer auto-assigned.' : ''}${assignedTesterId ? ' Tester auto-assigned.' : ''}`,
    })

    await this.recalculateProjectProgress(projectId)

    await writeAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'CREATE',
      entityType: 'task',
      entityId: task.id,
      entityLabel: task.title,
      newValue: { projectId, developerId: assignedDevId, testerId: assignedTesterId },
    })

    return taskToDTO(task)
  }

  static async getTaskDetails(id: string, actor: AuthUser) {
    const task = await TaskRepository.findById(id, {
      project: { select: { id: true, name: true, clientId: true } },
      milestone: { select: { id: true, name: true, status: true } },
      developer: { select: { id: true, name: true } },
      tester: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    })

    if (!task) {
      throw new NotFoundError('Task not found')
    }

    await assertProjectAccess(actor, task.projectId)

    const [comments, activities] = await Promise.all([
      TaskRepository.findComments({ taskId: id }, { author: { select: { id: true, name: true, avatarUrl: true } } }),
      TaskRepository.findActivities({ taskId: id }, { actor: { select: { id: true, name: true } } }),
    ])

    return {
      task: taskToDTO(task),
      comments,
      activities,
    }
  }

  static async updateTask(
    id: string,
    body: {
      title?: string
      description?: string
      status?: TaskStatus
      priority?: TaskPriority
      developerId?: string
      testerId?: string
      dueDate?: string
      clientVisible?: boolean
      assigneeId?: string
    },
    actor: AuthUser
  ) {
    const task = await TaskRepository.findById(id)
    if (!task) {
      throw new NotFoundError('Task not found')
    }
    await assertProjectAccess(actor, task.projectId)

    const { title, description, status, priority, developerId, testerId, dueDate, clientVisible, assigneeId } = body

    const updated = await TaskRepository.update(id, {
      title: title ?? task.title,
      description: description !== undefined ? description : task.description,
      status: status ?? task.status,
      priority: priority ?? task.priority,
      developerId: developerId !== undefined ? developerId : task.developerId,
      testerId: testerId !== undefined ? testerId : task.testerId,
      assigneeId: assigneeId ?? task.assigneeId,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : task.dueDate,
      clientVisible: clientVisible !== undefined ? clientVisible : task.clientVisible,
    })

    // Log status transitions and assignees updates
    const notes: string[] = []
    if (status && status !== task.status) {
      notes.push(`Status changed from ${task.status} to ${status}`)
    }
    if (assigneeId && assigneeId !== task.assigneeId) {
      notes.push(`Assignee updated`)
    }

    if (notes.length > 0) {
      await TaskRepository.createActivity({
        taskId: id,
        actorId: actor.id,
        action: status && status !== task.status ? 'STATUS_CHANGE' : 'ASSIGNMENT',
        fromValue: task.status,
        toValue: updated.status,
        note: notes.join('. '),
      })
    }

    if (task.projectId) {
      await this.recalculateProjectProgress(task.projectId)
    }

    await writeAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'UPDATE',
      entityType: 'task',
      entityId: id,
      entityLabel: updated.title,
      oldValue: { status: task.status, assigneeId: task.assigneeId },
      newValue: { status: updated.status, assigneeId: updated.assigneeId },
    })

    return taskToDTO(updated)
  }

  static async deleteTask(id: string, actor: AuthUser) {
    const task = await TaskRepository.findById(id)
    if (!task) {
      throw new NotFoundError('Task not found')
    }
    await assertProjectManage(actor, task.projectId)

    await TaskRepository.delete(id)

    if (task.projectId) {
      await this.recalculateProjectProgress(task.projectId)
    }

    await writeAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'DELETE',
      entityType: 'task',
      entityId: id,
      entityLabel: task.title,
    })

    return { deleted: true }
  }

  static async addTaskComment(id: string, content: string, actor: AuthUser) {
    if (!content || content.trim() === '') {
      throw new ValidationError('Comment content is required')
    }

    const task = await TaskRepository.findById(id)
    if (!task) {
      throw new NotFoundError('Task not found')
    }
    await assertProjectAccess(actor, task.projectId)

    const comment = await TaskRepository.createComment({
      taskId: id,
      authorId: actor.id,
      content: content.trim(),
    }, {
      author: { select: { id: true, name: true, email: true, role: true } },
    })

    await TaskRepository.createActivity({
      taskId: id,
      actorId: actor.id,
      action: 'COMMENTED',
      note: `Added comment: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
    })

    return comment
  }

  static isValidTransition(
    role: string,
    teamRole: string | null | undefined,
    currentStatus: TaskStatus,
    targetStatus: TaskStatus
  ): boolean {
    return true
  }

  static async updateTaskStatus(
    id: string,
    targetStatus: TaskStatus,
    actor: AuthUser
  ) {
    const task = await TaskRepository.findById(id)
    if (!task) {
      throw new NotFoundError('Task not found')
    }
    const project = await assertProjectAccess(actor, task.projectId)

    if (!canActOnAssignedWork(actor, project, [task.assigneeId, task.developerId, task.testerId])) {
      throw new AuthorizationError('You can only update tasks assigned to you')
    }

    const currentStatus = task.status
    const allowed = this.isValidTransition(actor.role, actor.teamRole, currentStatus, targetStatus)
    if (!allowed) {
      throw new ValidationError(`Role ${actor.teamRole || actor.role} is not permitted to transition task from ${currentStatus} to ${targetStatus}`)
    }

    const updated = await TaskRepository.update(id, { status: targetStatus })

    await TaskRepository.createActivity({
      taskId: id,
      actorId: actor.id,
      action: 'STATUS_CHANGED',
      fromValue: currentStatus,
      toValue: targetStatus,
      note: `Status updated by ${actor.name} (${actor.teamRole || actor.role})`,
    })

    if (task.projectId) {
      await this.recalculateProjectProgress(task.projectId)
    }

    // Notifications
    const { createNotification } = await import('@/lib/notifications')
    if (targetStatus === 'READY_FOR_TESTING' && task.testerId) {
      await createNotification({
        userId: task.testerId,
        title: 'Task Ready for Testing',
        message: `Task "${task.title}" was submitted for QA.`,
        type: 'INFO',
        entityType: 'task',
        entityId: id,
      })
    } else if (targetStatus === 'CHANGES_REQUIRED' && task.developerId) {
      await createNotification({
        userId: task.developerId,
        title: 'Changes Required on Task',
        message: `Task "${task.title}" failed QA and requires changes.`,
        type: 'WARNING',
        entityType: 'task',
        entityId: id,
      })
    }

    await writeAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'STATUS_CHANGE',
      entityType: 'task',
      entityId: id,
      entityLabel: task.title,
      oldValue: { status: currentStatus },
      newValue: { status: targetStatus },
    })

    return taskToDTO(updated)
  }
}
