import { apiSuccess, Errors } from '@/lib/api-response'
import { AccessPolicy, getClientSubTeamContext, getServerUser, isClient } from '@/lib/auth/server'
import { sendClientTeamInvite } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const subTeamCtx = await getClientSubTeamContext(user.id)
    if (subTeamCtx) {
      return Errors.FORBIDDEN('Only primary client can manage sub-teams')
    }

    const client = await prisma.client.findFirst({
      where: { OR: [{ profileId: user.id }, { email: user.email }] },
      include: {
        subTeams: {
          orderBy: { createdAt: 'desc' },
          include: { profile: { select: { email: true, name: true, isActive: true } } },
        },
      },
    })

    if (!client) {
      return Errors.NOT_FOUND('Client account')
    }

    return apiSuccess(client.subTeams)
  } catch (error) {
    console.error('Client sub-teams GET API error:', error)
    return Errors.INTERNAL('Failed to fetch sub-teams')
  }
}

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const subTeamCtx = await getClientSubTeamContext(user.id)
    if (subTeamCtx) {
      return Errors.FORBIDDEN('Only primary client can create sub-teams')
    }

    const client = await prisma.client.findFirst({
      where: { OR: [{ profileId: user.id }, { email: user.email }] },
    })

    if (!client) {
      return Errors.NOT_FOUND('Client account')
    }

    const body = await request.json()
    const { name, email, policy } = body

    if (!name || !email) {
      return Errors.VALIDATION('Sub-team name and email are required')
    }

    const existingProfile = await prisma.profile.findUnique({ where: { email } })
    if (existingProfile) {
      return Errors.CONFLICT(`Email ${email} is already registered on the platform`)
    }

    const existingTeam = await prisma.clientSubTeam.findUnique({ where: { email } })
    if (existingTeam) {
      return Errors.CONFLICT(`A sub-team with email ${email} already exists`)
    }

    const mergedPolicy: AccessPolicy = {
      projects: policy?.projects !== false,
      milestones: policy?.milestones !== false,
      approvals: policy?.approvals !== false,
      invoices: Boolean(policy?.invoices),
      subscriptions: Boolean(policy?.subscriptions),
      billing: Boolean(policy?.billing),
      documents: policy?.documents !== false,
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    let { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
        data: { role: 'CLIENT', name, clientTeam: true },
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
      return Errors.VALIDATION(`Could not generate invite link: ${linkError?.message}`)
    }

    const authUserId = linkData.user.id
    const inviteLink = linkData.properties?.action_link ?? `${appUrl}/login`

    await prisma.profile.create({
      data: {
        id: authUserId,
        email,
        role: 'CLIENT',
        name,
        isActive: true,
      },
    })

    const subTeam = await prisma.clientSubTeam.create({
      data: {
        clientId: client.id,
        name,
        email,
        profileId: authUserId,
        status: 'ACTIVE',
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
    console.error('Client create sub-team API error:', error)
    return Errors.INTERNAL('Failed to create sub-team')
  }
}
