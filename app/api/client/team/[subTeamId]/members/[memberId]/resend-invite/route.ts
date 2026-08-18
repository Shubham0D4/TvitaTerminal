import crypto from 'crypto'
import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getClientSubTeamContext, getServerUser, isClient } from '@/lib/auth/server'
import { ClientService } from '@/application/services/client.service'
import { sendRoleAccountCreatedEmail } from '@/infrastructure/email'
import { prisma } from '@/lib/prisma'
import { getAppBaseUrl } from '@/shared/utilities/url'
import { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subTeamId: string; memberId: string }> }
) {
  const user = await getServerUser()
  if (!user || !isClient(user)) return Errors.UNAUTHORIZED()

  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx) return Errors.FORBIDDEN('Only primary client can resend team member invitations')

  const { subTeamId, memberId } = await params

  try {
    const client = await ClientService.getClientByUserId(user.id, user.email)
    if (!client) return Errors.NOT_FOUND('Client account')

    const member = await prisma.clientSubTeamMember.findFirst({
      where: { id: memberId, subTeamId },
      include: {
        subTeam: true,
        profile: true,
      },
    })

    if (!member) {
      return Errors.NOT_FOUND('Sub-team member')
    }

    if (member.subTeam.clientId !== client.id) {
      return Errors.FORBIDDEN('Forbidden')
    }

    if (member.profile?.passwordHash) {
      return Errors.VALIDATION('Member has already set their password and completed account setup.')
    }

    const appUrl = getAppBaseUrl(request)
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const inviteLink = `${appUrl}/auth/callback?token=${token}&email=${encodeURIComponent(member.email)}&next=/reset-password`

    if (member.profileId) {
      await prisma.profile.update({
        where: { id: member.profileId },
        data: {
          invitedAt: new Date(),
          magicLinkToken: token,
          magicLinkExpires: expires,
        },
      })
    } else {
      // Find or create profile by email
      const profile = await prisma.profile.upsert({
        where: { email: member.email.toLowerCase() },
        create: {
          id: crypto.randomUUID(),
          name: member.name,
          email: member.email.toLowerCase(),
          role: 'CLIENT',
          isActive: true,
          invitedAt: new Date(),
          magicLinkToken: token,
          magicLinkExpires: expires,
        },
        update: {
          invitedAt: new Date(),
          magicLinkToken: token,
          magicLinkExpires: expires,
        },
      })

      await prisma.clientSubTeamMember.update({
        where: { id: member.id },
        data: { profileId: profile.id },
      })
    }

    // Send email invitation
    await sendRoleAccountCreatedEmail({
      to: member.email,
      name: member.name,
      role: `Sub-Team (${member.subTeam.name})`,
      inviteLink,
    })

    return apiSuccess({
      message: `Magic link invitation resent to ${member.email}`,
      inviteLink,
    })
  } catch (error) {
    console.error('Client subteam resend invite error:', error)
    return Errors.INTERNAL('Failed to resend invitation')
  }
}
