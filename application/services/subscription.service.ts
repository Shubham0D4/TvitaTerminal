import { SubscriptionRepository } from '@/infrastructure/database/repositories/subscription.repository'
import { ClientRepository } from '@/infrastructure/database/repositories/client.repository'
import { subscriptionToDTO, planToDTO } from '@/contracts/dto/dto-mappers'
import { writeAuditLog } from '@/lib/audit'
import { sendSubscriptionActivatedEmail } from '@/infrastructure/email'
import { createNotification } from '@/lib/notifications'
import { ValidationError, NotFoundError } from '@/shared/errors/application-errors'
import { prisma } from '@/lib/prisma'

export class SubscriptionService {
  static async getPlansAndSubscriptions() {
    const [plans, subscriptions] = await Promise.all([
      SubscriptionRepository.findPlans(),
      SubscriptionRepository.findMany({
        include: {
          client: { select: { id: true, name: true, legalName: true } },
          plan: { select: { id: true, name: true, price: true, currency: true, billingCycle: true } },
        },
      }),
    ])

    return {
      plans: plans.map(planToDTO),
      subscriptions: subscriptions.map(subscriptionToDTO),
    }
  }

  static async assignPlanToClient(
    clientId: string,
    planId: string,
    actor: { id: string; email: string; role: string }
  ) {
    if (!clientId || !planId) {
      throw new ValidationError('clientId and planId are required')
    }

    const client = await ClientRepository.findClientById(clientId)
    if (!client) {
      throw new NotFoundError('Client not found')
    }

    const plan = await SubscriptionRepository.findPlanById(planId)
    if (!plan || !plan.isActive) {
      throw new NotFoundError('Plan not found or is inactive')
    }

    // Cancel existing active subscriptions
    await SubscriptionRepository.updateMany(
      { clientId, status: 'ACTIVE' },
      { status: 'CANCELLED', endDate: new Date() }
    )

    const startDate = new Date()
    const endDate = new Date()
    if (plan.billingCycle === 'YEARLY') {
      endDate.setFullYear(endDate.getFullYear() + 1)
    } else {
      endDate.setMonth(endDate.getMonth() + 1)
    }

    const subscription = await SubscriptionRepository.create({
      clientId,
      planId,
      status: 'ACTIVE',
      startDate,
      endDate,
      createdById: actor.id,
    })

    await writeAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'UPDATE',
      entityType: 'subscription',
      entityId: subscription.id,
      entityLabel: `Plan: ${plan.name}`,
      newValue: { clientId, planId, status: 'ACTIVE' },
    })

    return subscriptionToDTO(subscription)
  }

  static async cancelSubscription(id: string, actor: { id: string; email: string; role: string }) {
    const subscription = await SubscriptionRepository.findById(id, { plan: true })
    if (!subscription) {
      throw new NotFoundError('Subscription not found')
    }

    const updated = await SubscriptionRepository.update(id, {
      status: 'CANCELLED',
      endDate: new Date(),
    })

    await writeAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'UPDATE',
      entityType: 'subscription',
      entityId: id,
      entityLabel: `Cancel Plan: ${subscription.plan.name}`,
      oldValue: { status: subscription.status },
      newValue: { status: 'CANCELLED' },
    })

    return subscriptionToDTO(updated)
  }

  static async getSubscriptionDetails(id: string) {
    const subscription = await SubscriptionRepository.findById(id, {
      client: true,
      plan: true,
    })

    if (!subscription) {
      throw new NotFoundError('Subscription not found')
    }

    return subscriptionToDTO(subscription)
  }

  static async deleteSubscription(id: string, actor: { id: string; email: string; role: string }) {
    const subscription = await SubscriptionRepository.findById(id, { plan: true })
    if (!subscription) {
      throw new NotFoundError('Subscription not found')
    }

    await SubscriptionRepository.delete(id)

    await writeAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'DELETE',
      entityType: 'subscription',
      entityId: id,
      entityLabel: `Delete Plan: ${subscription.plan.name}`,
    })

    return { deleted: true }
  }

  static async createPlan(body: {
    name: string
    description?: string
    price: number
    currency?: string
    billingCycle: 'MONTHLY' | 'YEARLY'
    features: string[]
    isActive?: boolean
    clientId?: string
  }) {
    const { name, description, price, currency = 'INR', billingCycle, features, isActive = true, clientId } = body

    if (!name || price === undefined || !billingCycle) {
      throw new ValidationError('name, price, and billingCycle are required')
    }

    const isPrivate = Boolean(clientId)
    const plan = await prisma.plan.create({
      data: {
        name,
        description: description || null,
        price: Number(price),
        billingCycle,
        currency,
        isActive,
        isPrivate,
        clientId: clientId || null,
        features: Array.isArray(features) ? {
          create: features.map(f => ({ name: f }))
        } : undefined
      },
      include: {
        features: true
      }
    })

    return planToDTO(plan)
  }

  static async getClientSubscriptions(clientId: string) {
    const subscriptions = await SubscriptionRepository.findMany({
      where: { clientId },
      include: {
        plan: true,
      },
    })
    return subscriptions.map(subscriptionToDTO)
  }

  static async checkoutMockSubscription(
    planId: string,
    actor: { id: string; email: string; role: string },
    subTeamClientId?: string
  ) {
    if (!planId) {
      throw new ValidationError('planId is required')
    }

    const client = await ClientRepository.findClientForActor({
      userId: actor.id,
      email: actor.email,
      subTeamClientId,
    })

    if (!client) {
      throw new NotFoundError('Client organization not found')
    }

    const targetPlan = await SubscriptionRepository.findPlanById(planId)
    if (!targetPlan || !targetPlan.isActive) {
      throw new NotFoundError('Plan not found or inactive')
    }

    // Cancel existing active subscriptions
    await SubscriptionRepository.updateMany(
      { clientId: client.id, status: 'ACTIVE' },
      { status: 'CANCELLED', endDate: new Date() }
    )

    const startDate = new Date()
    const endDate = new Date()
    if (targetPlan.billingCycle === 'YEARLY') {
      endDate.setFullYear(endDate.getFullYear() + 1)
    } else {
      endDate.setMonth(endDate.getMonth() + 1)
    }

    const newSubscription = await SubscriptionRepository.create({
      clientId: client.id,
      planId: targetPlan.id,
      status: 'ACTIVE',
      startDate,
      endDate,
      createdById: actor.id,
    })

    // Email & in-app notification
    try {
      const formattedPrice = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(Number(targetPlan.price))

      await sendSubscriptionActivatedEmail({
        to: actor.email,
        clientName: client.name,
        planName: targetPlan.name,
        amount: formattedPrice,
        billingCycle: targetPlan.billingCycle.toLowerCase(),
      })

      await createNotification({
        userId: actor.id,
        title: 'Subscription Activated',
        message: `Your account is now subscribed to the ${targetPlan.name} plan.`,
        type: 'SUCCESS',
        entityType: 'Subscription',
        entityId: newSubscription.id,
      })
    } catch (e) {
      console.warn('Failed to send subscription confirmation:', e)
    }

    const fullSubscription = await SubscriptionRepository.findById(newSubscription.id, { plan: true })
    return subscriptionToDTO(fullSubscription!)
  }

  static async getClientSubscriptionData(clientId: string) {
    const [activeSubscription, availablePlans] = await Promise.all([
      prisma.subscription.findFirst({
        where: { clientId, status: 'ACTIVE' },
        include: { plan: { include: { features: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.plan.findMany({
        where: {
          isActive: true,
          OR: [
            { isPrivate: false },
            { clientId },
          ],
        },
        include: { features: true },
        orderBy: { price: 'asc' },
      }),
    ])

    return {
      activeSubscription: activeSubscription ? subscriptionToDTO(activeSubscription) : null,
      availablePlans: availablePlans.map(planToDTO),
    }
  }
}
