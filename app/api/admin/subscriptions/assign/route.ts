import { apiSuccess, Errors } from '@/lib/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { SubscriptionStatus } from '@prisma/client'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const body = await request.json()
    const { clientId, planId, status = 'ACTIVE' } = body

    if (!clientId || !planId) {
      return Errors.VALIDATION('clientId and planId are required')
    }

    const [client, plan] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId } }),
      prisma.plan.findUnique({ where: { id: planId } }),
    ])

    if (!client || !plan) {
      return Errors.NOT_FOUND('Client or Plan')
    }

    const startDate = new Date()
    const endDate = new Date()
    if (plan.billingCycle === 'YEARLY') {
      endDate.setFullYear(endDate.getFullYear() + 1)
    } else {
      endDate.setMonth(endDate.getMonth() + 1)
    }

    await prisma.subscription.updateMany({
      where: { clientId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    })

    const subscription = await prisma.subscription.create({
      data: {
        clientId,
        planId,
        status: status as SubscriptionStatus,
        startDate,
        endDate,
      },
      include: { plan: true, client: true },
    })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'CREATE',
      entityType: 'subscription',
      entityId: subscription.id,
      entityLabel: `${client.name} → ${plan.name}`,
      newValue: { status, planName: plan.name },
    })

    return apiSuccess(subscription, 201)
  } catch (error) {
    console.error('Assign subscription API error:', error)
    return Errors.INTERNAL('Failed to assign subscription')
  }
}
