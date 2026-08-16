import { prisma } from '@/lib/prisma'
import { getClientSubTeamContext, AuthUser } from '@/lib/auth/server'
import { ValidationError, NotFoundError } from '@/shared/errors/application-errors'
import { writeAuditLog } from '@/lib/audit'

export class IssueService {
  static async validateProjectAccess(projectId: string, user: AuthUser) {
    if (user.role === 'ADMIN') return true

    if (user.role === 'TEAM_MEMBER') {
      const pm = await prisma.projectMember.findFirst({
        where: { projectId, profileId: user.id }
      })
      if (!pm && user.teamRole !== 'TEAM_LEAD') {
        throw new Error('Unauthorized project access')
      }
      return true
    }

    if (user.role === 'CLIENT') {
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      })
      if (!project) throw new NotFoundError('Project not found')

      const subteam = await getClientSubTeamContext(user.id)
      const clientId = subteam ? subteam.clientId : (await prisma.client.findFirst({
        where: { profileId: user.id },
        select: { id: true }
      }))?.id

      if (!clientId || clientId !== project.clientId) {
        throw new Error('Unauthorized project access')
      }

      if (subteam) {
        if (!subteam.policy.issues) {
          throw new Error('Unauthorized issues access')
        }
        if (subteam.allowedProjectIds.length > 0 && !subteam.allowedProjectIds.includes(projectId)) {
          throw new Error('Unauthorized project access')
        }
      }
      return true
    }

    throw new Error('Unauthorized')
  }

  static async getIssuesList(projectId: string, user: AuthUser) {
    await this.validateProjectAccess(projectId, user)
    return prisma.issue.findMany({
      where: { projectId },
      include: {
        creator: { select: { id: true, name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  static async createIssue(body: { projectId: string; title: string; description: string; priority: string }, user: AuthUser) {
    const { projectId, title, description, priority = 'MEDIUM' } = body
    if (!title || !description) {
      throw new ValidationError('Title and description are required')
    }
    await this.validateProjectAccess(projectId, user)

    const issue = await prisma.issue.create({
      data: {
        projectId,
        title,
        description,
        priority,
        creatorId: user.id,
      },
      include: {
        creator: { select: { id: true, name: true, role: true } }
      }
    })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'CREATE',
      entityType: 'issue',
      entityId: issue.id,
      entityLabel: title,
      newValue: { projectId, priority },
    })

    return issue
  }

  static async updateIssue(id: string, body: { status?: string; priority?: string; title?: string; description?: string }, user: AuthUser) {
    const issue = await prisma.issue.findUnique({ where: { id } })
    if (!issue) throw new NotFoundError('Issue not found')

    await this.validateProjectAccess(issue.projectId, user)

    const isLeadOrAdmin = user.role === 'ADMIN' || user.teamRole === 'TEAM_LEAD'
    const isCreator = issue.creatorId === user.id
    
    const updateData: any = {}
    if (body.status) updateData.status = body.status
    if (body.priority) updateData.priority = body.priority
    if (body.title && (isCreator || isLeadOrAdmin)) updateData.title = body.title
    if (body.description && (isCreator || isLeadOrAdmin)) updateData.description = body.description

    const updated = await prisma.issue.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, role: true } }
      }
    })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'UPDATE',
      entityType: 'issue',
      entityId: id,
      entityLabel: updated.title,
      oldValue: { status: issue.status },
      newValue: { status: updated.status },
    })

    return updated
  }

  static async deleteIssue(id: string, user: AuthUser) {
    const issue = await prisma.issue.findUnique({ where: { id } })
    if (!issue) throw new NotFoundError('Issue not found')

    await this.validateProjectAccess(issue.projectId, user)

    const isLeadOrAdmin = user.role === 'ADMIN' || user.teamRole === 'TEAM_LEAD'
    const isCreator = issue.creatorId === user.id

    if (!isCreator && !isLeadOrAdmin) {
      throw new Error('Only the creator, project lead, or admin can delete this issue')
    }

    await prisma.issue.delete({ where: { id } })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'DELETE',
      entityType: 'issue',
      entityId: id,
      entityLabel: issue.title,
    })

    return { deleted: true }
  }
}
