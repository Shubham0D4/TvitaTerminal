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
    const { to, subject, bodyHtml } = body

    if (!to || !subject || !bodyHtml) {
      return Errors.VALIDATION('to, subject, and bodyHtml are required')
    }

    const result = await GmailIntegrationService.sendMail({ to, subject, bodyHtml })
    return apiSuccess({ sent: result })
  } catch (error) {
    console.error('Gmail send API error:', error)
    return Errors.INTERNAL('Failed to send email via Gmail integration')
  }
}
