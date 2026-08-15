import { apiSuccess, Errors } from '@/lib/api-response'
import { getClientSubTeamContext, getServerUser, isClient } from '@/lib/auth/server'
import { sendClientTeamInvite } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getAppBaseUrl } from '@/lib/url'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subTeamId: string }> }
) {
  const user = await getServerUser()
  if (!user || !isClient(user)) return Errors.UNAUTHORIZED()

  const { subTeamId } = await params
  try {
    const members = await prisma.clientSubTeamMember.findMany({
      where: { subTeamId },
      include: {
        role: true,
        profile: { select: { email: true, name: true, isActive: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess(members)
  } catch (error) {
    console.error('Fetch subteam members error:', error)
    return Errors.INTERNAL('Failed to fetch members')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subTeamId: string }> }
) {
  const user = await getServerUser()
  if (!user || !isClient(user)) return Errors.UNAUTHORIZED()

  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx) return Errors.FORBIDDEN('Only primary client can manage team members')

  const { subTeamId } = await params

  try {
    const client = await prisma.client.findFirst({
      where: { OR: [{ profileId: user.id }, { email: user.email }] },
    })
    if (!client) return Errors.NOT_FOUND('Client account')

    const team = await prisma.clientSubTeam.findFirst({
      where: { id: subTeamId, clientId: client.id },
    })
    if (!team) return Errors.NOT_FOUND('Sub-team')

    const body = await request.json()
    const { name, email, designation, roleId, customPolicy } = body

    if (!name || !email) {
      return Errors.VALIDATION('Member name and email are required')
    }

    const cleanEmail = email.trim().toLowerCase()

    const supabaseAdmin = createSupabaseAdminClient()
    const appUrl = getAppBaseUrl(request)

    // Check if member already exists in sub-team members table
    const existingMember = await prisma.clientSubTeamMember.findUnique({
      where: { email: cleanEmail },
      include: { profile: true },
    })

    if (existingMember) {
      if (existingMember.subTeamId === subTeamId && existingMember.status === 'ACTIVE') {
        return Errors.CONFLICT(`Member ${cleanEmail} is already an active member of this team`)
      }

      // Re-invitation / Transfer Flow: Reactivate member profile and assign to new sub-team
      let { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: cleanEmail,
        options: {
          redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
        },
      })

      if (linkError || !linkData?.user) {
        return Errors.VALIDATION(`Could not generate invite link for re-invitation: ${linkError?.message}`)
      }

      const inviteLink = linkData.properties?.action_link ?? `${appUrl}/login`

      if (existingMember.profileId) {
        await prisma.profile.update({
          where: { id: existingMember.profileId },
          data: { name, isActive: true },
        })
      }

      const updatedMember = await prisma.clientSubTeamMember.update({
        where: { id: existingMember.id },
        data: {
          subTeamId,
          name,
          designation: designation || null,
          roleId: roleId || null,
          customPolicy: customPolicy || null,
          status: 'ACTIVE',
        },
        include: {
          role: true,
          profile: { select: { email: true, name: true, isActive: true } },
        },
      })

      await sendClientTeamInvite({
        to: cleanEmail,
        teamName: team.name,
        clientName: client.name,
        inviteLink,
      }).catch(() => {})

      return apiSuccess(updatedMember, 200)
    }

    // Check if profile exists under this email but no member record
    const existingProfile = await prisma.profile.findUnique({ where: { email: cleanEmail } })
    let authUserId: string

    let inviteLink: string
    if (existingProfile) {
      authUserId = existingProfile.id
      await prisma.profile.update({
        where: { id: authUserId },
        data: { name, isActive: true },
      })

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: cleanEmail,
        options: {
          redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
        },
      })

      if (linkError || !linkData?.user) {
        return Errors.VALIDATION(`Could not generate invite link: ${linkError?.message}`)
      }
      inviteLink = linkData.properties?.action_link ?? `${appUrl}/login`
    } else {
      let { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: cleanEmail,
        options: {
          redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
          data: { role: 'CLIENT', name, clientTeam: true },
        },
      })

      if (linkError || !linkData?.user) {
        const fallback = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: cleanEmail,
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

      authUserId = linkData.user.id
      inviteLink = linkData.properties?.action_link ?? `${appUrl}/login`

      await prisma.profile.create({
        data: {
          id: authUserId,
          email: cleanEmail,
          role: 'CLIENT',
          name,
          isActive: true,
        },
      })
    }

    const member = await prisma.clientSubTeamMember.create({
      data: {
        subTeamId,
        profileId: authUserId,
        roleId: roleId || null,
        name,
        email: cleanEmail,
        designation: designation || null,
        customPolicy: customPolicy || null,
        status: 'ACTIVE',
      },
      include: {
        role: true,
        profile: { select: { email: true, name: true, isActive: true } },
      },
    })

    await sendClientTeamInvite({
      to: cleanEmail,
      teamName: team.name,
      clientName: client.name,
      inviteLink,
    }).catch(() => {})

    return apiSuccess(member, 201)
  } catch (error) {
    console.error('Create subteam member error:', error)
    return Errors.INTERNAL('Failed to create team member')
  }
}
