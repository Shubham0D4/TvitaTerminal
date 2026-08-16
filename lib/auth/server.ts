import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/infrastructure/supabase/server'
import { Role, TeamRole } from '@prisma/client'
import { env } from '@/config/application/env'

export type AuthUser = {
  id: string
  email: string
  role: Role
  teamRole: TeamRole | null
  name: string
}

export async function getServerUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    let profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, role: true, teamRole: true, name: true, isActive: true },
    })

    if (!profile && user.email) {
      profile = await prisma.profile.findUnique({
        where: { email: user.email },
        select: { id: true, email: true, role: true, teamRole: true, name: true, isActive: true },
      })
    }

    if (!profile || !profile.isActive) return null

    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      teamRole: profile.teamRole,
      name: profile.name,
    }
  } catch {
    return null
  }
}

export function verifyThirdPartyAuth(request: Request): boolean {
  const apiKeyHeader = request.headers.get('x-api-key') || request.headers.get('authorization')
  const validApiKey = env.THIRD_PARTY_API_KEY || env.GMAIL_WEBHOOK_SECRET
  if (!validApiKey) return true // Allow in dev if not explicitly set
  if (!apiKeyHeader) return false
  return apiKeyHeader.includes(validApiKey)
}


export function requireRole(user: AuthUser | null, ...roles: Role[]): void {
  if (!user || !roles.includes(user.role)) {
    throw new Error('Unauthorized')
  }
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === Role.ADMIN
}

export function isTeamMember(user: AuthUser | null): boolean {
  return user?.role === Role.TEAM_MEMBER
}

export function isClient(user: AuthUser | null): boolean {
  return user?.role === Role.CLIENT
}

export function isTeamLead(user: AuthUser | null): boolean {
  return user?.teamRole === 'TEAM_LEAD'
}

export function isDeveloper(user: AuthUser | null): boolean {
  return user?.teamRole === 'DEVELOPER'
}

export function isTester(user: AuthUser | null): boolean {
  return user?.teamRole === 'TESTER'
}

export function canManageDocuments(user: AuthUser | null): boolean {
  return user?.role === 'ADMIN' || user?.teamRole === 'TEAM_LEAD'
}

// ─── Client Sub-Team Access Policy ───────────────────────────────────────────

export type AccessPolicy = {
  projects: boolean
  milestones: boolean
  approvals: boolean
  invoices: boolean
  subscriptions: boolean
  billing: boolean
}

export const DEFAULT_SUBTEAM_POLICY: AccessPolicy = {
  projects: true,
  milestones: true,
  approvals: true,
  invoices: false,
  subscriptions: false,
  billing: false,
}

export type SubTeamContext = {
  subTeamId: string
  clientId: string
  teamName: string
  memberId?: string
  memberName?: string
  roleName?: string
  allowedProjectIds: string[] // Project-level access restriction (empty array means all projects allowed)
  policy: AccessPolicy        // Component-level access specification
}

/**
 * If the logged-in CLIENT user is a sub-team member or sub-team login, returns their project & component access context.
 * Returns null if the user is the primary client organization (no restrictions).
 */
export async function getClientSubTeamContext(userId: string): Promise<SubTeamContext | null> {
  try {
    // 1. Check if user is an individual member of a sub-team
    const member = await prisma.clientSubTeamMember.findUnique({
      where: { profileId: userId },
      include: {
        subTeam: true,
        role: true,
      },
    })

    if (member) {
      if (member.status !== 'ACTIVE' || member.subTeam.status !== 'ACTIVE' || member.subTeam.revokedByAdmin) {
        return null
      }

      const rawTeamPolicy = (member.subTeam.accessPolicy || {}) as Partial<AccessPolicy>
      const rawRolePolicy = (member.role?.permissions || {}) as Partial<AccessPolicy>
      const rawMemberPolicy = (member.customPolicy || {}) as Partial<AccessPolicy>

      const policy: AccessPolicy = {
        ...DEFAULT_SUBTEAM_POLICY,
        ...rawTeamPolicy,
        ...rawRolePolicy,
        ...rawMemberPolicy,
      }

      let allowedProjectIds: string[] = []
      if (Array.isArray(member.subTeam.allowedProjects)) {
        allowedProjectIds = (member.subTeam.allowedProjects as string[]).filter((p) => typeof p === 'string' && p !== 'ALL')
      }

      return {
        subTeamId: member.subTeam.id,
        clientId: member.subTeam.clientId,
        teamName: member.subTeam.name,
        memberId: member.id,
        memberName: member.name,
        roleName: member.role?.name,
        allowedProjectIds,
        policy,
      }
    }

    // 2. Fallback check for direct sub-team profile logins
    const subTeam = await prisma.clientSubTeam.findUnique({
      where: { profileId: userId },
      select: {
        id: true,
        clientId: true,
        name: true,
        status: true,
        revokedByAdmin: true,
        accessPolicy: true,
        allowedProjects: true,
      },
    })

    if (!subTeam) return null
    if (subTeam.revokedByAdmin || subTeam.status !== 'ACTIVE') return null

    const rawPolicy = (subTeam.accessPolicy || {}) as Partial<AccessPolicy>
    const policy: AccessPolicy = { ...DEFAULT_SUBTEAM_POLICY, ...rawPolicy }

    let allowedProjectIds: string[] = []
    if (Array.isArray(subTeam.allowedProjects)) {
      allowedProjectIds = (subTeam.allowedProjects as string[]).filter((p) => typeof p === 'string' && p !== 'ALL')
    }

    return {
      subTeamId: subTeam.id,
      clientId: subTeam.clientId,
      teamName: subTeam.name,
      allowedProjectIds,
      policy,
    }
  } catch {
    return null
  }
}

