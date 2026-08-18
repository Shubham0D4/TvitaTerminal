import { prisma } from '@/lib/prisma'
import { getClientSubTeamContext, AuthUser } from '@/lib/auth/server'
import { ValidationError, NotFoundError } from '@/shared/errors/application-errors'
import { writeAuditLog } from '@/lib/audit'

export class QuoteService {
  static async validateClientAccess(clientId: string, user: AuthUser) {
    if (user.role === 'ADMIN' || user.role === 'TEAM_MEMBER') return true

    if (user.role === 'CLIENT') {
      const subteam = await getClientSubTeamContext(user.id)
      const userClientId = subteam ? subteam.clientId : (await prisma.client.findFirst({
        where: { OR: [{ profileId: user.id }, { email: user.email }] },
        select: { id: true }
      }))?.id

      if (!userClientId || userClientId !== clientId) {
        throw new Error('Unauthorized client access')
      }
      return true
    }

    throw new Error('Unauthorized')
  }

  static async getQuotesList(clientId: string, user: AuthUser) {
    await this.validateClientAccess(clientId, user)
    return prisma.quote.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' }
    })
  }

  static async createQuote(
    body: { clientId: string; title: string; description: string; budget: number; currency?: string },
    user: AuthUser
  ) {
    if (user.role !== 'ADMIN') throw new Error('Only administrators can issue quotes')

    const { clientId, title, description, budget, currency = 'INR' } = body
    if (!clientId || !title || !description || !budget) {
      throw new ValidationError('clientId, title, description, and budget are required')
    }

    const quote = await prisma.quote.create({
      data: {
        clientId,
        title,
        description,
        budget,
        currency,
        status: 'PENDING',
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
      newValue: { clientId, budget, currency },
    })

    return quote
  }

  static async updateQuote(
    id: string,
    body: { status?: string; counterBudget?: number; adminNotes?: string },
    user: AuthUser
  ) {
    const quote = await prisma.quote.findUnique({ where: { id } })
    if (!quote) throw new NotFoundError('Quote not found')

    await this.validateClientAccess(quote.clientId, user)

    const updateData: any = {}
    if (user.role === 'ADMIN') {
      if (body.status) updateData.status = body.status
      if (body.adminNotes !== undefined) updateData.adminNotes = body.adminNotes
    } else if (user.role === 'CLIENT') {
      if (body.status) {
        if (!['ACCEPTED', 'REJECTED', 'COUNTER_OFFERED'].includes(body.status)) {
          throw new ValidationError('Invalid status change for client')
        }
        updateData.status = body.status
      }
      if (body.counterBudget !== undefined) {
        updateData.counterBudget = body.counterBudget
      }
    }

    const updated = await prisma.quote.update({
      where: { id },
      data: updateData
    })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'UPDATE',
      entityType: 'quote',
      entityId: id,
      entityLabel: updated.title,
      oldValue: { status: quote.status },
      newValue: { status: updated.status },
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
