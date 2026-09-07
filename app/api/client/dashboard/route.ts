import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { getServerUser, isClient } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import {
  clientInvoiceWhere,
  clientProjectWhere,
  hasClientPolicy,
  resolveClientActor,
} from '@/lib/auth/access'
import { agencyNameForClient } from '@/lib/auth/visibility'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const { client: actorClient, subTeam } = await resolveClientActor(user)
    const client = await prisma.client.findUnique({
      where: { id: actorClient.id },
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

    const isSubTeam = Boolean(subTeam)
    const canSeeBilling = hasClientPolicy(subTeam, 'invoices', 'billing', 'subscriptions')
    const canSeeProjects = hasClientPolicy(subTeam, 'projects')
    const canSeeMilestones = hasClientPolicy(subTeam, 'milestones')
    const canSeeNotes = hasClientPolicy(subTeam, 'notes')
    const canSeeIssues = hasClientPolicy(subTeam, 'issues')
    const projectFilter = clientProjectWhere(client.id, subTeam)

    const [
      projects,
      pendingInvoices,
      pendingQuotes,
      openTickets,
      upcomingMilestones,
      upcomingMeetings,
      sharedNotes,
    ] = await Promise.all([
      canSeeProjects
        ? prisma.project.findMany({
            where: projectFilter,
            orderBy: { updatedAt: 'desc' },
            include: {
              lead: { select: { name: true, email: true } },
              milestones: canSeeMilestones
                ? {
                    where: { clientVisible: true },
                    orderBy: { dueDate: 'asc' },
                    take: 2,
                    select: { id: true, name: true, status: true, dueDate: true, stage: true },
                  }
                : false,
            },
          })
        : Promise.resolve([]),
      canSeeBilling
        ? prisma.invoice.findMany({
            where: { ...clientInvoiceWhere(client.id, subTeam), status: { in: ['PENDING', 'OVERDUE'] } },
            orderBy: { dueDate: 'asc' },
          })
        : Promise.resolve([]),
      isSubTeam
        ? Promise.resolve([])
        : prisma.quote.findMany({
            where: { clientId: client.id, status: { in: ['PENDING', 'COUNTER_OFFERED'] } },
            orderBy: { createdAt: 'desc' },
          }),
      canSeeIssues
        ? prisma.ticket.findMany({
            where: { project: projectFilter, status: { in: ['OPEN', 'IN_PROGRESS'] } },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { project: { select: { name: true } } },
          })
        : Promise.resolve([]),
      canSeeMilestones
        ? prisma.milestone.findMany({
            where: { project: projectFilter, clientVisible: true, status: { in: ['PLANNED', 'IN_PROGRESS'] }, dueDate: { not: null } },
            orderBy: { dueDate: 'asc' },
            take: 5,
            select: {
              id: true,
              name: true,
              status: true,
              dueDate: true,
              stage: true,
              project: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
      canSeeProjects
        ? prisma.meeting.findMany({
            where: { project: projectFilter, scheduledAt: { gte: new Date(Date.now() - 3600 * 1000) } },
            orderBy: { scheduledAt: 'asc' },
            take: 8,
            include: {
              project: { select: { name: true, leadId: true } },
              host: { select: { id: true, name: true, role: true } },
            },
          })
        : Promise.resolve([]),
      canSeeNotes
        ? prisma.note.findMany({
            where: { project: projectFilter, type: 'EXTERNAL_CLIENT' },
            orderBy: { updatedAt: 'desc' },
            take: 5,
            include: {
              project: { select: { name: true, leadId: true } },
              creator: { select: { id: true, name: true, role: true } },
            },
          })
        : Promise.resolve([]),
    ])

    const visibleMeetings = upcomingMeetings
      .filter((meeting) => (
        meeting.host.role === 'CLIENT'
        || meeting.host.id === meeting.project.leadId
        || meeting.host.role === 'ADMIN'
      ))
      .slice(0, 5)
      .map((meeting) => ({
        ...meeting,
        host: { name: agencyNameForClient(meeting.host, meeting.project.leadId) },
      }))

    const visibleNotes = sharedNotes.map((note) => ({
      ...note,
      creator: { name: agencyNameForClient(note.creator, note.project.leadId) },
    }))

    const activeProjectsCount = projects.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'PLANNED').length
    const pendingActionsCount = pendingInvoices.length + pendingQuotes.length
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
      openTickets,
      upcomingMilestones,
      upcomingMeetings: visibleMeetings,
      sharedNotes: visibleNotes,
      isSubTeam,
      policy: subTeam?.policy ?? {
        projects: true,
        milestones: true,
        invoices: true,
        subscriptions: true,
        billing: true,
        notes: true,
        issues: true,
        approvals: true,
      },
    })
  } catch (error) {
    console.error('Client dashboard GET API error:', error)
    return fromUnknownError(error, 'Failed to fetch client dashboard metrics')
  }
}
