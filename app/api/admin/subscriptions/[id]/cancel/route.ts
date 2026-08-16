import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { SubscriptionService } from '@/application/services/subscription.service'
import { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const updated = await SubscriptionService.cancelSubscription(id, user)
    return apiSuccess(updated)
  } catch (error: any) {
    console.error('Cancel subscription API error:', error)
    if (error.name === 'NotFoundError') {
      return Errors.NOT_FOUND(error.message)
    }
    return Errors.INTERNAL('Failed to cancel subscription')
  }
}
