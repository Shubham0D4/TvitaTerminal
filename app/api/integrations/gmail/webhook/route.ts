import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { verifyThirdPartyAuth } from '@/lib/auth/server'
import { GmailIntegrationService } from '@/infrastructure/integrations'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  if (!verifyThirdPartyAuth(request)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const body = await request.json()
    const { emailAddress, historyId } = body

    const result = await GmailIntegrationService.processWebhookEvent({
      emailAddress: emailAddress || 'system',
      historyId: String(historyId || Date.now()),
    })

    return apiSuccess(result)
  } catch (error) {
    console.error('Gmail webhook API error:', error)
    return Errors.INTERNAL('Failed to process Gmail webhook')
  }
}
