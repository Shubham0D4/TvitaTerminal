import { NextResponse } from 'next/server'
import { getServerUser, getClientSubTeamContext, isClient, isAdmin } from '@/lib/auth/server'
import { SubscriptionService } from '@/lib/services/subscription.service'
import { assertClientPolicy } from '@/lib/auth/access'

export async function POST(req: Request) {
  try {
    const user = await getServerUser()
    if (!user || (!isClient(user) && !isAdmin(user))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planId } = await req.json()
    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    const subTeamCtx = isClient(user) ? await getClientSubTeamContext(user.id) : null
    if (isClient(user)) {
      try {
        assertClientPolicy(subTeamCtx, 'subscriptions')
      } catch {
        return NextResponse.json({ error: 'Sub-team is not authorized to manage subscriptions' }, { status: 403 })
      }
    }

    const originUrl = req.headers.get('origin') || undefined
    const result = await SubscriptionService.checkoutSubscription(
      planId,
      user,
      subTeamCtx?.clientId,
      originUrl
    )

    return NextResponse.json({ data: result, sessionId: null, url: result.checkoutUrl })
  } catch (err: any) {
    console.error('Stripe Checkout Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
