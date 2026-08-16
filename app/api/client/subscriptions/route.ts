import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getClientSubTeamContext, getServerUser, isClient } from '@/lib/auth/server'
import { ClientRepository } from '@/infrastructure/database/repositories/client.repository'
import { SubscriptionService } from '@/application/services/subscription.service'
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

    const client = await ClientRepository.findClientForActor({
      userId: user.id,
      email: user.email,
      subTeamClientId: subTeamCtx?.clientId,
    })

    if (!client) {
      return Errors.NOT_FOUND('Client')
    }

    const result = await SubscriptionService.getClientSubscriptionData(client.id)
    return apiSuccess(result)
  } catch (error: any) {
    console.error('Client subscriptions GET API error:', error)
    return Errors.INTERNAL('Failed to fetch client subscriptions')
  }
}
