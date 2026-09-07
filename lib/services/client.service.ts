import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendClientTeamInvite } from '@/lib/email'
import { ClientRepository } from '@/lib/repositories/client.repository'
import { NotFoundError, ValidationError, ConflictError } from '@/lib/errors'
import {
  assertSubTeamNameAvailable,
  sanitizeAllowedProjectIds,
} from '@/lib/db/integrity'
import {
  DEFAULT_CLIENT_TEAM_NAME,
  DEFAULT_SUBTEAM_POLICY,
  clientTeamDisplayName,
} from '@/lib/auth/server'

function withoutFinancialAccess(policy?: Record<string, boolean>) {
  return {
    ...DEFAULT_SUBTEAM_POLICY,
    ...(policy || {}),
    invoices: false,
    subscriptions: false,
    billing: false,
  }
}

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

  /** The organisation team used by the client portal (invite / project access). */
  static async getOrCreateDefaultTeam(clientId: string) {
    return prisma.clientSubTeam.upsert({
      where: { clientId_name: { clientId, name: DEFAULT_CLIENT_TEAM_NAME } },
      update: {},
      create: {
        clientId,
        name: DEFAULT_CLIENT_TEAM_NAME,
        description: 'Organisation team on the client portal',
        email: `default-${clientId.slice(0, 8)}@team.tvita`,
        allowedProjects: [],
        accessPolicy: DEFAULT_SUBTEAM_POLICY,
        status: 'ACTIVE',
      },
    })
  }

  /**
   * Create a sub-team with optional container email and project permissions
   */
  static async createSubTeam(input: CreateSubTeamInput) {
    const name = input.name.trim()
    await assertSubTeamNameAvailable(input.clientId, name)
    const allowedProjects = await sanitizeAllowedProjectIds(input.clientId, input.allowedProjects)

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const subTeamEmail = input.email && input.email.trim()
      ? input.email.trim().toLowerCase()
      : `${slug}-${Date.now()}@team.tvita`

    return prisma.clientSubTeam.create({
      data: {
        clientId: input.clientId,
        name,
        description: input.description || null,
        email: subTeamEmail,
        allowedProjects,
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
  static async softDeleteSubTeam(subTeamId: string, clientId: string) {
    const team = await prisma.clientSubTeam.findFirst({
      where: { id: subTeamId, clientId },
      select: { id: true },
    })
    if (!team) throw new NotFoundError('Sub-team not found')

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
  static async softRemoveMember(memberId: string, clientId: string) {
    const member = await prisma.clientSubTeamMember.findFirst({
      where: { id: memberId, subTeam: { clientId } },
      include: { subTeam: { select: { clientId: true } } },
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

    const existingMember = await prisma.clientSubTeamMember.findUnique({
      where: { email: cleanEmail },
      include: { profile: true },
    })

    const team = await ClientRepository.findSubTeamById(input.subTeamId)
    if (!team) throw new Error('Sub-team not found')
    if (team.clientId !== input.clientId) {
      throw new ValidationError('Sub-team does not belong to this client')
    }

    const customPolicy =
      team.name === DEFAULT_CLIENT_TEAM_NAME
        ? withoutFinancialAccess(input.customPolicy)
        : input.customPolicy

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    if (existingMember) {
      if (existingMember.subTeamId === input.subTeamId && existingMember.status === 'ACTIVE') {
        throw new Error(`Member ${cleanEmail} is already active in this team`)
      }

      const existingTeam = await ClientRepository.findSubTeamById(existingMember.subTeamId)
      if (existingTeam && existingTeam.clientId !== input.clientId) {
        throw new ValidationError('This email is already a member of another organisation')
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
          ...(customPolicy ? { customPolicy } : {}),
          status: 'ACTIVE',
        },
        include: {
          role: true,
          profile: { select: { email: true, name: true, isActive: true } },
        },
      })

      await sendClientTeamInvite({
        to: cleanEmail,
        teamName: clientTeamDisplayName(team.name, input.clientName),
        clientName: input.clientName,
        inviteLink,
      }).catch(() => {})

      return updatedMember
    }

    // Check if profile exists
    const existingProfile = await prisma.profile.findUnique({ where: { email: cleanEmail } })
    let authUserId: string

    if (existingProfile) {
      if (existingProfile.role !== 'CLIENT') {
        throw new ValidationError('This email belongs to an agency account and cannot be invited as a client teammate')
      }
      const boundClient = await prisma.client.findUnique({
        where: { profileId: existingProfile.id },
        select: { id: true },
      })
      if (boundClient && boundClient.id !== input.clientId) {
        throw new ValidationError('This email is already linked to another client organisation')
      }
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
        ...(customPolicy ? { customPolicy } : {}),
        status: 'ACTIVE',
      },
      include: {
        role: true,
        profile: { select: { email: true, name: true, isActive: true } },
      },
    })

    await sendClientTeamInvite({
      to: cleanEmail,
      teamName: clientTeamDisplayName(team.name, input.clientName),
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

    if (team.name === DEFAULT_CLIENT_TEAM_NAME && name !== undefined && name.trim() !== DEFAULT_CLIENT_TEAM_NAME) {
      throw new ValidationError('The organisation team cannot be renamed')
    }

    if (name !== undefined && name.trim() !== team.name) {
      await assertSubTeamNameAvailable(clientId, name, subTeamId)
    }

    let newPolicy = team.accessPolicy as object
    if (policy && typeof policy === 'object') {
      newPolicy = {
        ...(team.accessPolicy as object),
        ...policy,
      }
    }

    if (team.name === DEFAULT_CLIENT_TEAM_NAME) {
      newPolicy = {
        ...DEFAULT_SUBTEAM_POLICY,
        ...(typeof newPolicy === 'object' && newPolicy ? newPolicy : {}),
        invoices: false,
        subscriptions: false,
        billing: false,
      }
    }

    const nextAllowed =
      allowedProjects !== undefined
        ? await sanitizeAllowedProjectIds(clientId, allowedProjects)
        : undefined

    const updated = await prisma.clientSubTeam.update({
      where: { id: subTeamId },
      data: {
        name: name !== undefined ? name.trim() : team.name,
        description: description !== undefined ? description : team.description,
        email: email ?? team.email,
        status: (status as any) ?? team.status,
        accessPolicy: newPolicy,
        ...(nextAllowed !== undefined ? { allowedProjects: nextAllowed } : {}),
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
    clientId: string,
    body: {
      name?: string
      designation?: string
      roleId?: string
      customPolicy?: Record<string, boolean>
      status?: string
    }
  ) {
    const member = await prisma.clientSubTeamMember.findFirst({
      where: { id: memberId, subTeamId, subTeam: { clientId } },
      include: { subTeam: { select: { name: true } } },
    })
    if (!member) throw new Error('Sub-team member not found')

    const { name, designation, roleId, status } = body
    let customPolicy = body.customPolicy
    if (customPolicy !== undefined && member.subTeam.name === DEFAULT_CLIENT_TEAM_NAME) {
      customPolicy = withoutFinancialAccess(customPolicy)
    }

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
    const trimmed = name.trim()
    if (!trimmed) throw new ValidationError('Role name is required')
    const existing = await prisma.clientSubTeamRole.findFirst({
      where: { subTeamId, name: trimmed },
      select: { id: true },
    })
    if (existing) throw new ConflictError('A role with this name already exists on this team')

    return prisma.clientSubTeamRole.create({
      data: {
        subTeamId,
        name: trimmed,
        description: description || null,
        permissions: permissions || {},
      },
    })
  }
}

