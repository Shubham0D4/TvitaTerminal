import { apiSuccess, Errors } from '@/lib/api-response'
import { getClientSubTeamContext, getServerUser, isClient } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const subTeamCtx = await getClientSubTeamContext(user.id)
    if (subTeamCtx && !subTeamCtx.policy.invoices) {
      return Errors.FORBIDDEN('Financial data is restricted for sub-teams')
    }

    const client = await prisma.client.findFirst({
      where: subTeamCtx
        ? { id: subTeamCtx.clientId }
        : { OR: [{ profileId: user.id }, { email: user.email }] },
    })

    if (!client) {
      return Errors.NOT_FOUND('Client')
    }

    const invoices = await prisma.invoice.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
      },
    })

    return apiSuccess(invoices)
  } catch (error) {
    console.error('Client invoices GET API error:', error)
    return Errors.INTERNAL('Failed to fetch client invoices')
  }
}
