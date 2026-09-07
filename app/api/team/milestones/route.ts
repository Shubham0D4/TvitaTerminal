import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { getServerUser, isTeamMember, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { assertProjectAccess, staffAccessibleProjectIds } from '@/lib/auth/access'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || (!isTeamMember(user) && !isAdmin(user))) {
    return Errors.UNAUTHORIZED()
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId') || ''

  try {
    const where: { projectId?: string | { in: string[] } } = {}

    if (projectId) {
      await assertProjectAccess(user, projectId)
      where.projectId = projectId
    } else {
      const accessibleIds = await staffAccessibleProjectIds(user)
      if (accessibleIds) where.projectId = { in: accessibleIds }
    }

    const milestones = await prisma.milestone.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    })

    return apiSuccess(milestones)
  } catch (error) {
    console.error('Team milestones GET API error:', error)
    return fromUnknownError(error, 'Failed to fetch team milestones')
  }
}
