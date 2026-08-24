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
  isDeveloper,
  isTester,
  canManageDocuments,
  AuthUser,
  SubTeamContext,
  AccessPolicy,
} from '@/lib/auth/server'

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

  static checkIsTeamLead(user: AuthUser | null): boolean {
    return isTeamLead(user)
  }

  static checkCanManageDocs(user: AuthUser | null): boolean {
    return canManageDocuments(user)
  }
}

export type { AuthUser, SubTeamContext, AccessPolicy }
