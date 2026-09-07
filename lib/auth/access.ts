import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AuthorizationError, NotFoundError } from '@/lib/errors'
import { ClientRepository } from '@/lib/repositories/client.repository'
import {
  type AccessPolicy,
  type AuthUser,
  type SubTeamContext,
  getClientSubTeamContext,
  isAdmin,
  isClient,
  isTeamMember,
} from '@/lib/auth/server'

export { isSafeInternalPath } from '@/lib/auth/routes'

/**
 * Project Lead is Project.leadId (or ADMIN), never the global Profile.teamRole title.
 * Client collaborators are scoped by AccessPolicy + allowedProjectIds.
 */

export type ProjectAccess = {
  id: string
  clientId: string
  leadId: string | null
}

export type ClientActor = {
  client: NonNullable<Awaited<ReturnType<typeof ClientRepository.findClientForActor>>>
  subTeam: SubTeamContext | null
}

export function publicMemberProfile(profile: {
  email: string
  name: string
  isActive: boolean
  passwordHash?: string | null
} | null) {
  if (!profile) return null
  return {
    email: profile.email,
    name: profile.name,
    isActive: profile.isActive,
    hasPassword: Boolean(profile.passwordHash),
  }
}

export async function assertProjectAccess(
  user: AuthUser,
  projectId: string,
  options?: { clientPolicy?: keyof AccessPolicy }
): Promise<ProjectAccess> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, clientId: true, leadId: true },
  })
  if (!project) throw new NotFoundError('Project not found')

  if (isAdmin(user)) return project

  if (isTeamMember(user)) {
    if (project.leadId === user.id) return project
    const member = await prisma.projectMember.findFirst({
      where: { projectId, profileId: user.id },
      select: { id: true },
    })
    if (!member) throw new AuthorizationError('Unauthorized project access')
    return project
  }

  if (isClient(user)) {
    const subteam = await getClientSubTeamContext(user.id)
    let clientId: string | undefined

    if (subteam) {
      clientId = subteam.clientId
      if (options?.clientPolicy) {
        assertClientPolicy(subteam, options.clientPolicy)
      }
      if (
        subteam.allowedProjectIds.length > 0 &&
        !subteam.allowedProjectIds.includes(projectId)
      ) {
        throw new AuthorizationError('Unauthorized project access')
      }
    } else {
      const client = await prisma.client.findFirst({
        where: { OR: [{ profileId: user.id }, { email: user.email }] },
        select: { id: true },
      })
      clientId = client?.id
    }

    if (!clientId || clientId !== project.clientId) {
      throw new AuthorizationError('Unauthorized project access')
    }
    return project
  }

  throw new AuthorizationError('Unauthorized project access')
}

export function isProjectManager(user: AuthUser, project: { leadId: string | null }): boolean {
  return isAdmin(user) || project.leadId === user.id
}

/** Admin and project lead may act on any item; others only on work assigned to them. */
export function canActOnAssignedWork(
  user: AuthUser,
  project: { leadId: string | null },
  assignedIds: Array<string | null | undefined>
): boolean {
  if (isProjectManager(user, project)) return true
  return assignedIds.some((id) => id === user.id)
}

export async function assertProjectManage(
  user: AuthUser,
  projectId: string
): Promise<ProjectAccess> {
  const project = await assertProjectAccess(user, projectId)
  if (isProjectManager(user, project)) return project
  throw new AuthorizationError('Only the project lead or an admin can manage this project')
}

export function hasClientPolicy(
  subTeam: SubTeamContext | null | undefined,
  ...keys: (keyof AccessPolicy)[]
): boolean {
  if (!subTeam) return true
  if (keys.length === 0) return true
  return keys.some((key) => Boolean(subTeam.policy[key]))
}

export function assertClientPolicy(
  subTeam: SubTeamContext | null | undefined,
  ...keys: (keyof AccessPolicy)[]
): void {
  if (!hasClientPolicy(subTeam, ...keys)) {
    throw new AuthorizationError('Unauthorized by access policy')
  }
}

export async function isSubTeamActor(user: AuthUser): Promise<boolean> {
  return Boolean(await getClientSubTeamContext(user.id))
}

export async function assertPrimaryClient(
  user: AuthUser,
  message = 'Only the primary client can perform this action'
): Promise<void> {
  if (!isClient(user)) throw new AuthorizationError('Client access required')
  if (await isSubTeamActor(user)) throw new AuthorizationError(message)
}

export async function resolveClientActor(user: AuthUser): Promise<ClientActor> {
  if (!isClient(user)) throw new AuthorizationError('Client access required')
  const subTeam = await getClientSubTeamContext(user.id)
  const client = await ClientRepository.findClientForActor({
    userId: user.id,
    email: user.email,
    subTeamClientId: subTeam?.clientId,
  })
  if (!client) throw new NotFoundError('Client account')
  return { client, subTeam }
}

export async function getClientActor(user: AuthUser): Promise<ClientActor | null> {
  try {
    return await resolveClientActor(user)
  } catch {
    return null
  }
}

export function clientProjectWhere(
  clientId: string,
  subTeam: SubTeamContext | null | undefined
): Prisma.ProjectWhereInput {
  const allowed = subTeam?.allowedProjectIds ?? []
  if (allowed.length > 0) return { clientId, id: { in: allowed } }
  return { clientId }
}

export function clientInvoiceWhere(
  clientId: string,
  subTeam: SubTeamContext | null | undefined
): Prisma.InvoiceWhereInput {
  const allowed = subTeam?.allowedProjectIds ?? []
  const visibility: Prisma.InvoiceWhereInput = { status: { not: 'DRAFT' } }
  if (allowed.length === 0) return { clientId, ...visibility }
  return {
    clientId,
    ...visibility,
    OR: [{ projectId: null }, { projectId: { in: allowed } }],
  }
}

export { AGENCY_TEAM_LABEL, agencyNameForClient, redactAgencyPersonForClient } from '@/lib/auth/visibility'

export function canSeeClientLeadCommunication(
  user: AuthUser,
  project: { leadId: string | null }
): boolean {
  return isProjectManager(user, project)
}

export async function staffAccessibleProjectIds(user: AuthUser): Promise<string[] | null> {
  if (isAdmin(user)) return null
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { leadId: user.id },
        { members: { some: { profileId: user.id } } },
      ],
    },
    select: { id: true },
  })
  return projects.map((p) => p.id)
}

export async function assertSubTeamOwnedByClient(subTeamId: string, clientId: string) {
  const team = await prisma.clientSubTeam.findFirst({
    where: { id: subTeamId, clientId },
    select: { id: true, clientId: true, name: true, status: true },
  })
  if (!team) throw new NotFoundError('Sub-team not found')
  return team
}
