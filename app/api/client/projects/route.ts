import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { getServerUser, isClient } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { assertClientPolicy, clientProjectWhere, hasClientPolicy, resolveClientActor } from '@/lib/auth/access'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const { client, subTeam } = await resolveClientActor(user)
    assertClientPolicy(subTeam, 'projects')

    const projects = await prisma.project.findMany({
      where: clientProjectWhere(client.id, subTeam),
      orderBy: { createdAt: 'desc' },
      include: {
        lead: { select: { name: true, email: true } },
        milestones: hasClientPolicy(subTeam, 'milestones')
          ? {
              where: { clientVisible: true },
              select: { id: true, name: true, status: true, dueDate: true },
            }
          : false,
        tasks: {
          where: { clientVisible: true },
          select: { id: true, title: true, status: true },
        },
      },
    })

    return apiSuccess(projects)
  } catch (error) {
    console.error('Client projects GET API error:', error)
    return fromUnknownError(error, 'Failed to fetch client projects')
  }
}
