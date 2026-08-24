import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { getServerUser, isTeamMember, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || (!isTeamMember(user) && !isAdmin(user))) {
    return Errors.UNAUTHORIZED()
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId') || ''

  try {
    const where: any = {}
    if (projectId) where.projectId = projectId

    if (!isAdmin(user) && user.teamRole !== 'TEAM_LEAD') {
      where.OR = [
        { assigneeId: user.id },
        { project: { leadId: user.id } },
        { project: { members: { some: { profileId: user.id } } } },
      ]
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
    return Errors.INTERNAL('Failed to fetch team milestones')
  }
}
