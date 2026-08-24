import { prisma } from '@/lib/prisma'
import { getClientSubTeamContext, AuthUser } from '@/lib/auth/server'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { writeAuditLog } from '@/lib/audit'

export class TicketService {
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
        if (subteam.allowedProjectIds.length > 0 && !subteam.allowedProjectIds.includes(projectId)) {
          throw new Error('Unauthorized project access')
        }
      }
      return true
    }

    throw new Error('Unauthorized')
  }

  static async getTicketsList(projectId: string, user: AuthUser) {
    await this.validateProjectAccess(projectId, user)
    return prisma.ticket.findMany({
      where: { projectId },
      include: {
        creator: { select: { id: true, name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  static async createTicket(body: { projectId: string; title: string; description?: string; priority?: string }, user: AuthUser) {
    const { projectId, title, description = '', priority = 'MEDIUM' } = body
    if (!title) {
      throw new ValidationError('Title is required')
    }
    await this.validateProjectAccess(projectId, user)

    const ticket = await prisma.ticket.create({
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

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { leadId: true }
    })
    
    if (project?.leadId) {
      const { createNotification } = await import('@/lib/notifications')
      await createNotification({
        userId: project.leadId,
        title: 'New Project Ticket Raised',
        message: `A new ticket "${title}" was raised by ${user.name}.`,
        type: 'WARNING',
        entityType: 'ticket',
        entityId: ticket.id,
      })
    }

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'CREATE',
      entityType: 'ticket',
      entityId: ticket.id,
      entityLabel: title,
      newValue: { projectId, priority },
    })

    return ticket
  }

  static async updateTicket(id: string, body: { status?: string; priority?: string }, user: AuthUser) {
    const ticket = await prisma.ticket.findUnique({ where: { id } })
    if (!ticket) throw new NotFoundError('Ticket not found')

    await this.validateProjectAccess(ticket.projectId, user)

    const updateData: any = {}
    if (body.status) updateData.status = body.status
    if (body.priority) updateData.priority = body.priority

    const updated = await prisma.ticket.update({
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
      entityType: 'ticket',
      entityId: id,
      entityLabel: updated.title,
      oldValue: { status: ticket.status },
      newValue: { status: updated.status },
    })

    return updated
  }

  static async deleteTicket(id: string, user: AuthUser) {
    const ticket = await prisma.ticket.findUnique({ where: { id } })
    if (!ticket) throw new NotFoundError('Ticket not found')

    await this.validateProjectAccess(ticket.projectId, user)

    const isLeadOrAdmin = user.role === 'ADMIN' || user.teamRole === 'TEAM_LEAD'
    const isCreator = ticket.creatorId === user.id

    if (!isCreator && !isLeadOrAdmin) {
      throw new Error('Only the creator or admin can delete this ticket')
    }

    await prisma.ticket.delete({ where: { id } })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'DELETE',
      entityType: 'ticket',
      entityId: id,
      entityLabel: ticket.title,
    })

    return { deleted: true }
  }
}
