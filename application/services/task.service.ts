import { TaskRepository } from '@/infrastructure/database/repositories/task.repository'
import { taskToDTO, serializeDate } from '@/contracts/dto/dto-mappers'
import { writeAuditLog } from '@/lib/audit'
import { ValidationError, NotFoundError } from '@/shared/errors/application-errors'
import { prisma } from '@/lib/prisma'
import { TaskPriority, TaskStatus } from '@prisma/client'

export class TaskService {
  static async recalculateProjectProgress(projectId: string) {
    const allTasks = await TaskRepository.findMany({
      where: { projectId },
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

  static async autoAssignLeastBusyMember(projectId: string, targetTeamRole: 'DEVELOPER' | 'TESTER'): Promise<string | null> {
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
    actor: { id: string; role: string; teamRole: string | null }
  ) {
    const where: any = {}
    if (params.status) where.status = params.status
    if (params.projectId) where.projectId = params.projectId
    if (params.assigneeId) where.assigneeId = params.assigneeId

    // Scoping for non-admins / non-team-leads
    if (actor.role !== 'ADMIN' && actor.teamRole !== 'TEAM_LEAD') {
      where.OR = [
        { developerId: actor.id },
        { testerId: actor.id },
        { assigneeId: actor.id },
      ]
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
    actor: { id: string; email: string; role: string; name: string }
  ) {
    const { projectId, milestoneId, title, description, priority = 'MEDIUM', developerId, testerId, dueDate, clientVisible = false } = body

    if (!projectId || !title) {
      throw new ValidationError('projectId and title are required')
    }

    let assignedDevId = developerId || null
    let assignedTesterId = testerId || null

    if (!assignedDevId) {
      assignedDevId = await this.autoAssignLeastBusyMember(projectId, 'DEVELOPER')
    }
    if (!assignedTesterId) {
      assignedTesterId = await this.autoAssignLeastBusyMember(projectId, 'TESTER')
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

  static async getTaskDetails(id: string) {
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
    actor: { id: string; email: string; role: string; name: string }
  ) {
    const task = await TaskRepository.findById(id)
    if (!task) {
      throw new NotFoundError('Task not found')
    }

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

  static async deleteTask(id: string, actor: { id: string; email: string; role: string }) {
    const task = await TaskRepository.findById(id)
    if (!task) {
      throw new NotFoundError('Task not found')
    }

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

  static async addTaskComment(id: string, content: string, actor: { id: string; email: string; role: string; name: string }) {
    if (!content || content.trim() === '') {
      throw new ValidationError('Comment content is required')
    }

    const task = await TaskRepository.findById(id)
    if (!task) {
      throw new NotFoundError('Task not found')
    }

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

  static async updateTaskStatus(
    id: string,
    targetStatus: TaskStatus,
    actor: { id: string; email: string; role: string; name: string; teamRole?: string | null }
  ) {
    const task = await TaskRepository.findById(id)
    if (!task) {
      throw new NotFoundError('Task not found')
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
