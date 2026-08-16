import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { SubscriptionService } from '@/application/services/subscription.service'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const body = await request.json()
    const { clientId, planId } = body

    const subscription = await SubscriptionService.assignPlanToClient(clientId, planId, user)
    return apiSuccess(subscription, 201)
  } catch (error: any) {
    console.error('Assign subscription API error:', error)
    if (error.name === 'ValidationError') {
      return Errors.VALIDATION(error.message)
    }
    if (error.name === 'NotFoundError') {
      return Errors.NOT_FOUND(error.message)
    }
    return Errors.INTERNAL('Failed to assign subscription')
  }
}
