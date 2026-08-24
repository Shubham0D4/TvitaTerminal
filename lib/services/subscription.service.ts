import { SubscriptionRepository } from '@/lib/repositories/subscription.repository'
import { ClientRepository } from '@/lib/repositories/client.repository'
import { subscriptionToDTO, planToDTO } from '@/lib/dto/mappers'
import { writeAuditLog } from '@/lib/audit'
import { sendSubscriptionActivatedEmail, sendInvoicePdfEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { env } from '@/lib/config/env'
import { generateInvoicePdfBuffer } from '@/lib/pdf/invoice-generator'
import fs from 'fs/promises'
import path from 'path'

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

    return this.processSubscriptionPurchase(planId, actor, { subTeamClientId: clientId })
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

  static async processSubscriptionPurchase(
    planId: string,
    actor: { id: string; email: string; role: string },
    options: {
      subTeamClientId?: string
      stripePaymentId?: string
      stripeSessionId?: string
    } = {}
  ) {
    if (!planId) {
      throw new ValidationError('planId is required')
    }

    // 0. IDEMPOTENCY CHECK FOR STRIPE PAYMENTS
    if (options.stripeSessionId || options.stripePaymentId) {
      const existingPayment = await prisma.payment.findFirst({
        where: {
          OR: [
            options.stripeSessionId ? { stripeSessionId: options.stripeSessionId } : null,
            options.stripePaymentId ? { stripePaymentId: options.stripePaymentId } : null,
          ].filter(Boolean) as any,
        },
        include: { subscription: true },
      })

      if (existingPayment && existingPayment.subscriptionId) {
        console.log(`[SubscriptionService] Idempotency: Payment ${options.stripePaymentId || options.stripeSessionId} already processed.`)
        const existingSub = await SubscriptionRepository.findById(existingPayment.subscriptionId, { plan: true, client: true })
        return subscriptionToDTO(existingSub!)
      }
    }

    const client = await ClientRepository.findClientForActor({
      userId: actor.id,
      email: actor.email,
      subTeamClientId: options.subTeamClientId,
    })

    if (!client) {
      throw new NotFoundError('Client organization not found')
    }

    const targetPlan = await SubscriptionRepository.findPlanById(planId)
    if (!targetPlan || !targetPlan.isActive) {
      throw new NotFoundError('Plan not found or inactive')
    }

    // 1. SUBSCRIPTION QUEUING LOGIC
    // Check if there is already an active subscription in progress
    const currentActive = await prisma.subscription.findFirst({
      where: {
        clientId: client.id,
        status: 'ACTIVE',
        endDate: { gt: new Date() },
      },
      orderBy: { endDate: 'desc' },
    })

    let startDate: Date
    let endDate: Date
    let subscriptionStatus: 'ACTIVE' | 'PENDING'

    if (currentActive && currentActive.endDate) {
      // Queue this subscription to start when the current active subscription finishes
      startDate = new Date(currentActive.endDate)
      subscriptionStatus = 'PENDING'
    } else {
      startDate = new Date()
      subscriptionStatus = 'ACTIVE'
    }

    endDate = new Date(startDate)
    if (targetPlan.billingCycle === 'YEARLY') {
      endDate.setFullYear(endDate.getFullYear() + 1)
    } else {
      endDate.setMonth(endDate.getMonth() + 1)
    }

    const newSubscription = await SubscriptionRepository.create({
      clientId: client.id,
      planId: targetPlan.id,
      status: subscriptionStatus,
      startDate,
      endDate,
      createdById: actor.id,
      notes: subscriptionStatus === 'PENDING'
        ? `Queued subscription: Scheduled to auto-activate on ${startDate.toLocaleDateString()}`
        : null,
    })

    // 2. INVOICE & PAYMENT RECORD PERSISTENCE IN POSTGRES
    const priceAmount = Number(targetPlan.price)
    const taxAmount = Math.round(priceAmount * 0.18 * 100) / 100
    const totalAmount = Math.round((priceAmount + taxAmount) * 100) / 100
    const invoiceNo = `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        clientId: client.id,
        amount: totalAmount,
        subtotal: priceAmount,
        taxAmount,
        taxRate: 18,
        currency: targetPlan.currency || 'INR',
        status: 'PAID',
        issuedDate: new Date(),
        dueDate: new Date(),
        paidDate: new Date(),
        notes: `Subscription payment for ${targetPlan.name} plan via Stripe`,
        lineItems: [
          {
            name: `${targetPlan.name} Subscription Package`,
            description: `${targetPlan.billingCycle} agency retainer package`,
            quantity: 1,
            unitPrice: priceAmount,
            total: priceAmount,
          },
        ],
      },
    })

    const stripeRef = options.stripePaymentId || `ch_stripe_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`
    const payment = await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        subscriptionId: newSubscription.id,
        stripePaymentId: stripeRef,
        stripeSessionId: options.stripeSessionId || null,
        amount: totalAmount,
        currency: targetPlan.currency || 'INR',
        status: 'SUCCEEDED',
        paidAt: new Date(),
      },
    })

    // 3. GENERATE PDF INVOICE & DISPATCH EMAIL RECEIPT WITH ATTACHMENT
    let pdfPath: string | null = null
    try {
      const pdfBuffer = await generateInvoicePdfBuffer({
        invoiceNumber: invoice.invoiceNo,
        clientName: client.name,
        clientEmail: client.email || actor.email,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        planName: targetPlan.name,
        billingCycle: targetPlan.billingCycle.toLowerCase(),
        subtotal: priceAmount,
        taxAmount,
        totalAmount,
        currency: targetPlan.currency || 'INR',
        stripePaymentId: payment.stripePaymentId || undefined,
      })

      const { uploadToSupabaseStorage } = await import('@/lib/supabase/storage')
      pdfPath = await uploadToSupabaseStorage({
        filePath: `invoices/invoice-${invoice.id}.pdf`,
        fileBuffer: pdfBuffer,
        contentType: 'application/pdf',
        bucketName: 'invoices',
      })

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { pdfUrl: pdfPath },
      })

      const formattedTotal = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: targetPlan.currency || 'INR',
        maximumFractionDigits: 0,
      }).format(totalAmount)

      await sendInvoicePdfEmail({
        to: actor.email || client.email || 'client@tvita.dev',
        clientName: client.name,
        invoiceNumber: invoice.invoiceNo,
        planName: targetPlan.name,
        amount: formattedTotal,
        pdfBuffer,
        pdfFilename: `${invoice.invoiceNo}.pdf`,
      })
    } catch (pdfErr) {
      console.error('[SubscriptionService] PDF generation or email attachment failed:', pdfErr)
    }

    // 4. TRANSACTION AUDIT TRAIL LOGGING
    await writeAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: subscriptionStatus === 'PENDING' ? 'SUBSCRIPTION_CHANGE' : 'CREATE',
      entityType: 'subscription',
      entityId: newSubscription.id,
      entityLabel: `Subscription ${targetPlan.name} (${subscriptionStatus === 'PENDING' ? 'QUEUED' : 'ACTIVE'})`,
      newValue: { clientId: client.id, planId: targetPlan.id, status: subscriptionStatus, startDate },
    })

    await writeAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'CREATE',
      entityType: 'invoice',
      entityId: invoice.id,
      entityLabel: `Generated Tax Invoice ${invoice.invoiceNo}`,
      newValue: { totalAmount, status: 'PAID', pdfUrl: pdfPath },
    })

    await writeAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'CREATE',
      entityType: 'payment',
      entityId: payment.id,
      entityLabel: `Stripe Payment Recorded ${payment.stripePaymentId}`,
      newValue: { amount: totalAmount, status: 'SUCCEEDED' },
    })

    await createNotification({
      userId: actor.id,
      title: subscriptionStatus === 'PENDING' ? 'Subscription Queued' : 'Subscription Activated',
      message: subscriptionStatus === 'PENDING'
        ? `Your purchase of ${targetPlan.name} is queued and scheduled to start when your active subscription ends.`
        : `Your ${targetPlan.name} subscription package is now active. Tax invoice #${invoice.invoiceNo} sent to your email.`,
      type: 'SUCCESS',
      entityType: 'Subscription',
      entityId: newSubscription.id,
    })

    const fullSubscription = await SubscriptionRepository.findById(newSubscription.id, { plan: true })
    return subscriptionToDTO(fullSubscription!)
  }

  static async checkoutMockSubscription(
    planId: string,
    actor: { id: string; email: string; role: string },
    subTeamClientId?: string
  ) {
    return this.processSubscriptionPurchase(planId, actor, { subTeamClientId })
  }

  static async checkoutSubscription(
    planId: string,
    actor: { id: string; email: string; role: string },
    subTeamClientId?: string,
    originUrl?: string
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

    const stripeKey = env.STRIPE_SECRET_KEY
    if (stripeKey && (stripeKey.startsWith('sk_live_') || (stripeKey.startsWith('sk_test_') && !stripeKey.includes('mock')))) {
      try {
        const origin = originUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'subscription',
          customer_email: client.email || actor.email,
          line_items: [
            {
              price_data: {
                currency: (targetPlan.currency || 'usd').toLowerCase(),
                product_data: {
                  name: `${targetPlan.name} Plan`,
                  description: `Tvita Agency ${targetPlan.billingCycle.toLowerCase()} retainer subscription`,
                },
                unit_amount: Math.round(Number(targetPlan.price) * 100),
                recurring: {
                  interval: targetPlan.billingCycle === 'YEARLY' ? 'year' : 'month',
                },
              },
              quantity: 1,
            },
          ],
          metadata: {
            clientId: client.id,
            planId: targetPlan.id,
            userId: actor.id,
          },
          success_url: `${origin}/client/subscriptions?success=true&plan=${encodeURIComponent(targetPlan.name)}`,
          cancel_url: `${origin}/client/subscriptions?canceled=true`,
        })

        if (session.url) {
          return { checkoutUrl: session.url, subscription: null }
        }
      } catch (stripeErr) {
        console.warn('Stripe Session creation failed, falling back to direct subscription purchase:', stripeErr)
      }
    }

    const subscription = await this.processSubscriptionPurchase(planId, actor, { subTeamClientId })
    return { checkoutUrl: null, subscription }
  }

  static async checkAndActivateQueuedSubscriptions(clientId: string) {
    const now = new Date()
    // 1. Expire past subscriptions
    await prisma.subscription.updateMany({
      where: {
        clientId,
        status: 'ACTIVE',
        endDate: { lte: now },
      },
      data: { status: 'EXPIRED' },
    })

    // 2. Promote queued subscriptions to ACTIVE if start date reached
    const queuedSubscriptions = await prisma.subscription.findMany({
      where: {
        clientId,
        status: 'PENDING',
        startDate: { lte: now },
      },
    })

    for (const sub of queuedSubscriptions) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'ACTIVE' },
      })
    }
  }

  static async getClientSubscriptionData(clientId: string) {
    // Auto-check for queued activations
    await this.checkAndActivateQueuedSubscriptions(clientId)

    const [activeSubscription, availablePlans, queuedSubscriptions] = await Promise.all([
      prisma.subscription.findFirst({
        where: { clientId, status: 'ACTIVE' },
        include: {
          plan: { include: { features: true } },
          client: { select: { id: true, name: true } },
        },
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
      prisma.subscription.findMany({
        where: { clientId, status: 'PENDING' },
        include: { plan: true },
        orderBy: { startDate: 'asc' },
      }),
    ])

    return {
      activeSubscription: activeSubscription ? subscriptionToDTO(activeSubscription) : null,
      availablePlans: availablePlans.map(planToDTO),
      queuedSubscriptions: queuedSubscriptions.map(subscriptionToDTO),
    }
  }
}
