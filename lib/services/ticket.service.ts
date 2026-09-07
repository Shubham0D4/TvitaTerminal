import { prisma } from '@/lib/prisma'
import { AuthUser } from '@/lib/auth/server'
import { ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors'
import { writeAuditLog } from '@/lib/audit'
import { assertProjectAccess, isProjectManager, redactAgencyPersonForClient } from '@/lib/auth/access'

export class TicketService {
  static async validateProjectAccess(projectId: string, user: AuthUser) {
    return assertProjectAccess(user, projectId, { clientPolicy: 'issues' })
  }

  static async getTicketsList(projectId: string, user: AuthUser) {
    const project = await this.validateProjectAccess(projectId, user)
    if (user.role === 'TEAM_MEMBER' && !isProjectManager(user, project)) {
      return []
    }

    const tickets = await prisma.ticket.findMany({
      where: { projectId },
      include: {
        creator: { select: { id: true, name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (user.role === 'CLIENT') {
      return tickets.map((ticket) => ({
        ...ticket,
        creator: redactAgencyPersonForClient(ticket.creator, project.leadId),
      }))
    }

    return tickets
  }

  static async createTicket(body: { projectId: string; title: string; description?: string; priority?: string }, user: AuthUser) {
    const { projectId, title, description = '', priority = 'MEDIUM' } = body
    if (!title) {
      throw new ValidationError('Title is required')
    }
    const project = await this.validateProjectAccess(projectId, user)
    if (user.role === 'TEAM_MEMBER' && !isProjectManager(user, project)) {
      throw new AuthorizationError('Only the client, project lead, or an admin can raise tickets')
    }

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

    if (project.leadId) {
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

    const project = await this.validateProjectAccess(ticket.projectId, user)
    if (!isProjectManager(user, project)) {
      throw new AuthorizationError('Only the project lead or an admin can update tickets')
    }

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

    const project = await this.validateProjectAccess(ticket.projectId, user)

    const canManage = isProjectManager(user, project)
    const isCreator = ticket.creatorId === user.id

    if (!isCreator && !canManage) {
      throw new AuthorizationError('Only the creator or project lead can delete this ticket')
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
