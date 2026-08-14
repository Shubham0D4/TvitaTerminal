import { apiSuccess, Errors } from '@/lib/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { BillingCycle } from '@prisma/client'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const [plans, subscriptions] = await Promise.all([
      prisma.plan.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          features: true,
          client: { select: { name: true } },
          _count: { select: { subscriptions: true } },
        },
      }),
      prisma.subscription.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, legalName: true } },
          plan: { select: { id: true, name: true, price: true, billingCycle: true } },
        },
      }),
    ])

    return apiSuccess({ plans, subscriptions })
  } catch (error) {
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
    const { name, description, price, billingCycle = 'MONTHLY', currency = 'INR', clientId, features } = body

    if (!name || price === undefined) {
      return Errors.VALIDATION('Plan name and price are required')
    }

    const isPrivate = Boolean(clientId)
    const plan = await prisma.plan.create({
      data: {
        name,
        description: description || null,
        price: Number(price),
        billingCycle: billingCycle as BillingCycle,
        currency,
        isActive: true,
        isPrivate,
        clientId: clientId || null,
      },
    })

    if (Array.isArray(features) && features.length > 0) {
      await prisma.planFeature.createMany({
        data: features.map((feature: string) => ({
          planId: plan.id,
          name: feature,
        })),
      })
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
  } catch (error) {
    console.error('Admin subscription plan POST API error:', error)
    return Errors.INTERNAL('Failed to create subscription plan')
  }
}
