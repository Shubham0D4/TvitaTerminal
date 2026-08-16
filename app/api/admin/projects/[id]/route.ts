import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        lead: { select: { id: true, name: true, email: true, teamRole: true } },
        members: { include: { profile: { select: { id: true, name: true, email: true, teamRole: true } } } },
        milestones: {
          orderBy: { sortOrder: 'asc' },
          include: { assignee: { select: { id: true, name: true, email: true } } },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
          include: { assignee: { select: { id: true, name: true } } },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { name: true } } },
        },
        approvals: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!project) {
      return Errors.NOT_FOUND('Project')
    }

    return apiSuccess(project)
  } catch (error) {
    console.error('Admin project GET API error:', error)
    return Errors.INTERNAL('Failed to fetch project detail')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const existing = await prisma.project.findUnique({ where: { id } })
    if (!existing) {
      return Errors.NOT_FOUND('Project')
    }

    const body = await request.json()
    const { name, clientId, description, status, progress, startDate, endDate, leadId } = body

    const updated = await prisma.project.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        clientId: clientId ?? existing.clientId,
        description: description !== undefined ? description : existing.description,
        status: status ?? existing.status,
        progress: progress !== undefined ? Number(progress) : existing.progress,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : existing.startDate,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : existing.endDate,
        leadId: leadId !== undefined ? leadId : existing.leadId,
      },
    })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'UPDATE',
      entityType: 'project',
      entityId: id,
      entityLabel: existing.name,
      oldValue: { name: existing.name, status: existing.status },
      newValue: { name: updated.name, status: updated.status },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Admin project PUT API error:', error)
    return Errors.INTERNAL('Failed to update project')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) {
      return Errors.NOT_FOUND('Project')
    }

    await prisma.project.delete({ where: { id } })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'DELETE',
      entityType: 'project',
      entityId: id,
      entityLabel: project.name,
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('Admin project DELETE API error:', error)
    return Errors.INTERNAL('Failed to delete project')
  }
}
