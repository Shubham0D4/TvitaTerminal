import { apiSuccess, Errors } from '@/lib/api-response'
import { getClientSubTeamContext, getServerUser, isClient } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ subTeamId: string }> }
) {
  const user = await getServerUser()
  if (!user || !isClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { subTeamId } = await params

  try {
    const subTeamCtx = await getClientSubTeamContext(user.id)
    if (subTeamCtx) {
      return Errors.FORBIDDEN('Only primary client can modify sub-teams')
    }

    const client = await prisma.client.findFirst({
      where: { OR: [{ profileId: user.id }, { email: user.email }] },
    })

    if (!client) return Errors.NOT_FOUND('Client account')

    const team = await prisma.clientSubTeam.findFirst({
      where: { id: subTeamId, clientId: client.id },
    })

    if (!team) return Errors.NOT_FOUND('Sub-team')
    if (team.revokedByAdmin) {
      return Errors.FORBIDDEN('This team has been revoked by an admin and cannot be reactivated')
    }

    const body = await request.json()
    const { name, email, description, status, policy, allowedProjects } = body

    let newPolicy = team.accessPolicy as object
    if (policy && typeof policy === 'object') {
      newPolicy = {
        ...(team.accessPolicy as object),
        ...policy,
      }
    }

    const updated = await prisma.clientSubTeam.update({
      where: { id: subTeamId },
      data: {
        name: name ?? team.name,
        description: description !== undefined ? description : team.description,
        email: email ?? team.email,
        status: status ?? team.status,
        accessPolicy: newPolicy,
        ...(Array.isArray(allowedProjects) ? { allowedProjects } : {}),
      },
      include: {
        profile: { select: { email: true, name: true, isActive: true } },
        roles: true,
        members: {
          include: {
            role: true,
            profile: { select: { email: true, name: true, isActive: true } },
          },
        },
      },
    })

    // Sync changes to Profile
    const profileUpdates: { name?: string; email?: string; isActive?: boolean } = {}
    if (name && name !== team.name) profileUpdates.name = name
    if (email && email !== team.email) profileUpdates.email = email
    if (status && status !== team.status) profileUpdates.isActive = status === 'ACTIVE'

    if (team.profileId && Object.keys(profileUpdates).length > 0) {
      await prisma.profile.update({
        where: { id: team.profileId },
        data: profileUpdates,
      })
    }

    return apiSuccess(updated)
  } catch (error) {
    console.error('Client update sub-team API error:', error)
    return Errors.INTERNAL('Failed to update sub-team')
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ subTeamId: string }> }
) {
  return PUT(request, context)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ subTeamId: string }> }
) {
  const user = await getServerUser()
  if (!user || !isClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { subTeamId } = await params

  try {
    const subTeamCtx = await getClientSubTeamContext(user.id)
    if (subTeamCtx) {
      return Errors.FORBIDDEN('Only primary client can delete sub-teams')
    }

    const client = await prisma.client.findFirst({
      where: { OR: [{ profileId: user.id }, { email: user.email }] },
    })

    if (!client) return Errors.NOT_FOUND('Client account')

    const team = await prisma.clientSubTeam.findFirst({
      where: { id: subTeamId, clientId: client.id },
    })

    if (!team) return Errors.NOT_FOUND('Sub-team')

    // Soft delete: mark team status INACTIVE and deactivate team members & profiles
    await prisma.$transaction([
      prisma.clientSubTeam.update({
        where: { id: subTeamId },
        data: { status: 'INACTIVE' },
      }),
      prisma.clientSubTeamMember.updateMany({
        where: { subTeamId },
        data: { status: 'INACTIVE' },
      }),
    ])

    // Deactivate profiles of team members so active sessions are invalidated
    const teamMembers = await prisma.clientSubTeamMember.findMany({
      where: { subTeamId },
      select: { profileId: true },
    })
    const profileIds = teamMembers
      .map((m) => m.profileId)
      .filter((id): id is string => Boolean(id))

    if (team.profileId) profileIds.push(team.profileId)

    if (profileIds.length > 0) {
      await prisma.profile.updateMany({
        where: { id: { in: profileIds } },
        data: { isActive: false },
      })
    }

    return apiSuccess({ deleted: true, soft: true })
  } catch (error) {
    console.error('Client soft delete sub-team API error:', error)
    return Errors.INTERNAL('Failed to deactivate sub-team')
  }
}
