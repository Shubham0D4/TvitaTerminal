import { prisma } from '@/lib/prisma'
import { ConflictError, ValidationError } from '@/lib/errors'

export function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase()
  return trimmed ? trimmed : null
}

export async function assertClientEmailAvailable(
  email: string | null | undefined,
  excludeClientId?: string
) {
  const normalized = normalizeEmail(email)
  if (!normalized) return
  const existing = await prisma.client.findFirst({
    where: {
      email: normalized,
      ...(excludeClientId ? { id: { not: excludeClientId } } : {}),
    },
    select: { id: true },
  })
  if (existing) {
    throw new ConflictError('A client with this email already exists')
  }
}

export async function assertProjectBelongsToClient(projectId: string, clientId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, clientId },
    select: { id: true },
  })
  if (!project) {
    throw new ValidationError('Project does not belong to this client')
  }
}

export async function assertMilestoneBelongsToProject(milestoneId: string, projectId: string) {
  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, projectId },
    select: { id: true },
  })
  if (!milestone) {
    throw new ValidationError('Milestone does not belong to this project')
  }
}

export async function assertSubTeamNameAvailable(
  clientId: string,
  name: string,
  excludeSubTeamId?: string
) {
  const trimmed = name.trim()
  if (!trimmed) throw new ValidationError('Sub-team name is required')
  const existing = await prisma.clientSubTeam.findFirst({
    where: {
      clientId,
      name: trimmed,
      ...(excludeSubTeamId ? { id: { not: excludeSubTeamId } } : {}),
    },
    select: { id: true },
  })
  if (existing) {
    throw new ConflictError('A sub-team with this name already exists for this client')
  }
}

/**
 * Keep only project IDs owned by this client.
 * `ALL` (or empty) means every project — stored as [].
 */
export async function sanitizeAllowedProjectIds(
  clientId: string,
  ids: unknown
): Promise<string[]> {
  if (!Array.isArray(ids) || ids.length === 0) return []
  const strings = ids.filter((value): value is string => typeof value === 'string' && value.length > 0)
  if (strings.includes('ALL')) return []

  const projects = await prisma.project.findMany({
    where: { clientId, id: { in: strings } },
    select: { id: true },
  })
  const owned = new Set(projects.map((project) => project.id))
  const unknown = strings.filter((id) => !owned.has(id))
  if (unknown.length > 0) {
    throw new ValidationError('allowedProjects contains IDs that are not this client\'s projects')
  }
  return strings
}
