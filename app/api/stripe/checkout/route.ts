import { NextResponse } from 'next/server'
import { stripe } from '@/infrastructure/stripe'
import { getServerUser } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planId, billingCycle } = await req.json()

    const client = await prisma.client.findFirst({
      where: {
        OR: [{ profileId: user.id }, { email: user.email }],
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client account not found' }, { status: 404 })
    }

    // Mock pricing mapping for subscription tiers
    const priceAmount = planId === 'ENTERPRISE' ? 149900 : planId === 'PRO' ? 49900 : 19900

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Tvita Agency ${planId} Subscription`,
              description: `${billingCycle === 'ANNUAL' ? 'Annual' : 'Monthly'} Agency Plan`,
            },
            unit_amount: priceAmount,
            recurring: {
              interval: billingCycle === 'ANNUAL' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      customer_email: client.email || user.email,
      metadata: {
        clientId: client.id,
        planId,
        billingCycle,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client/billing?canceled=true`,
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (err: any) {
    console.error('Stripe Checkout Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
