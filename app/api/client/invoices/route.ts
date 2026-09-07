import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { getServerUser, isClient } from '@/lib/auth/server'
import { InvoiceService } from '@/lib/services/invoice.service'
import { NextRequest } from 'next/server'
import {
  assertClientPolicy,
  clientInvoiceWhere,
  resolveClientActor,
} from '@/lib/auth/access'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const { client, subTeam } = await resolveClientActor(user)
    assertClientPolicy(subTeam, 'invoices', 'billing')

    const invoices = await InvoiceService.getClientInvoices(clientInvoiceWhere(client.id, subTeam))
    return apiSuccess(invoices)
  } catch (error: unknown) {
    console.error('Client invoices GET API error:', error)
    return fromUnknownError(error, 'Failed to fetch client invoices')
  }
}
