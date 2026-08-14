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
    const client = await prisma.client.findFirst({
      where: subTeamCtx
        ? { id: subTeamCtx.clientId }
        : { OR: [{ profileId: user.id }, { email: user.email }] },
    })

    if (!client) {
      return Errors.NOT_FOUND('Client account')
    }

    const isSubTeam = Boolean(subTeamCtx)
    const policy = subTeamCtx?.policy || {
      projects: true,
      milestones: true,
      approvals: true,
      invoices: false,
      subscriptions: false,
      billing: false,
    }

    const [projectsCount, invoicesCount, pendingApprovalsCount, projects] = await Promise.all([
      prisma.project.count({ where: { clientId: client.id } }),
      policy.invoices ? prisma.invoice.count({ where: { clientId: client.id } }) : Promise.resolve(0),
      policy.approvals ? prisma.clientApproval.count({ where: { clientId: client.id, status: 'PENDING' } }) : Promise.resolve(0),
      policy.projects
        ? prisma.project.findMany({
            where: { clientId: client.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              lead: { select: { name: true, email: true } },
              milestones: policy.milestones
                ? {
                    where: { clientVisible: true },
                    select: { id: true, name: true, status: true },
                  }
                : false,
            },
          })
        : Promise.resolve([]),
    ])

    return apiSuccess({
      stats: {
        projectsCount,
        invoicesCount,
        pendingApprovalsCount,
      },
      projects,
      isSubTeam,
      policy,
    })
  } catch (error) {
    console.error('Client dashboard GET API error:', error)
    return Errors.INTERNAL('Failed to fetch client dashboard metrics')
  }
}
