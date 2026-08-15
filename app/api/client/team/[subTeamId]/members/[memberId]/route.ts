import { apiSuccess, Errors } from '@/lib/api-response'
import { getClientSubTeamContext, getServerUser, isClient } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ subTeamId: string; memberId: string }> }
) {
  const user = await getServerUser()
  if (!user || !isClient(user)) return Errors.UNAUTHORIZED()

  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx) return Errors.FORBIDDEN('Only primary client can modify team members')

  const { subTeamId, memberId } = await params

  try {
    const client = await prisma.client.findFirst({
      where: { OR: [{ profileId: user.id }, { email: user.email }] },
    })
    if (!client) return Errors.NOT_FOUND('Client account')

    const member = await prisma.clientSubTeamMember.findFirst({
      where: { id: memberId, subTeamId },
    })
    if (!member) return Errors.NOT_FOUND('Sub-team member')

    const body = await request.json()
    const { name, designation, roleId, customPolicy, status } = body

    const updated = await prisma.clientSubTeamMember.update({
      where: { id: memberId },
      data: {
        name: name ?? member.name,
        designation: designation !== undefined ? designation : member.designation,
        roleId: roleId !== undefined ? roleId : member.roleId,
        customPolicy: customPolicy !== undefined ? customPolicy : member.customPolicy,
        status: status ?? member.status,
      },
      include: {
        role: true,
        profile: { select: { email: true, name: true, isActive: true } },
      },
    })

    if (member.profileId) {
      await prisma.profile.update({
        where: { id: member.profileId },
        data: {
          name: updated.name,
          isActive: updated.status === 'ACTIVE',
        },
      })
    }

    return apiSuccess(updated)
  } catch (error) {
    console.error('Update subteam member error:', error)
    return Errors.INTERNAL('Failed to update team member')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ subTeamId: string; memberId: string }> }
) {
  const user = await getServerUser()
  if (!user || !isClient(user)) return Errors.UNAUTHORIZED()

  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx) return Errors.FORBIDDEN('Only primary client can delete team members')

  const { subTeamId, memberId } = await params

  try {
    const client = await prisma.client.findFirst({
      where: { OR: [{ profileId: user.id }, { email: user.email }] },
    })
    if (!client) return Errors.NOT_FOUND('Client account')

    const member = await prisma.clientSubTeamMember.findFirst({
      where: { id: memberId, subTeamId },
    })
    if (!member) return Errors.NOT_FOUND('Sub-team member')

    // Soft remove: set member status INACTIVE and deactivate associated profile (preserving history & logs)
    await prisma.clientSubTeamMember.update({
      where: { id: memberId },
      data: { status: 'INACTIVE' },
    })

    if (member.profileId) {
      await prisma.profile.update({
        where: { id: member.profileId },
        data: { isActive: false },
      })
    }

    return apiSuccess({ deleted: true, soft: true })
  } catch (error) {
    console.error('Soft delete subteam member error:', error)
    return Errors.INTERNAL('Failed to soft remove team member')
  }
}
