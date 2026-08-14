import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
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

      if (clientId) {
        // Activate client subscription in database
        await prisma.client.update({
          where: { id: clientId },
          data: {
            status: 'ACTIVE',
          },
        })

        await writeAuditLog({
          actorId: 'stripe-webhook',
          actorEmail: 'system@stripe.com',
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
      const subscription = event.data.object
      // Handle subscription cancellation
      break
    }
    default:
      console.log(`Unhandled Stripe event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
