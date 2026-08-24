import { NextRequest } from 'next/server'
import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { AuthService } from '@/lib/services/auth.service'
import { ClientService } from '@/lib/services/client.service'
import { getAppBaseUrl } from '@/lib/utils/url'
import { prisma } from '@/lib/prisma'

// Default access policy for simple invite — everything except financial data
const DEFAULT_MEMBER_POLICY = {
  projects: true,
  milestones: true,
  notes: true,
  invoices: false,
  subscriptions: false,
  billing: false,
}

/**
 * GET /api/client/members
 * Returns all members across the client's default sub-team
 */
export async function GET() {
  const user = await AuthService.getCurrentUser()
  if (!user || !AuthService.checkIsClient(user)) return Errors.UNAUTHORIZED()

  const subTeamCtx = await AuthService.getSubTeamContext(user.id)
  if (subTeamCtx) return Errors.FORBIDDEN('Sub-team members cannot manage members')

  const client = await ClientService.getClientByUserId(user.id, user.email)
  if (!client) return Errors.NOT_FOUND('Client account')

  const defaultTeam = await getOrCreateDefaultTeam(client.id, client.name)

  const members = await prisma.clientSubTeamMember.findMany({
    where: { subTeamId: defaultTeam.id },
    include: {
      profile: { select: { email: true, name: true, isActive: true, passwordHash: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return apiSuccess(members)
}

/**
 * POST /api/client/members
 * Invite a member by email — sends magic link, full access minus financials
 */
export async function POST(request: NextRequest) {
  const user = await AuthService.getCurrentUser()
  if (!user || !AuthService.checkIsClient(user)) return Errors.UNAUTHORIZED()

  const subTeamCtx = await AuthService.getSubTeamContext(user.id)
  if (subTeamCtx) return Errors.FORBIDDEN('Sub-team members cannot invite others')

  const client = await ClientService.getClientByUserId(user.id, user.email)
  if (!client) return Errors.NOT_FOUND('Client account')

  const body = await request.json()
  const { email, name } = body

  if (!email || !email.includes('@')) {
    return Errors.VALIDATION('A valid email address is required')
  }

  const cleanEmail = email.trim().toLowerCase()
  const memberName = (name?.trim()) || cleanEmail.split('@')[0]

  const defaultTeam = await getOrCreateDefaultTeam(client.id, client.name)
  const appUrl = getAppBaseUrl()

  const member = await ClientService.addOrReinviteMember({
    subTeamId: defaultTeam.id,
    clientId: client.id,
    clientName: client.name,
    name: memberName,
    email: cleanEmail,
    customPolicy: DEFAULT_MEMBER_POLICY,
    appUrl,
  })

  return apiSuccess(member, 201)
}

/**
 * Finds the client's default sub-team or creates it if it doesn't exist.
 */
async function getOrCreateDefaultTeam(clientId: string, clientName: string) {
  const existing = await prisma.clientSubTeam.findFirst({
    where: { clientId, name: '__default__' },
  })

  if (existing) return existing

  return prisma.clientSubTeam.create({
    data: {
      clientId,
      name: '__default__',
      description: 'Default team for simple member invites',
      email: `default-${clientId.slice(0, 8)}@team.tvita`,
      allowedProjects: [],
      accessPolicy: DEFAULT_MEMBER_POLICY,
      status: 'ACTIVE',
    },
  })
}
