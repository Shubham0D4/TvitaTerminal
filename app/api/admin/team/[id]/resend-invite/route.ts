import crypto from 'crypto'
import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { sendRoleAccountCreatedEmail } from '@/infrastructure/email'
import { prisma } from '@/lib/prisma'
import { getAppBaseUrl } from '@/shared/utilities/url'
import { NextRequest } from 'next/server'

export async function POST(
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
    })

    if (!member) {
      return Errors.NOT_FOUND('Team member profile')
    }

    if (member.passwordHash) {
      return Errors.VALIDATION('Member has already set their password and completed account setup.')
    }

    const appUrl = getAppBaseUrl(request)
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const inviteLink = `${appUrl}/auth/callback?token=${token}&email=${encodeURIComponent(member.email)}&next=/reset-password`

    // Update magic link token & expiration
    await prisma.profile.update({
      where: { id: member.id },
      data: {
        invitedAt: new Date(),
        magicLinkToken: token,
        magicLinkExpires: expires,
      },
    })

    // Send email invitation again
    await sendRoleAccountCreatedEmail({
      to: member.email,
      name: member.name,
      role: member.teamRole || member.role || 'TEAM_MEMBER',
      inviteLink,
    })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'UPDATE',
      entityType: 'user',
      entityId: member.id,
      entityLabel: member.name,
      newValue: { resentInviteAt: new Date().toISOString() },
    })

    return apiSuccess({
      message: `Invitation resent successfully to ${member.email}`,
      inviteLink,
    })
  } catch (error) {
    console.error('Admin resend invite error:', error)
    return Errors.INTERNAL('Failed to resend invitation')
  }
}
