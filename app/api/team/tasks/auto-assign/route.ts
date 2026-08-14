import { apiSuccess, Errors } from '@/lib/api-response'
import { getServerUser } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const body = await request.json()
    const { projectId, role } = body

    if (!projectId || !role) {
      return Errors.VALIDATION('projectId and role are required')
    }

    const projectMembers = await prisma.projectMember.findMany({
      where: { projectId },
      include: { profile: true },
    })

    const eligibleProfiles = projectMembers
      .map((pm) => pm.profile)
      .filter((p) => p.isActive && p.teamRole === role)

    if (eligibleProfiles.length === 0) {
      const globalProfiles = await prisma.profile.findMany({
        where: { isActive: true, role: 'TEAM_MEMBER', teamRole: role },
      })
      eligibleProfiles.push(...globalProfiles)
    }

    if (eligibleProfiles.length === 0) {
      return apiSuccess({ assigneeId: null, message: 'No eligible team member found' })
    }

    let leastBusyProfileId: string | null = null
    let minActiveTasks = Infinity

    for (const candidate of eligibleProfiles) {
      const activeTasksCount = await prisma.task.count({
        where: {
          ...(role === 'DEVELOPER' ? { developerId: candidate.id } : { testerId: candidate.id }),
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
    return Errors.INTERNAL('Failed to find least busy member')
  }
}
