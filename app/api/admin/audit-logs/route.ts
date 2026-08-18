import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { message: 'Forbidden: Admin access required', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    const entityType = searchParams.get('entityType')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '25', 10)
    const skip = (page - 1) * limit

    const whereClause: any = {}

    if (action && action !== 'ALL') {
      whereClause.action = action
    }

    if (entityType && entityType !== 'ALL') {
      whereClause.entityType = entityType
    }

    if (search && search.trim()) {
      const q = search.trim()
      whereClause.OR = [
        { actorEmail: { contains: q, mode: 'insensitive' } },
        { entityLabel: { contains: q, mode: 'insensitive' } },
        { entityId: { contains: q, mode: 'insensitive' } },
        { action: { contains: q, mode: 'insensitive' } },
      ]
    }

    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          actor: { select: { name: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where: whereClause }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit) || 1,
        },
      },
    })
  } catch (error: any) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
