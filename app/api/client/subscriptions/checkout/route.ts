import { apiSuccess, Errors } from '@/lib/api-response'
import { getServerUser, getClientSubTeamContext } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { sendSubscriptionActivatedEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
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

    // Resolve client
    const client = await prisma.client.findFirst({
      where: subTeamCtx
        ? { id: subTeamCtx.clientId }
        : { OR: [{ profileId: user.id }, { email: user.email }] },
      include: {
        subscriptions: { where: { status: 'ACTIVE' } },
      },
    })

    if (!client) {
      return Errors.NOT_FOUND('Client organization not found')
    }

    const targetPlan = await prisma.plan.findUnique({
      where: { id: planId },
    })

    if (!targetPlan || !targetPlan.isActive) {
      return Errors.NOT_FOUND('Plan not found or inactive')
    }

    // 1. Deactivate existing active subscriptions
    if (client.subscriptions.length > 0) {
      await prisma.subscription.updateMany({
        where: { clientId: client.id, status: 'ACTIVE' },
        data: { status: 'CANCELLED', endDate: new Date() },
      })
    }

    // 2. Create new active subscription
    const startDate = new Date()
    const endDate = new Date()
    if (targetPlan.billingCycle === 'YEARLY') {
      endDate.setFullYear(endDate.getFullYear() + 1)
    } else {
      endDate.setMonth(endDate.getMonth() + 1)
    }

    const newSubscription = await prisma.subscription.create({
      data: {
        clientId: client.id,
        planId: targetPlan.id,
        status: 'ACTIVE',
        startDate,
        endDate,
        createdById: user.id,
      },
      include: {
        plan: true,
      },
    })

    // 3. Send email confirmation & in-app notification
    try {
      const formattedPrice = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(Number(targetPlan.price))

      await sendSubscriptionActivatedEmail({
        to: user.email,
        clientName: client.name,
        planName: targetPlan.name,
        amount: formattedPrice,
        billingCycle: targetPlan.billingCycle.toLowerCase(),
      })

      await createNotification({
        userId: user.id,
        title: 'Subscription Activated',
        message: `Your account is now subscribed to the ${targetPlan.name} plan.`,
        type: 'SUCCESS',
        entityType: 'Subscription',
        entityId: newSubscription.id,
      })
    } catch (e) {
      console.warn('Failed to send subscription email/notification:', e)
    }

    return apiSuccess(newSubscription)
  } catch (error) {
    console.error('Subscription checkout error:', error)
    return Errors.INTERNAL('Failed to process subscription purchase')
  }
}
