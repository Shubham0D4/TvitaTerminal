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
    if (subTeamCtx && !subTeamCtx.policy.subscriptions) {
      return Errors.FORBIDDEN('Subscription data is restricted for sub-teams')
    }

    const client = await prisma.client.findFirst({
      where: subTeamCtx
        ? { id: subTeamCtx.clientId }
        : { OR: [{ profileId: user.id }, { email: user.email }] },
    })

    if (!client) {
      return Errors.NOT_FOUND('Client')
    }

    const [activeSubscription, availablePlans] = await Promise.all([
      prisma.subscription.findFirst({
        where: { clientId: client.id, status: 'ACTIVE' },
        include: { plan: { include: { features: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.plan.findMany({
        where: {
          isActive: true,
          OR: [
            { isPrivate: false },
            { clientId: client.id },
          ],
        },
        include: { features: true },
        orderBy: { price: 'asc' },
      }),
    ])

    return apiSuccess({
      activeSubscription,
      availablePlans,
    })
  } catch (error) {
    console.error('Client subscriptions GET API error:', error)
    return Errors.INTERNAL('Failed to fetch client subscriptions')
  }
}
