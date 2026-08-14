import { apiSuccess, Errors } from '@/lib/api-response'
import { DEFAULT_SUBTEAM_POLICY, getServerUser, isAdmin } from '@/lib/auth/server'
import { sendClientTeamInvite } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getAppBaseUrl } from '@/lib/url'
import { NextRequest } from 'next/server'

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

    const supabaseAdmin = createSupabaseAdminClient()
    const appUrl = getAppBaseUrl(request)

    let { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
        data: { role: 'CLIENT', name },
      },
    })

    if (linkError || !linkData?.user) {
      const fallback = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
        },
      })
      linkData = fallback.data
      linkError = fallback.error
    }

    if (linkError || !linkData?.user) {
      return Errors.VALIDATION(`Could not create user invite: ${linkError?.message}`)
    }

    const authUserId = linkData.user.id
    const inviteLink = linkData.properties?.action_link ?? `${appUrl}/login`

    await prisma.profile.upsert({
      where: { email },
      update: { id: authUserId, role: 'CLIENT', name, isActive: true },
      create: { id: authUserId, email, role: 'CLIENT', name, isActive: true },
    })

    const mergedPolicy = { ...DEFAULT_SUBTEAM_POLICY, ...(policy || {}) }

    const subTeam = await prisma.clientSubTeam.create({
      data: {
        clientId,
        profileId: authUserId,
        name,
        email,
        accessPolicy: mergedPolicy,
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
    return Errors.INTERNAL('Failed to create sub-team')
  }
}
