import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const now = new Date()

    // 1. Fetch organization-wide data concurrently
    const [
      totalClients,
      activeClients,
      totalProjects,
      activeProjects,
      completedProjects,
      totalTeamMembers,
      pendingInvitesCount,
      allInvoices,
      allTasks,
      allIssues,
      pendingApprovals,
      recentAuditLogs,
      recentProjects,
      recentClients,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { status: 'ACTIVE' } }),
      prisma.project.count(),
      prisma.project.count({ where: { status: { in: ['IN_PROGRESS', 'PLANNED'] } } }),
      prisma.project.count({ where: { status: 'COMPLETED' } }),
      prisma.profile.count({ where: { role: 'TEAM_MEMBER', isActive: true } }),
      prisma.profile.count({ where: { role: 'TEAM_MEMBER', isActive: false, magicLinkToken: { not: null } } }),
      prisma.invoice.findMany({
        orderBy: { createdAt: 'desc' },
        include: { client: { select: { name: true } } },
      }),
      prisma.task.findMany({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        select: { id: true, title: true, status: true, dueDate: true, projectId: true, developerId: true, assigneeId: true },
      }),
      prisma.issue.findMany({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        select: { id: true, title: true, status: true, priority: true, projectId: true },
      }),
      prisma.clientApproval.findMany({
        where: { status: 'PENDING' },
        select: { id: true, title: true, projectId: true, createdAt: true },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { actor: { select: { name: true, email: true } } },
      }),
      prisma.project.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 6,
        include: {
          client: { select: { id: true, name: true } },
          lead: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.client.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    // Calculate Financial Aggregates
    const paidInvoices = allInvoices.filter((inv) => inv.status === 'PAID')
    const pendingInvoices = allInvoices.filter((inv) => inv.status === 'PENDING')
    const overdueInvoices = allInvoices.filter(
      (inv) => inv.status === 'OVERDUE' || (inv.status === 'PENDING' && inv.dueDate && new Date(inv.dueDate) < now)
    )

    const totalInvoiced = allInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)
    const totalOutstanding = pendingInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0) + overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)
    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)

    // Calculate Overdue / Blocked Tasks across Organization
    const overdueTasks = allTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now)
    const blockedTasks = allTasks.filter((t) => t.status === 'BLOCKED')
    const unassignedLeadProjects = recentProjects.filter((p) => !p.leadId)

    return apiSuccess({
      stats: {
        totalClients,
        activeClients,
        totalProjects,
        activeProjects,
        completedProjects,
        totalTeamMembers,
        pendingInvitesCount,
        overdueTasksCount: overdueTasks.length,
        blockedTasksCount: blockedTasks.length + allIssues.length,
        pendingApprovalsCount: pendingApprovals.length,
        financials: {
          totalInvoiced,
          totalPaid,
          totalOutstanding,
          totalOverdue,
          overdueInvoicesCount: overdueInvoices.length,
        },
      },
      recentProjects,
      recentClients,
      recentInvoices: allInvoices.slice(0, 5),
      recentAuditLogs,
      exceptions: {
        overdueTasksCount: overdueTasks.length,
        blockedTasksCount: blockedTasks.length,
        unassignedLeadProjectsCount: unassignedLeadProjects.length,
        pendingInvitesCount,
        pendingApprovalsCount: pendingApprovals.length,
        overdueInvoicesCount: overdueInvoices.length,
      },
    })
  } catch (error) {
    console.error('Admin dashboard GET API error:', error)
    return Errors.INTERNAL('Failed to fetch admin dashboard control tower metrics')
  }
}
