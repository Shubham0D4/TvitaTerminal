import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { getClientSubTeamContext, getServerUser, isClient } from '@/lib/auth/server'
import { ClientRepository } from '@/lib/repositories/client.repository'
import { InvoiceService } from '@/lib/services/invoice.service'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const subTeamCtx = await getClientSubTeamContext(user.id)
    if (subTeamCtx && !subTeamCtx.policy.invoices) {
      return Errors.FORBIDDEN('Financial data is restricted for sub-teams')
    }

    const client = await ClientRepository.findClientForActor({
      userId: user.id,
      email: user.email,
      subTeamClientId: subTeamCtx?.clientId,
    })

    if (!client) {
      return Errors.NOT_FOUND('Client')
    }

    const invoices = await InvoiceService.getClientInvoices(client.id)
    return apiSuccess(invoices)
  } catch (error: any) {
    console.error('Client invoices GET API error:', error)
    return Errors.INTERNAL('Failed to fetch client invoices')
  }
}
