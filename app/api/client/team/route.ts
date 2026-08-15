import { apiSuccess, Errors } from '@/lib/api-response'
import { AuthService } from '@/lib/services/auth.service'
import { ClientService } from '@/lib/services/client.service'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await AuthService.getCurrentUser()
  if (!user || !AuthService.checkIsClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const subTeamCtx = await AuthService.getSubTeamContext(user.id)
    if (subTeamCtx) {
      return Errors.FORBIDDEN('Only primary client can manage sub-teams')
    }

    const client = await ClientService.getClientByUserId(user.id, user.email)
    if (!client) return Errors.NOT_FOUND('Client account')

    const subTeams = await prisma.clientSubTeam.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
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

    return apiSuccess(subTeams)
  } catch (error) {
    console.error('Client sub-teams GET API error:', error)
    return Errors.INTERNAL('Failed to fetch sub-teams')
  }
}

export async function POST(request: NextRequest) {
  const user = await AuthService.getCurrentUser()
  if (!user || !AuthService.checkIsClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const subTeamCtx = await AuthService.getSubTeamContext(user.id)
    if (subTeamCtx) {
      return Errors.FORBIDDEN('Only primary client can create sub-teams')
    }

    const client = await ClientService.getClientByUserId(user.id, user.email)
    if (!client) return Errors.NOT_FOUND('Client account')

    const body = await request.json()
    const { name, email, description, policy, allowedProjects } = body

    if (!name) {
      return Errors.VALIDATION('Sub-team name is required')
    }

    const subTeam = await ClientService.createSubTeam({
      clientId: client.id,
      name,
      description,
      email,
      allowedProjects,
      policy,
    })

    return apiSuccess(subTeam, 201)
  } catch (error) {
    console.error('Client create sub-team API error:', error)
    return Errors.INTERNAL('Failed to create sub-team')
  }
}
