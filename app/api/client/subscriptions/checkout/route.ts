import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { getServerUser, isClient } from '@/lib/auth/server'
import { SubscriptionService } from '@/lib/services/subscription.service'
import { NextRequest } from 'next/server'
import { assertClientPolicy, resolveClientActor } from '@/lib/auth/access'

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isClient(user)) return Errors.UNAUTHORIZED()

  try {
    const { client, subTeam } = await resolveClientActor(user)
    assertClientPolicy(subTeam, 'subscriptions')

    const body = await request.json()
    const { planId } = body

    if (!planId) {
      return Errors.VALIDATION('planId is required')
    }

    const originUrl = request.headers.get('origin') || undefined
    const result = await SubscriptionService.checkoutSubscription(
      planId,
      user,
      client.id,
      originUrl
    )

    return apiSuccess(result)
  } catch (error: unknown) {
    console.error('Subscription checkout error:', error)
    return fromUnknownError(error, 'Failed to process subscription purchase')
  }
}
