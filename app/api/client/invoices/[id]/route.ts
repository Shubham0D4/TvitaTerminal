import { apiSuccess, Errors } from '@/lib/api-response'
import { getClientSubTeamContext, getServerUser, isClient } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
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

    const client = await prisma.client.findFirst({
      where: subTeamCtx
        ? { id: subTeamCtx.clientId }
        : { OR: [{ profileId: user.id }, { email: user.email }] },
    })

    if (!client) {
      return Errors.NOT_FOUND('Client')
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, clientId: client.id },
      include: {
        project: { select: { id: true, name: true } },
      },
    })

    if (!invoice) {
      return Errors.NOT_FOUND('Invoice')
    }

    const settings = await prisma.appSettings.findFirst()

    return apiSuccess({ invoice, settings })
  } catch (error) {
    console.error('Client invoice GET API error:', error)
    return Errors.INTERNAL('Failed to fetch invoice details')
  }
}
