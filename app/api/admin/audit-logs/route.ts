import { apiSuccess, Errors } from '@/lib/api-response'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || ''
  const entityType = searchParams.get('entityType') || ''
  const query = searchParams.get('q') || ''

  try {
    const where: any = {}
    if (action) where.action = action
    if (entityType) where.entityType = entityType
    if (query) {
      where.OR = [
        { actorEmail: { contains: query, mode: 'insensitive' } },
        { entityLabel: { contains: query, mode: 'insensitive' } },
      ]
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { actor: { select: { name: true, email: true, role: true } } },
    })

    return apiSuccess(logs)
  } catch (error) {
    console.error('Admin audit logs GET API error:', error)
    return Errors.INTERNAL('Failed to fetch audit logs')
  }
}
