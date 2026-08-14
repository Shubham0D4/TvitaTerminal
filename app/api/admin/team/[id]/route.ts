import { apiSuccess, Errors } from '@/lib/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { TeamRole } from '@prisma/client'
import { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

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
    const member = await prisma.profile.findUnique({
      where: { id },
      include: {
        projectMembers: {
          include: { project: true },
        },
        tasksAssigned: {
          include: { project: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        projectsLed: true,
      },
    })

    if (!member) {
      return Errors.NOT_FOUND('Team member')
    }

    return apiSuccess(member)
  } catch (error) {
    console.error('Admin team GET member API error:', error)
    return Errors.INTERNAL('Failed to fetch team member')
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
    const existing = await prisma.profile.findUnique({ where: { id } })
    if (!existing) {
      return Errors.NOT_FOUND('Team member')
    }

    const body = await request.json()
    const { name, phone, salary, role, teamRole, isActive } = body

    const updated = await prisma.profile.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        phone: phone !== undefined ? phone : existing.phone,
        salary: salary !== undefined ? (salary !== null ? Number(salary) : null) : existing.salary,
        role: role ?? existing.role,
        teamRole: teamRole !== undefined ? (teamRole === '' ? null : (teamRole as TeamRole)) : existing.teamRole,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'UPDATE',
      entityType: 'user',
      entityId: id,
      entityLabel: existing.name,
      oldValue: { name: existing.name, role: existing.role, isActive: existing.isActive },
      newValue: { name: updated.name, role: updated.role, isActive: updated.isActive },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Admin team PUT member API error:', error)
    return Errors.INTERNAL('Failed to update team member')
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
    const existing = await prisma.profile.findUnique({ where: { id } })
    if (!existing) {
      return Errors.NOT_FOUND('Team member')
    }

    // 1. Null out or clean references in related models
    await prisma.project.updateMany({
      where: { leadId: id },
      data: { leadId: null }
    })
    await prisma.project.updateMany({
      where: { createdById: id },
      data: { createdById: null }
    })

    await prisma.task.updateMany({
      where: { assigneeId: id },
      data: { assigneeId: null }
    })
    await prisma.task.updateMany({
      where: { developerId: id },
      data: { developerId: null }
    })
    await prisma.task.updateMany({
      where: { testerId: id },
      data: { testerId: null }
    })
    await prisma.task.updateMany({
      where: { createdById: id },
      data: { createdById: null }
    })

    await prisma.milestone.updateMany({
      where: { assigneeId: id },
      data: { assigneeId: null }
    })
    await prisma.milestone.updateMany({
      where: { createdById: id },
      data: { createdById: null }
    })

    await prisma.invoice.updateMany({
      where: { createdById: id },
      data: { createdById: null }
    })

    await prisma.client.updateMany({
      where: { createdById: id },
      data: { createdById: null }
    })
    await prisma.client.updateMany({
      where: { accountManagerId: id },
      data: { accountManagerId: null }
    })
    await prisma.client.updateMany({
      where: { updatedById: id },
      data: { updatedById: null }
    })

    await prisma.clientApproval.updateMany({
      where: { createdById: id },
      data: { createdById: null }
    })

    await prisma.projectUpdate.updateMany({
      where: { authorId: id },
      data: { authorId: null }
    })

    await prisma.subscription.updateMany({
      where: { createdById: id },
      data: { createdById: null }
    })

    // 2. Delete related cascade tables
    await prisma.projectMember.deleteMany({ where: { profileId: id } })
    await prisma.taskComment.deleteMany({ where: { authorId: id } })
    await prisma.taskActivity.deleteMany({ where: { actorId: id } })
    await prisma.notification.deleteMany({ where: { userId: id } })
    await prisma.auditLog.deleteMany({ where: { actorId: id } })
    await prisma.document.deleteMany({ where: { uploadedById: id } })

    // 3. Delete from Supabase Auth
    try {
      const supabaseAdmin = createSupabaseAdminClient()
      await supabaseAdmin.auth.admin.deleteUser(id)
    } catch (err) {
      console.warn('Supabase auth user delete warning (user might not exist in auth schema):', err)
    }

    // 4. Delete the profile itself
    await prisma.profile.delete({ where: { id } })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'DELETE',
      entityType: 'user',
      entityId: id,
      entityLabel: existing.name,
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('Admin team DELETE member API error:', error)
    return Errors.INTERNAL('Failed to delete team member')
  }
}
