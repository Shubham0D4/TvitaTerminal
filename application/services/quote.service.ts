import { prisma } from '@/lib/prisma'
import { getClientSubTeamContext, AuthUser } from '@/lib/auth/server'
import { ValidationError, NotFoundError } from '@/shared/errors/application-errors'
import { writeAuditLog } from '@/lib/audit'

export class QuoteService {
  static async validateClientAccess(clientId: string, user: AuthUser) {
    if (user.role === 'ADMIN') return true

    if (user.role === 'CLIENT') {
      const subteam = await getClientSubTeamContext(user.id)
      if (subteam) {
        throw new Error('Client sub-teams are not authorized to view or manage quotes')
      }

      const primaryClient = await prisma.client.findFirst({
        where: { OR: [{ profileId: user.id }, { email: user.email }] },
        select: { id: true }
      })

      if (!primaryClient || primaryClient.id !== clientId) {
        throw new Error('Unauthorized client access')
      }
      return true
    }

    throw new Error('Unauthorized access')
  }

  static async getQuotesList(clientId: string | null | undefined, user: AuthUser) {
    if (user.role === 'ADMIN') {
      const where = clientId ? { clientId } : {}
      return prisma.quote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, email: true } }
        }
      })
    }

    if (user.role === 'CLIENT') {
      const subteam = await getClientSubTeamContext(user.id)
      if (subteam) {
        return [] // Sub-teams are completely restricted from quotes
      }

      const userClient = await prisma.client.findFirst({
        where: { OR: [{ profileId: user.id }, { email: user.email }] },
        select: { id: true }
      })

      if (!userClient) return []
      return prisma.quote.findMany({
        where: { clientId: userClient.id },
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, email: true } }
        }
      })
    }

    // Team members (role === TEAM_MEMBER) cannot see quotes at all
    return []
  }

  static async createQuote(
    body: { clientId?: string; title: string; description: string; budget: number; currency?: string; message?: string },
    user: AuthUser
  ) {
    let targetClientId = body.clientId

    if (user.role === 'CLIENT') {
      const subteam = await getClientSubTeamContext(user.id)
      if (subteam) {
        throw new ValidationError('Sub-teams are not authorized to create quotes')
      }

      const userClient = await prisma.client.findFirst({
        where: { OR: [{ profileId: user.id }, { email: user.email }] },
        select: { id: true }
      })
      if (!userClient) throw new ValidationError('Client account not found')
      targetClientId = userClient.id
    } else if (user.role !== 'ADMIN') {
      throw new ValidationError('Team members are not authorized to create quotes')
    }

    const { title, description, budget, currency = 'INR', message } = body
    if (!targetClientId || !title || !description || !budget) {
      throw new ValidationError('clientId, title, description, and budget are required')
    }

    const initialMessage = {
      senderRole: user.role,
      senderName: user.name || (user.role === 'ADMIN' ? 'Agency Admin' : 'Client'),
      status: 'PENDING',
      budget: Number(budget),
      text: message || '',
      timestamp: new Date().toISOString(),
    }

    const quote = await prisma.quote.create({
      data: {
        clientId: targetClientId,
        title,
        description,
        budget: Number(budget),
        currency,
        status: 'PENDING',
        counterMessage: message || null,
        lastCounterBy: user.role,
        messages: [initialMessage],
      },
      include: {
        client: { select: { id: true, name: true, email: true } }
      }
    })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'CREATE',
      entityType: 'quote',
      entityId: quote.id,
      entityLabel: title,
      newValue: { clientId: targetClientId, budget, currency, message },
    })

    return quote
  }

  static async updateQuote(
    id: string,
    body: { status?: string; counterBudget?: number; message?: string; adminNotes?: string },
    user: AuthUser
  ) {
    if (user.role === 'TEAM_MEMBER') {
      throw new Error('Team members are not authorized to update quotes')
    }

    const quote = await prisma.quote.findUnique({ where: { id } })
    if (!quote) throw new NotFoundError('Quote not found')

    await this.validateClientAccess(quote.clientId, user)

    const newStatus = body.status || quote.status
    const newCounterBudget = body.counterBudget !== undefined ? Number(body.counterBudget) : (quote.counterBudget ? Number(quote.counterBudget) : null)
    const msgText = body.message || body.adminNotes || ''

    const currentMessages = Array.isArray(quote.messages) ? (quote.messages as any[]) : []
    const newMessageEntry = {
      senderRole: user.role,
      senderName: user.name || (user.role === 'ADMIN' ? 'Agency Admin' : 'Client'),
      status: newStatus,
      counterBudget: newCounterBudget,
      text: msgText,
      timestamp: new Date().toISOString(),
    }

    const updatedMessages = [...currentMessages, newMessageEntry]

    const updateData: any = {
      status: newStatus,
      lastCounterBy: user.role,
      messages: updatedMessages,
    }

    if (body.counterBudget !== undefined) {
      updateData.counterBudget = Number(body.counterBudget)
    }

    if (msgText) {
      updateData.counterMessage = msgText
      if (user.role === 'ADMIN') {
        updateData.adminNotes = msgText
      }
    }

    const updated = await prisma.quote.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, name: true, email: true } }
      }
    })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'UPDATE',
      entityType: 'quote',
      entityId: id,
      entityLabel: updated.title,
      oldValue: { status: quote.status, counterBudget: quote.counterBudget },
      newValue: { status: updated.status, counterBudget: updated.counterBudget, message: msgText },
    })

    return updated
  }

  static async deleteQuote(id: string, user: AuthUser) {
    if (user.role !== 'ADMIN') throw new Error('Only administrators can delete quotes')

    const quote = await prisma.quote.findUnique({ where: { id } })
    if (!quote) throw new NotFoundError('Quote not found')

    await prisma.quote.delete({ where: { id } })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'DELETE',
      entityType: 'quote',
      entityId: id,
      entityLabel: quote.title,
    })

    return { deleted: true }
  }
}
