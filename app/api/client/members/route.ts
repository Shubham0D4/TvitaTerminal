import { NextRequest } from 'next/server'
import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { AuthService } from '@/lib/services/auth.service'
import { ClientService } from '@/lib/services/client.service'
import { getAppBaseUrl } from '@/lib/utils/url'
import { prisma } from '@/lib/prisma'
import { publicMemberProfile } from '@/lib/auth/access'
import { DEFAULT_SUBTEAM_POLICY } from '@/lib/auth/server'

/**
 * GET /api/client/members
 * Returns all members of the client's organisation team
 */
export async function GET() {
  const user = await AuthService.getCurrentUser()
  if (!user || !AuthService.checkIsClient(user)) return Errors.UNAUTHORIZED()

  if (await AuthService.isSubTeamActor(user)) return Errors.FORBIDDEN('Team members cannot manage members')

  const client = await ClientService.getClientByUserId(user.id, user.email)
  if (!client) return Errors.NOT_FOUND('Client account')

  const defaultTeam = await ClientService.getOrCreateDefaultTeam(client.id)

  const members = await prisma.clientSubTeamMember.findMany({
    where: { subTeamId: defaultTeam.id },
    include: {
      profile: { select: { email: true, name: true, isActive: true, passwordHash: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return apiSuccess(
    members.map((m) => ({
      ...m,
      profile: publicMemberProfile(m.profile),
    }))
  )
}

/**
 * POST /api/client/members
 * Invite a member by email — projects and collaboration, no financial data
 */
export async function POST(request: NextRequest) {
  const user = await AuthService.getCurrentUser()
  if (!user || !AuthService.checkIsClient(user)) return Errors.UNAUTHORIZED()

  if (await AuthService.isSubTeamActor(user)) return Errors.FORBIDDEN('Team members cannot invite others')

  const client = await ClientService.getClientByUserId(user.id, user.email)
  if (!client) return Errors.NOT_FOUND('Client account')

  const body = await request.json()
  const { email, name } = body

  if (!email || !email.includes('@')) {
    return Errors.VALIDATION('A valid email address is required')
  }

  const cleanEmail = email.trim().toLowerCase()
  const memberName = (name?.trim()) || cleanEmail.split('@')[0]

  const defaultTeam = await ClientService.getOrCreateDefaultTeam(client.id)
  const appUrl = getAppBaseUrl()

  const member = await ClientService.addOrReinviteMember({
    subTeamId: defaultTeam.id,
    clientId: client.id,
    clientName: client.name,
    name: memberName,
    email: cleanEmail,
    customPolicy: DEFAULT_SUBTEAM_POLICY,
    appUrl,
  })

  return apiSuccess(
    { ...member, profile: publicMemberProfile(member.profile) },
    201
  )
}
