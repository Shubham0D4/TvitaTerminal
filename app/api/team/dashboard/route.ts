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
    // Lead / member project filter
    const projectWhere = isAdmin(user)
      ? {}
      : {
          OR: [
            { leadId: user.id },
            { members: { some: { profileId: user.id } } },
          ],
        }

    // 1. Fetch Projects
    const projects = await prisma.project.findMany({
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
    })

    const projectIds = projects.map((p) => p.id)

    // 2. Fetch Tasks, Approvals, Issues, Tickets, Activities concurrently
    const [
      allTasks,
      clientApprovals,
      openIssues,
      supportTickets,
      recentUpdates,
      taskActivities,
    ] = await Promise.all([
      prisma.task.findMany({
        where: { projectId: { in: projectIds } },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
          developer: { select: { id: true, name: true, email: true } },
          tester: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.clientApproval.findMany({
        where: { projectId: { in: projectIds }, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: { project: { select: { name: true } } },
      }),
      prisma.issue.findMany({
        where: { projectId: { in: projectIds }, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        orderBy: { createdAt: 'desc' },
        include: { project: { select: { name: true } } },
      }),
      prisma.ticket.findMany({
        where: { projectId: { in: projectIds } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { project: { select: { name: true } } },
      }),
      prisma.projectUpdate.findMany({
        where: { projectId: { in: projectIds } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { project: { select: { name: true } }, author: { select: { name: true } } },
      }),
      prisma.taskActivity.findMany({
        where: { task: { projectId: { in: projectIds } } },
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
        blockedTasksCount: blockedTasks.length + openIssues.length,
        totalTasksCount: allTasks.length,
      },
      taskBreakdown,
      projects,
      allTasks,
      overdueTasks,
      blockedTasks,
      clientApprovals,
      openIssues,
      supportTickets,
      recentUpdates,
      taskActivities,
    })
  } catch (error) {
    console.error('Team dashboard GET API error:', error)
    return Errors.INTERNAL('Failed to fetch team dashboard operational data')
  }
}
