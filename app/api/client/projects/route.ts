import { apiSuccess, Errors } from '@/lib/utils/api-response'
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
    if (subTeamCtx && !subTeamCtx.policy.projects) {
      return Errors.FORBIDDEN('Project access is restricted by policy')
    }

    const client = await prisma.client.findFirst({
      where: subTeamCtx
        ? { id: subTeamCtx.clientId }
        : { OR: [{ profileId: user.id }, { email: user.email }] },
    })

    if (!client) {
      return Errors.NOT_FOUND('Client')
    }

    const projects = await prisma.project.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
      include: {
        lead: { select: { name: true, email: true } },
        milestones: subTeamCtx && !subTeamCtx.policy.milestones
          ? false
          : {
              where: { clientVisible: true },
              select: { id: true, name: true, status: true, dueDate: true },
            },
        tasks: {
          where: { clientVisible: true },
          select: { id: true, title: true, status: true },
        },
      },
    })

    return apiSuccess(projects)
  } catch (error) {
    console.error('Client projects GET API error:', error)
    return Errors.INTERNAL('Failed to fetch client projects')
  }
}
