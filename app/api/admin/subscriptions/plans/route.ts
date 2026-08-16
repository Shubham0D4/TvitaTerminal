import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { SubscriptionService } from '@/application/services/subscription.service'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const result = await SubscriptionService.getPlansAndSubscriptions()
    return apiSuccess(result)
  } catch (error: any) {
    console.error('Admin subscription plans GET API error:', error)
    return Errors.INTERNAL('Failed to fetch subscription plans')
  }
}

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const body = await request.json()
    const plan = await SubscriptionService.createPlan(body)
    if (!plan) {
      return Errors.INTERNAL('Failed to create subscription plan')
    }

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'CREATE',
      entityType: 'plan',
      entityId: plan.id,
      entityLabel: plan.name,
      newValue: { price: plan.price, billingCycle: plan.billingCycle },
    })

    return apiSuccess(plan, 201)
  } catch (error: any) {
    console.error('Admin subscription plan POST API error:', error)
    if (error.name === 'ValidationError') {
      return Errors.VALIDATION(error.message)
    }
    return Errors.INTERNAL('Failed to create subscription plan')
  }
}

// Inline helper since writeAuditLog is imported from audit helper
import { writeAuditLog } from '@/lib/audit'
