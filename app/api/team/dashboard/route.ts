import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { getServerUser, isTeamMember, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || (!isTeamMember(user) && !isAdmin(user))) {
    return Errors.UNAUTHORIZED()
  }

  try {
    // Lead / member project filter
    const projectWhere = isAdmin(user)
      ? {}
      : {
          OR: [
            { leadId: user.id },
            { members: { some: { profileId: user.id } } },
          ],
        }

    // 1. Fetch all dashboard data concurrently
    const [
      projects,
      allTasks,
      supportTickets,
      recentUpdates,
      taskActivities,
    ] = await Promise.all([
      prisma.project.findMany({
        where: projectWhere,
        orderBy: { updatedAt: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          lead: { select: { id: true, name: true, email: true } },
          members: {
            include: {
              profile: { select: { id: true, name: true, email: true, teamRole: true } },
            },
          },
          milestones: {
            orderBy: { dueDate: 'asc' },
            take: 3,
          },
        },
      }),
      prisma.task.findMany({
        where: { project: projectWhere },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
          developer: { select: { id: true, name: true, email: true } },
          tester: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.ticket.findMany({
        where: isAdmin(user)
          ? { project: projectWhere }
          : { project: { leadId: user.id } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { project: { select: { name: true } } },
      }),
      prisma.projectUpdate.findMany({
        where: { project: projectWhere },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { project: { select: { name: true } }, author: { select: { name: true } } },
      }),
      prisma.taskActivity.findMany({
        where: { task: { project: projectWhere } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          task: { select: { title: true, projectId: true } },
          actor: { select: { name: true } },
        },
      }),
    ])


    // Calculate Operational Metrics
    const now = new Date()
    const activeProjectsCount = projects.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'PLANNED').length
    const openTasks = allTasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
    const overdueTasks = openTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now)
    const blockedTasks = openTasks.filter((t) => t.status === 'BLOCKED')

    // Task Status Pipeline breakdown
    const taskBreakdown = {
      todo: allTasks.filter((t) => t.status === 'TODO').length,
      inProgress: allTasks.filter((t) => t.status === 'IN_PROGRESS').length,
      review: allTasks.filter((t) => t.status === 'READY_FOR_TESTING' || t.status === 'IN_TESTING' || t.status === 'CHANGES_REQUIRED').length,
      completed: allTasks.filter((t) => t.status === 'COMPLETED').length,
      blocked: blockedTasks.length,
    }

    return apiSuccess({
      stats: {
        activeProjectsCount,
        openTasksCount: openTasks.length,
        overdueTasksCount: overdueTasks.length,
        blockedTasksCount: blockedTasks.length,
        totalTasksCount: allTasks.length,
      },
      taskBreakdown,
      projects,
      allTasks,
      overdueTasks,
      blockedTasks,
      supportTickets,
      recentUpdates,
      taskActivities,
    })
  } catch (error) {
    console.error('Team dashboard GET API error:', error)
    return Errors.INTERNAL('Failed to fetch team dashboard operational data')
  }
}
