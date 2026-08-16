import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getClientSubTeamContext, getServerUser, isClient } from '@/lib/auth/server'
import { ClientRepository } from '@/infrastructure/database/repositories/client.repository'
import { InvoiceService } from '@/application/services/invoice.service'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || !isClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

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

    const result = await InvoiceService.getInvoiceDetails(id)
    if (!result.invoice) {
      return Errors.NOT_FOUND('Invoice')
    }
    if (result.invoice.clientId !== client.id) {
      return Errors.UNAUTHORIZED()
    }

    return apiSuccess(result)
  } catch (error: any) {
    console.error('Client invoice GET API error:', error)
    if (error.name === 'NotFoundError') {
      return Errors.NOT_FOUND(error.message)
    }
    return Errors.INTERNAL('Failed to fetch invoice details')
  }
}
