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

    const project = await prisma.project.findFirst({
      where: { id, clientId: client.id },
      include: {
        lead: { select: { name: true, email: true } },
        milestones: subTeamCtx && !subTeamCtx.policy.milestones
          ? false
          : {
              where: { clientVisible: true },
              orderBy: { sortOrder: 'asc' },
            },
        tasks: {
          where: { clientVisible: true },
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, status: true, priority: true, dueDate: true },
        },
        approvals: subTeamCtx && !subTeamCtx.policy.approvals
          ? false
          : { orderBy: { createdAt: 'desc' } },
        updates: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { name: true } } },
        },
        documents: {
          where: { visibility: 'CLIENT_VISIBLE' },
        },
      },
    })

    if (!project) {
      return Errors.NOT_FOUND('Project')
    }

    return apiSuccess(project)
  } catch (error) {
    console.error('Client project GET API error:', error)
    return Errors.INTERNAL('Failed to fetch project detail')
  }
}
