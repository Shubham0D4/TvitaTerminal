/**
 * Client & Sub-Team Domain Service Layer
 * Single Responsibility: Business logic for Client records, Sub-Teams, Roles, and Member Onboarding & Soft-Removal.
 */

import { prisma } from '@/lib/prisma'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { sendClientTeamInvite } from '@/lib/email'

export interface CreateSubTeamInput {
  clientId: string
  name: string
  description?: string
  email?: string
  allowedProjects?: string[]
  policy?: Record<string, boolean>
}

export interface AddTeamMemberInput {
  subTeamId: string
  clientId: string
  clientName: string
  name: string
  email: string
  designation?: string
  roleId?: string
  customPolicy?: Record<string, boolean>
  appUrl: string
}

export class ClientService {
  /**
   * Fetch primary client account for a user profile
   */
  static async getClientByUserId(userId: string, userEmail: string) {
    return prisma.client.findFirst({
      where: { OR: [{ profileId: userId }, { email: userEmail }] },
    })
  }

  /**
   * Create a sub-team with optional container email and project permissions
   */
  static async createSubTeam(input: CreateSubTeamInput) {
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const subTeamEmail = input.email && input.email.trim()
      ? input.email.trim().toLowerCase()
      : `${slug}-${Date.now()}@team.tvita`

    return prisma.clientSubTeam.create({
      data: {
        clientId: input.clientId,
        name: input.name,
        description: input.description || null,
        email: subTeamEmail,
        allowedProjects: input.allowedProjects || ['ALL'],
        accessPolicy: input.policy || {},
        status: 'ACTIVE',
      },
      include: {
        roles: true,
        members: { include: { role: true } },
      },
    })
  }

  /**
   * Soft delete a sub-team and deactivate member profiles
   */
  static async softDeleteSubTeam(subTeamId: string) {
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

    const teamMembers = await prisma.clientSubTeamMember.findMany({
      where: { subTeamId },
      select: { profileId: true },
    })

    const profileIds = teamMembers
      .map((m) => m.profileId)
      .filter((id): id is string => Boolean(id))

    if (profileIds.length > 0) {
      await prisma.profile.updateMany({
        where: { id: { in: profileIds } },
        data: { isActive: false },
      })
    }

    return { deleted: true, soft: true }
  }

  /**
   * Soft remove a sub-team member
   */
  static async softRemoveMember(memberId: string) {
    const member = await prisma.clientSubTeamMember.findUnique({
      where: { id: memberId },
    })

    if (!member) return null

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

    return { deleted: true, soft: true }
  }

  /**
   * Onboard or re-invite a sub-team member via magic links
   */
  static async addOrReinviteMember(input: AddTeamMemberInput) {
    const cleanEmail = input.email.trim().toLowerCase()
    const supabaseAdmin = createSupabaseAdminClient()

    const existingMember = await prisma.clientSubTeamMember.findUnique({
      where: { email: cleanEmail },
      include: { profile: true },
    })

    const team = await prisma.clientSubTeam.findUnique({
      where: { id: input.subTeamId },
    })
    if (!team) throw new Error('Sub-team not found')

    if (existingMember) {
      if (existingMember.subTeamId === input.subTeamId && existingMember.status === 'ACTIVE') {
        throw new Error(`Member ${cleanEmail} is already active in this team`)
      }

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: cleanEmail,
        options: {
          redirectTo: `${input.appUrl}/auth/callback?next=/reset-password`,
        },
      })

      if (linkError || !linkData?.user) {
        throw new Error(`Could not generate invite link: ${linkError?.message}`)
      }

      const inviteLink = linkData.properties?.action_link ?? `${input.appUrl}/login`

      if (existingMember.profileId) {
        await prisma.profile.update({
          where: { id: existingMember.profileId },
          data: { name: input.name, isActive: true },
        })
      }

      const updatedMember = await prisma.clientSubTeamMember.update({
        where: { id: existingMember.id },
        data: {
          subTeamId: input.subTeamId,
          name: input.name,
          designation: input.designation || null,
          roleId: input.roleId || null,
          ...(input.customPolicy ? { customPolicy: input.customPolicy } : {}),
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
        clientName: input.clientName,
        inviteLink,
      }).catch(() => {})

      return updatedMember
    }

    // Check if profile exists
    const existingProfile = await prisma.profile.findUnique({ where: { email: cleanEmail } })
    let authUserId: string
    let inviteLink: string

    if (existingProfile) {
      authUserId = existingProfile.id
      await prisma.profile.update({
        where: { id: authUserId },
        data: { name: input.name, isActive: true },
      })

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: cleanEmail,
        options: {
          redirectTo: `${input.appUrl}/auth/callback?next=/reset-password`,
        },
      })

      if (linkError || !linkData?.user) {
        throw new Error(`Could not generate invite link: ${linkError?.message}`)
      }
      inviteLink = linkData.properties?.action_link ?? `${input.appUrl}/login`
    } else {
      let { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: cleanEmail,
        options: {
          redirectTo: `${input.appUrl}/auth/callback?next=/reset-password`,
          data: { role: 'CLIENT', name: input.name, clientTeam: true },
        },
      })

      if (linkError || !linkData?.user) {
        const fallback = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: cleanEmail,
          options: {
            redirectTo: `${input.appUrl}/auth/callback?next=/reset-password`,
          },
        })
        linkData = fallback.data
        linkError = fallback.error
      }

      if (linkError || !linkData?.user) {
        throw new Error(`Could not generate invite link: ${linkError?.message}`)
      }

      authUserId = linkData.user.id
      inviteLink = linkData.properties?.action_link ?? `${input.appUrl}/login`

      await prisma.profile.create({
        data: {
          id: authUserId,
          email: cleanEmail,
          role: 'CLIENT',
          name: input.name,
          isActive: true,
        },
      })
    }

    const newMember = await prisma.clientSubTeamMember.create({
      data: {
        subTeamId: input.subTeamId,
        profileId: authUserId,
        roleId: input.roleId || null,
        name: input.name,
        email: cleanEmail,
        designation: input.designation || null,
        ...(input.customPolicy ? { customPolicy: input.customPolicy } : {}),
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
      clientName: input.clientName,
      inviteLink,
    }).catch(() => {})

    return newMember
  }
}
