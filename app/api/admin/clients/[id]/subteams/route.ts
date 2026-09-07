import crypto from 'crypto'
import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { DEFAULT_SUBTEAM_POLICY, getServerUser, isAdmin } from '@/lib/auth/server'
import { sendClientTeamInvite } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { getAppBaseUrl } from '@/lib/utils/url'
import { NextRequest } from 'next/server'
import { assertSubTeamNameAvailable, sanitizeAllowedProjectIds } from '@/lib/db/integrity'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id: clientId } = await params

  try {
    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) {
      return Errors.NOT_FOUND('Client')
    }

    const body = await request.json()
    const { name, email, policy } = body

    if (!name || !email) {
      return Errors.VALIDATION('Sub-team name and email are required')
    }

    await assertSubTeamNameAvailable(clientId, name)
    const allowedProjects = await sanitizeAllowedProjectIds(clientId, body.allowedProjects)

    const appUrl = getAppBaseUrl(request)
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const existingProfile = await prisma.profile.findUnique({
      where: { email }
    })

    const authUserId = existingProfile?.id || crypto.randomUUID()
    const inviteLink = `${appUrl}/auth/callback?token=${token}&email=${email}&next=/reset-password`

    await prisma.profile.upsert({
      where: { email },
      update: {
        id: authUserId,
        role: 'CLIENT',
        name,
        isActive: true,
        magicLinkToken: token,
        magicLinkExpires: expires,
      },
      create: {
        id: authUserId,
        email,
        role: 'CLIENT',
        name,
        isActive: true,
        magicLinkToken: token,
        magicLinkExpires: expires,
      },
    })

    const mergedPolicy = { ...DEFAULT_SUBTEAM_POLICY, ...(policy || {}) }

    const subTeam = await prisma.clientSubTeam.create({
      data: {
        clientId,
        profileId: authUserId,
        name: name.trim(),
        email,
        accessPolicy: mergedPolicy,
        allowedProjects,
      },
      include: { profile: { select: { email: true, name: true, isActive: true } } },
    })

    await sendClientTeamInvite({
      to: email,
      teamName: name,
      clientName: client.name,
      inviteLink,
    })

    return apiSuccess(subTeam, 201)
  } catch (error) {
    console.error('Admin create subteam API error:', error)
    return fromUnknownError(error, 'Failed to create sub-team')
  }
}
