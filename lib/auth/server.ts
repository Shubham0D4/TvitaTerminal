import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { prisma } from '@/lib/prisma'
import { Role, TeamRole } from '@prisma/client'
import { env } from '@/lib/config/env'
import { auth } from '@/lib/auth/config'
import { getPortalForRole, staleSessionLoginUrl } from '@/lib/auth/routes'

export type AuthUser = {
  id: string
  email: string
  role: Role
  teamRole: TeamRole | null
  name: string
}

export const getServerUser = cache(async (): Promise<AuthUser | null> => {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.email) return null

    const profile = await prisma.profile.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, role: true, teamRole: true, name: true, isActive: true },
    })

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
})

/**
 * Sends a caller with no valid session to the login page.
 *
 * Always prefer this to `redirect('/login')` from a layout, page or action.
 * Reaching this point means a session cookie survived the session it stood for,
 * and a bare redirect leaves that cookie in place — `proxy.ts` reads it as
 * "signed in" and bounces the request back into the portal, which lands here
 * again, forever. The flag this adds tells the proxy to bin the cookie.
 */
export function redirectToLogin(from?: string): never {
  redirect(staleSessionLoginUrl(from))
}

/**
 * Sends a signed-in user to the portal their role owns — the right response to
 * "authenticated, but not for this route". A role with no portal is a session
 * we can't place, so it is treated as stale rather than looped further.
 */
export function redirectToPortal(user: AuthUser): never {
  const portal = getPortalForRole(user.role)
  redirect(portal ?? staleSessionLoginUrl())
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
  return user?.teamRole === 'MEMBER'
}

export function isTester(user: AuthUser | null): boolean {
  return user?.teamRole === 'MEMBER'
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
  issues: boolean
  notes: boolean
}

export const DEFAULT_SUBTEAM_POLICY: AccessPolicy = {
  projects: true,
  milestones: true,
  approvals: true,
  invoices: false,
  subscriptions: false,
  billing: false,
  issues: true,
  notes: true,
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
export const getClientSubTeamContext = cache(async (userId: string): Promise<SubTeamContext | null> => {
  try {
    // 0. Primary client organization owner has full unrestricted access
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { email: true },
    })

    if (profile) {
      const primaryClient = await prisma.client.findFirst({
        where: {
          OR: [
            { profileId: userId },
            { email: profile.email },
          ],
        },
      })
      if (primaryClient) {
        return null
      }
    }

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
})

