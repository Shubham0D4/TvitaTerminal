import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser, isTeamMember, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || (!isTeamMember(user) && !isAdmin(user))) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const projects = await prisma.project.findMany({
      where: isAdmin(user)
        ? {}
        : {
            OR: [
              { leadId: user.id },
              { members: { some: { profileId: user.id } } },
            ],
          },
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { name: true, legalName: true } },
        lead: { select: { name: true, email: true } },
        members: { include: { profile: { select: { name: true, email: true, teamRole: true } } } },
        _count: { select: { tasks: true, milestones: true } },
      },
    })

    return apiSuccess(projects)
  } catch (error) {
    console.error('Team projects GET API error:', error)
    return Errors.INTERNAL('Failed to fetch team projects')
  }
}
