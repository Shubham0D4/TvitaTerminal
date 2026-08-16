import { apiSuccess, Errors } from '@/shared/utilities/api-response'
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
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          take: 1,
          include: { plan: true },
        },
      },
    })

    if (!client) {
      return Errors.NOT_FOUND('Client account')
    }

    const isSubTeam = Boolean(subTeamCtx)
    const policy = subTeamCtx?.policy || {
      projects: true,
      milestones: true,
      approvals: true,
      invoices: true,
      subscriptions: true,
      billing: true,
      issues: true,
      notes: true,
    }

    const canSeeBilling = !subTeamCtx || Boolean(policy.invoices || policy.billing || policy.subscriptions)
    const canSeeProjects = !subTeamCtx || Boolean(policy.projects !== false)
    const canSeeMilestones = !subTeamCtx || Boolean(policy.milestones !== false)
    const canSeeApprovals = !subTeamCtx || Boolean(policy.approvals !== false)
    const canSeeIssues = !subTeamCtx || Boolean(policy.issues !== false)
    const canSeeNotes = !subTeamCtx || Boolean(policy.notes !== false)

    // Allowed project filter for subteams
    const allowedProjectIds = subTeamCtx?.allowedProjectIds || []
    const projectFilter = allowedProjectIds.length > 0
      ? { clientId: client.id, id: { in: allowedProjectIds } }
      : { clientId: client.id }

    // Fetch projects
    const projects = canSeeProjects
      ? await prisma.project.findMany({
          where: projectFilter,
          orderBy: { updatedAt: 'desc' },
          include: {
            lead: { select: { name: true, email: true } },
            milestones: canSeeMilestones
              ? {
                  where: { clientVisible: true },
                  orderBy: { dueDate: 'asc' },
                  take: 2,
                }
              : false,
          },
        })
      : []

    const projectIds = projects.map((p) => p.id)

    // Fetch actionable data concurrently
    const [
      pendingInvoices,
      pendingQuotes,
      pendingApprovals,
      openTickets,
      openIssues,
      upcomingMilestones,
      upcomingMeetings,
      sharedNotes,
    ] = await Promise.all([
      canSeeBilling
        ? prisma.invoice.findMany({
            where: { clientId: client.id, status: { in: ['PENDING', 'OVERDUE'] } },
            orderBy: { dueDate: 'asc' },
          })
        : Promise.resolve([]),
      prisma.quote.findMany({
        where: { clientId: client.id, status: { in: ['PENDING', 'COUNTER_OFFERED'] } },
        orderBy: { createdAt: 'desc' },
      }),
      canSeeApprovals
        ? prisma.clientApproval.findMany({
            where: { clientId: client.id, status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            include: { project: { select: { name: true } } },
          })
        : Promise.resolve([]),
      prisma.ticket.findMany({
        where: { projectId: { in: projectIds }, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { project: { select: { name: true } } },
      }),
      canSeeIssues
        ? prisma.issue.findMany({
            where: { projectId: { in: projectIds }, status: { in: ['OPEN', 'IN_PROGRESS'] } },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { project: { select: { name: true } } },
          })
        : Promise.resolve([]),
      canSeeMilestones
        ? prisma.milestone.findMany({
            where: { projectId: { in: projectIds }, clientVisible: true, status: { in: ['PLANNED', 'IN_PROGRESS'] }, dueDate: { not: null } },
            orderBy: { dueDate: 'asc' },
            take: 5,
            include: { project: { select: { name: true } } },
          })
        : Promise.resolve([]),
      prisma.meeting.findMany({
        where: { projectId: { in: projectIds }, scheduledAt: { gte: new Date(Date.now() - 3600 * 1000) } },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        include: { project: { select: { name: true } }, host: { select: { name: true } } },
      }),
      canSeeNotes
        ? prisma.note.findMany({
            where: { projectId: { in: projectIds }, type: 'EXTERNAL_CLIENT' },
            orderBy: { updatedAt: 'desc' },
            take: 5,
            include: { project: { select: { name: true } }, creator: { select: { name: true } } },
          })
        : Promise.resolve([]),
    ])

    const activeProjectsCount = projects.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'PLANNED').length
    const pendingActionsCount = pendingInvoices.length + pendingQuotes.length + pendingApprovals.length
    const outstandingAmount = pendingInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)

    return apiSuccess({
      stats: {
        activeProjectsCount,
        pendingActionsCount,
        openTicketsCount: openTickets.length,
        outstandingAmount,
        canSeeBilling,
      },
      client: {
        id: client.id,
        name: client.name,
        activePlan: client.subscriptions[0]?.plan?.name || null,
      },
      projects,
      pendingInvoices,
      pendingQuotes,
      pendingApprovals,
      openTickets,
      openIssues,
      upcomingMilestones,
      upcomingMeetings,
      sharedNotes,
      isSubTeam,
      policy,
    })
  } catch (error) {
    console.error('Client dashboard GET API error:', error)
    return Errors.INTERNAL('Failed to fetch client dashboard metrics')
  }
}
