import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser, getClientSubTeamContext } from '@/lib/auth/server'
import { SubscriptionService } from '@/application/services/subscription.service'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  // Verify access for sub-teams
  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx && !subTeamCtx.policy.subscriptions) {
    return Errors.FORBIDDEN('Sub-team is not authorized to manage subscriptions')
  }

  try {
    const body = await request.json()
    const { planId } = body

    if (!planId) {
      return Errors.VALIDATION('planId is required')
    }

    const originUrl = request.headers.get('origin') || undefined
    const result = await SubscriptionService.checkoutSubscription(
      planId,
      user,
      subTeamCtx?.clientId,
      originUrl
    )

    return apiSuccess(result)
  } catch (error: any) {
    console.error('Subscription checkout error:', error)
    if (error.name === 'ValidationError') {
      return Errors.VALIDATION(error.message)
    }
    if (error.name === 'NotFoundError') {
      return Errors.NOT_FOUND(error.message)
    }
    return Errors.INTERNAL('Failed to process subscription purchase')
  }
}
