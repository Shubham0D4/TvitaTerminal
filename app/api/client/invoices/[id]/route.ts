import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { getServerUser, isClient } from '@/lib/auth/server'
import { InvoiceService } from '@/lib/services/invoice.service'
import { NextRequest } from 'next/server'
import { assertClientPolicy, resolveClientActor } from '@/lib/auth/access'

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
    const { client, subTeam } = await resolveClientActor(user)
    assertClientPolicy(subTeam, 'invoices', 'billing')

    const result = await InvoiceService.getInvoiceDetails(id)
    if (!result.invoice) {
      return Errors.NOT_FOUND('Invoice')
    }
    if (result.invoice.clientId !== client.id) {
      return Errors.FORBIDDEN()
    }
    if (result.invoice.status === 'DRAFT') {
      return Errors.NOT_FOUND('Invoice')
    }

    const allowed = subTeam?.allowedProjectIds ?? []
    const projectId = result.invoice.projectId as string | null | undefined
    if (allowed.length > 0 && projectId && !allowed.includes(projectId)) {
      return Errors.FORBIDDEN()
    }

    return apiSuccess(result)
  } catch (error: unknown) {
    console.error('Client invoice GET API error:', error)
    return fromUnknownError(error, 'Failed to fetch invoice details')
  }
}
