import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { verifyThirdPartyAuth } from '@/lib/auth/server'
import { WebhookService } from '@/lib/integrations'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  if (!verifyThirdPartyAuth(request)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const body = await request.json()
    const result = await WebhookService.handleIncomingWebhook({
      id: body.id || `evt_${Date.now()}`,
      provider: body.provider || 'generic',
      event: body.event || 'notification',
      timestamp: new Date().toISOString(),
      data: body.data || body,
    })

    return apiSuccess(result)
  } catch (error) {
    console.error('Incoming webhook error:', error)
    return Errors.INTERNAL('Failed to process incoming webhook')
  }
}
