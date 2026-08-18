import { NextResponse } from 'next/server'
import { stripe } from '@/infrastructure/stripe'
import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/lib/audit'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  let event: any

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } else {
      event = JSON.parse(body)
    }
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  // Handle relevant subscription events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const clientId = session.metadata?.clientId
      const planId = session.metadata?.planId
      const userId = session.metadata?.userId || 'stripe-webhook'

      if (clientId) {
        await prisma.client.update({
          where: { id: clientId },
          data: { status: 'ACTIVE' },
        })

        if (planId) {
          const { SubscriptionService } = await import('@/application/services/subscription.service')
          await SubscriptionService.processSubscriptionPurchase(
            planId,
            {
              id: userId,
              email: session.customer_email || 'stripe-webhook@tvita.com',
              role: 'CLIENT',
            },
            {
              subTeamClientId: clientId,
              stripePaymentId: (typeof session.payment_intent === 'string' ? session.payment_intent : null) || session.id,
              stripeSessionId: session.id,
            }
          )
        }

        await writeAuditLog({
          actorId: userId,
          actorEmail: session.customer_email || 'system@stripe.com',
          actorRole: 'SYSTEM',
          action: 'UPDATE',
          entityType: 'subscription',
          entityId: clientId,
          entityLabel: `Stripe Subscription Checkout Completed: ${planId}`,
        })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object
      const stripeSubId = stripeSub.id

      if (stripeSubId) {
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubId },
        })

        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'CANCELLED', endDate: new Date() },
          })

          await writeAuditLog({
            actorId: 'system',
            actorEmail: 'stripe-webhook@tvita.com',
            actorRole: 'SYSTEM',
            action: 'UPDATE',
            entityType: 'subscription',
            entityId: sub.id,
            entityLabel: `Stripe Subscription Cancelled (Stripe Sub ID: ${stripeSubId})`,
            newValue: { status: 'CANCELLED' },
          })
        }
      }
      break
    }

    case 'customer.subscription.updated': {
      const stripeSub = event.data.object
      const stripeSubId = stripeSub.id
      const status = stripeSub.status // 'active', 'canceled', 'past_due', etc.

      if (stripeSubId) {
        const mappedStatus = status === 'active' ? 'ACTIVE' : status === 'canceled' ? 'CANCELLED' : 'EXPIRED'
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubId },
        })

        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: mappedStatus },
          })
        }
      }
      break
    }

    default:
      console.log(`Unhandled Stripe event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
