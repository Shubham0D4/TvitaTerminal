import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendClientTeamInvite } from '@/infrastructure/email'
import { ClientRepository } from '@/infrastructure/database/repositories/client.repository'

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
    return ClientRepository.findClientForActor({ userId, email: userEmail })
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
    const member = await ClientRepository.findSubTeamMemberById(memberId)
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

    const existingMember = await prisma.clientSubTeamMember.findUnique({
      where: { email: cleanEmail },
      include: { profile: true },
    })

    const team = await ClientRepository.findSubTeamById(input.subTeamId)
    if (!team) throw new Error('Sub-team not found')

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    if (existingMember) {
      if (existingMember.subTeamId === input.subTeamId && existingMember.status === 'ACTIVE') {
        throw new Error(`Member ${cleanEmail} is already active in this team`)
      }

      if (existingMember.profileId) {
        await prisma.profile.update({
          where: { id: existingMember.profileId },
          data: {
            name: input.name,
            isActive: true,
            invitedAt: new Date(),
            magicLinkToken: token,
            magicLinkExpires: expires,
          },
        })
      }

      const inviteLink = `${input.appUrl}/auth/callback?token=${token}&email=${cleanEmail}&next=/reset-password`

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

    if (existingProfile) {
      authUserId = existingProfile.id
      await prisma.profile.update({
        where: { id: authUserId },
        data: {
          name: input.name,
          isActive: true,
          invitedAt: new Date(),
          magicLinkToken: token,
          magicLinkExpires: expires,
        },
      })
    } else {
      authUserId = crypto.randomUUID()
      await prisma.profile.create({
        data: {
          id: authUserId,
          email: cleanEmail,
          role: 'CLIENT',
          name: input.name,
          isActive: true,
          invitedAt: new Date(),
          magicLinkToken: token,
          magicLinkExpires: expires,
        },
      })
    }

    const inviteLink = `${input.appUrl}/auth/callback?token=${token}&email=${cleanEmail}&next=/reset-password`

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

  static async updateSubTeam(
    subTeamId: string,
    clientId: string,
    body: {
      name?: string
      email?: string
      description?: string
      status?: string
      policy?: Record<string, boolean>
      allowedProjects?: string[]
    }
  ) {
    const team = await prisma.clientSubTeam.findFirst({
      where: { id: subTeamId, clientId },
    })

    if (!team) {
      throw new Error('Sub-team not found')
    }
    if (team.revokedByAdmin) {
      throw new Error('This team has been revoked by an admin and cannot be reactivated')
    }

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
        status: (status as any) ?? team.status,
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

    return updated
  }

  static async updateSubTeamMember(
    subTeamId: string,
    memberId: string,
    body: {
      name?: string
      designation?: string
      roleId?: string
      customPolicy?: Record<string, boolean>
      status?: string
    }
  ) {
    const member = await prisma.clientSubTeamMember.findFirst({
      where: { id: memberId, subTeamId },
    })
    if (!member) throw new Error('Sub-team member not found')

    const { name, designation, roleId, customPolicy, status } = body

    const updated = await prisma.clientSubTeamMember.update({
      where: { id: memberId },
      data: {
        name: name ?? member.name,
        designation: designation !== undefined ? designation : member.designation,
        roleId: roleId !== undefined ? roleId : member.roleId,
        customPolicy: customPolicy !== undefined ? customPolicy : (member.customPolicy as any),
        status: (status as any) ?? member.status,
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

    return updated
  }

  static async createSubTeamRole(
    subTeamId: string,
    name: string,
    description?: string,
    permissions?: Record<string, boolean>
  ) {
    return prisma.clientSubTeamRole.create({
      data: {
        subTeamId,
        name: name.trim(),
        description: description || null,
        permissions: permissions || {},
      },
    })
  }
}

