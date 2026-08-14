import { apiSuccess, Errors } from '@/lib/api-response'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const [clientsCount, projectsCount, tasksStats, invoices, auditLogs] = await Promise.all([
      prisma.client.count(),
      prisma.project.count(),
      prisma.task.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.invoice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { client: true },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { actor: { select: { name: true, email: true } } },
      }),
    ])

    const totalRevenue = invoices
      .filter((inv) => inv.status === 'PAID')
      .reduce((sum, inv) => sum + Number(inv.amount), 0)

    const pendingRevenue = invoices
      .filter((inv) => inv.status === 'PENDING' || inv.status === 'OVERDUE')
      .reduce((sum, inv) => sum + Number(inv.amount), 0)

    return apiSuccess({
      stats: {
        clientsCount,
        projectsCount,
        totalRevenue,
        pendingRevenue,
        tasksStats: tasksStats.reduce((acc, curr) => {
          acc[curr.status] = curr._count._all
          return acc
        }, {} as Record<string, number>),
      },
      recentInvoices: invoices,
      recentAuditLogs: auditLogs,
    })
  } catch (error) {
    console.error('Admin dashboard API error:', error)
    return Errors.INTERNAL('Failed to fetch dashboard data')
  }
}
