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
    const [assignedTasksCount, completedTasksCount, activeProjectsCount, assignedTasks, assignedProjects] = await Promise.all([
      prisma.task.count({
        where: { OR: [{ developerId: user.id }, { testerId: user.id }, { assigneeId: user.id }] },
      }),
      prisma.task.count({
        where: {
          OR: [{ developerId: user.id }, { testerId: user.id }, { assigneeId: user.id }],
          status: 'COMPLETED',
        },
      }),
      prisma.project.count({
        where: {
          OR: [
            { leadId: user.id },
            { members: { some: { profileId: user.id } } },
          ],
        },
      }),
      prisma.task.findMany({
        where: { OR: [{ developerId: user.id }, { testerId: user.id }, { assigneeId: user.id }] },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          project: { select: { name: true } },
          milestone: { select: { name: true } },
        },
      }),
      prisma.project.findMany({
        where: {
          OR: [
            { leadId: user.id },
            { members: { some: { profileId: user.id } } },
          ],
        },
        include: {
          client: { select: { name: true } },
          _count: { select: { tasks: true, milestones: true } },
        },
      }),
    ])

    return apiSuccess({
      stats: {
        assignedTasksCount,
        completedTasksCount,
        activeProjectsCount,
      },
      assignedTasks,
      assignedProjects,
    })
  } catch (error) {
    console.error('Team dashboard GET API error:', error)
    return Errors.INTERNAL('Failed to fetch team dashboard data')
  }
}
