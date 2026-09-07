/**
 * Authentication & Authorization Service Layer
 * Single Responsibility: User identity resolution, role validation, and sub-team access policy evaluation.
 */

import {
  getServerUser,
  getClientSubTeamContext,
  isAdmin,
  isClient,
  isTeamMember,
  isTeamLead,
  canManageDocuments,
  AuthUser,
  SubTeamContext,
  AccessPolicy,
} from '@/lib/auth/server'
import {
  assertPrimaryClient,
  hasClientPolicy,
  isProjectManager,
  isSubTeamActor,
  resolveClientActor,
  type ClientActor,
} from '@/lib/auth/access'

export class AuthService {
  static async getCurrentUser(): Promise<AuthUser | null> {
    return getServerUser()
  }

  static async getSubTeamContext(userId: string): Promise<SubTeamContext | null> {
    return getClientSubTeamContext(userId)
  }

  static checkIsAdmin(user: AuthUser | null): boolean {
    return isAdmin(user)
  }

  static checkIsClient(user: AuthUser | null): boolean {
    return isClient(user)
  }

  static checkIsTeamMember(user: AuthUser | null): boolean {
    return isTeamMember(user)
  }

  /** Agency title only — not project authorization. */
  static checkIsTeamLead(user: AuthUser | null): boolean {
    return isTeamLead(user)
  }

  static checkCanManageDocs(user: AuthUser | null): boolean {
    return canManageDocuments(user)
  }

  static checkIsProjectManager(user: AuthUser, project: { leadId: string | null }): boolean {
    return isProjectManager(user, project)
  }

  static hasClientPolicy(subTeam: SubTeamContext | null | undefined, ...keys: (keyof AccessPolicy)[]): boolean {
    return hasClientPolicy(subTeam, ...keys)
  }

  static async isSubTeamActor(user: AuthUser): Promise<boolean> {
    return isSubTeamActor(user)
  }

  static async assertPrimaryClient(user: AuthUser, message?: string): Promise<void> {
    return assertPrimaryClient(user, message)
  }

  static async resolveClientActor(user: AuthUser): Promise<ClientActor> {
    return resolveClientActor(user)
  }
}

export type { AuthUser, SubTeamContext, AccessPolicy }
