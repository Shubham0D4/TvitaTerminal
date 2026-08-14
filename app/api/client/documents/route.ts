import { apiSuccess, Errors } from '@/lib/api-response'
import { getClientSubTeamContext, getServerUser, isClient } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const subTeamCtx = await getClientSubTeamContext(user.id)
    if (subTeamCtx && subTeamCtx.policy.documents === false) {
      return Errors.FORBIDDEN('Document access is restricted for sub-teams')
    }
    const client = await prisma.client.findFirst({
      where: subTeamCtx
        ? { id: subTeamCtx.clientId }
        : { OR: [{ profileId: user.id }, { email: user.email }] },
    })

    if (!client) {
      return Errors.NOT_FOUND('Client')
    }

    const documents = await prisma.document.findMany({
      where: {
        clientId: client.id,
        visibility: 'CLIENT_VISIBLE',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
      },
    })

    return apiSuccess(documents)
  } catch (error) {
    console.error('Client documents GET API error:', error)
    return Errors.INTERNAL('Failed to fetch client documents')
  }
}
