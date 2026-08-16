import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const status = searchParams.get('status') || ''
  const clientId = searchParams.get('clientId') || ''

  try {
    const where: any = {}
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ]
    }
    if (status) where.status = status
    if (clientId) where.clientId = clientId

    const [projects, totalCount, activeCount, completedCount] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { name: true, legalName: true } },
          lead: { select: { id: true, name: true, email: true } },
          members: { include: { profile: { select: { name: true, email: true } } } },
          tasks: { select: { id: true, status: true } },
          milestones: { select: { id: true, status: true } },
        },
      }),
      prisma.project.count(),
      prisma.project.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.project.count({ where: { status: 'COMPLETED' } }),
    ])

    return apiSuccess({
      projects,
      stats: {
        totalCount,
        activeCount,
        completedCount,
      },
    })
  } catch (error) {
    console.error('Admin projects GET API error:', error)
    return Errors.INTERNAL('Failed to fetch projects')
  }
}

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const body = await request.json()
    const { name, clientId, description, status, progress, startDate, endDate, leadId } = body

    if (!name || !clientId) {
      return Errors.VALIDATION('Project name and client selection are required')
    }

    const project = await prisma.project.create({
      data: {
        name,
        clientId,
        description: description || null,
        status: status || 'PLANNED',
        progress: progress ? Number(progress) : 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        leadId: leadId || null,
        createdById: user.id,
      },
    })

    if (leadId) {
      await prisma.projectMember.upsert({
        where: { projectId_profileId: { projectId: project.id, profileId: leadId } },
        create: { projectId: project.id, profileId: leadId, role: 'TEAM_LEAD' },
        update: { role: 'TEAM_LEAD' },
      })
    }

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'CREATE',
      entityType: 'project',
      entityId: project.id,
      entityLabel: project.name,
    })

    return apiSuccess(project, 201)
  } catch (error) {
    console.error('Admin projects POST API error:', error)
    return Errors.INTERNAL('Failed to create project')
  }
}
