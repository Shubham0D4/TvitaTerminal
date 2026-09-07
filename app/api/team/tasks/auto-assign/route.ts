import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { getServerUser, isTeamMember, isAdmin } from '@/lib/auth/server'
import { assertProjectAccess } from '@/lib/auth/access'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user || (!isTeamMember(user) && !isAdmin(user))) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const body = await request.json()
    const { projectId, role } = body

    if (!projectId || !role) {
      return Errors.VALIDATION('projectId and role are required')
    }

    await assertProjectAccess(user, projectId)

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { leadId: true },
    })

    const projectMembers = await prisma.projectMember.findMany({
      where: { projectId },
      include: { profile: true },
    })

    const eligibleProfiles = projectMembers
      .map((pm) => pm.profile)
      .filter((p) => p.isActive && (role === 'MEMBER' || role === 'TEAM_LEAD' ? p.teamRole === role : true))

    if (project?.leadId) {
      const leadProfile = await prisma.profile.findUnique({ where: { id: project.leadId } })
      if (leadProfile?.isActive && !eligibleProfiles.some((p) => p.id === leadProfile.id)) {
        eligibleProfiles.push(leadProfile)
      }
    }

    if (eligibleProfiles.length === 0) {
      return apiSuccess({ assigneeId: null, message: 'No eligible team member found' })
    }

    let leastBusyProfileId: string | null = null
    let minActiveTasks = Infinity

    for (const candidate of eligibleProfiles) {
      const activeTasksCount = await prisma.task.count({
        where: {
          OR: [{ developerId: candidate.id }, { testerId: candidate.id }],
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      })

      if (activeTasksCount < minActiveTasks) {
        minActiveTasks = activeTasksCount
        leastBusyProfileId = candidate.id
      }
    }

    return apiSuccess({ assigneeId: leastBusyProfileId })
  } catch (error) {
    console.error('Auto assign API error:', error)
    return fromUnknownError(error, 'Failed to find least busy member')
  }
}
