import { apiSuccess, Errors } from '@/lib/api-response'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { sendAccountStatusChangedEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { NextRequest } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subTeamId: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { subTeamId } = await params

  try {
    const existing = await prisma.clientSubTeam.findUnique({ where: { id: subTeamId } })
    if (existing) {
      await prisma.clientSubTeam.delete({ where: { id: subTeamId } })
      if (existing.profileId) {
        await prisma.profile.update({
          where: { id: existing.profileId },
          data: { isActive: false },
        }).catch(() => {})
      }
    }

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('Admin delete subteam API error:', error)
    return Errors.INTERNAL('Failed to delete sub-team')
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subTeamId: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { subTeamId } = await params

  try {
    const body = await request.json()
    const { status, revokedByAdmin, accessPolicy } = body

    const existing = await prisma.clientSubTeam.findUnique({ where: { id: subTeamId } })
    if (!existing) {
      return Errors.NOT_FOUND('Sub-team')
    }

    const isRevoked = revokedByAdmin !== undefined ? Boolean(revokedByAdmin) : existing.revokedByAdmin
    let newStatus = status ?? existing.status
    if (revokedByAdmin === true) {
      newStatus = 'SUSPENDED'
    } else if (revokedByAdmin === false && existing.revokedByAdmin) {
      newStatus = 'ACTIVE'
    }

    const updated = await prisma.clientSubTeam.update({
      where: { id: subTeamId },
      data: {
        status: newStatus,
        revokedByAdmin: isRevoked,
        accessPolicy: accessPolicy ? { ...(existing.accessPolicy as object), ...accessPolicy } : existing.accessPolicy,
      },
    })

    // Sync status to profile
    if (existing.profileId) {
      await prisma.profile.update({
        where: { id: existing.profileId },
        data: { isActive: !isRevoked && newStatus === 'ACTIVE' },
      }).catch(() => {})
    }

    // Trigger auto-email and in-app notification
    try {
      const profile = existing.profileId ? await prisma.profile.findUnique({ where: { id: existing.profileId } }) : null
      if (profile?.email) {
        await sendAccountStatusChangedEmail({
          to: profile.email,
          name: profile.name || existing.name,
          status: isRevoked ? 'REVOKED' : (newStatus === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'),
          reason: isRevoked ? 'Access revoked by administrator' : 'Account status updated by administrator',
        })

        await createNotification({
          userId: profile.id,
          title: `Account ${isRevoked ? 'Revoked' : 'Restored'}`,
          message: isRevoked
            ? 'Your sub-team access has been revoked by an administrator.'
            : 'Your sub-team access has been restored.',
          type: isRevoked ? 'WARNING' : 'SUCCESS',
          entityType: 'ClientSubTeam',
          entityId: subTeamId,
        })
      }
    } catch (e) {
      console.warn('Failed to send status update notification:', e)
    }

    return apiSuccess(updated)
  } catch (error) {
    console.error('Admin PATCH subteam API error:', error)
    return Errors.INTERNAL('Failed to update sub-team')
  }
}
