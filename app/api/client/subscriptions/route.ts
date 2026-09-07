import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { getServerUser, isClient } from '@/lib/auth/server'
import { SubscriptionService } from '@/lib/services/subscription.service'
import { NextRequest } from 'next/server'
import { assertClientPolicy, resolveClientActor } from '@/lib/auth/access'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const { client, subTeam } = await resolveClientActor(user)
    assertClientPolicy(subTeam, 'subscriptions')

    const result = await SubscriptionService.getClientSubscriptionData(client.id)
    return apiSuccess(result)
  } catch (error: unknown) {
    console.error('Client subscriptions GET API error:', error)
    return fromUnknownError(error, 'Failed to fetch client subscriptions')
  }
}
