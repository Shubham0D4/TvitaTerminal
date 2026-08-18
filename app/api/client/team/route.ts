import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { AuthService } from '@/application/services/auth.service'
import { ClientService } from '@/application/services/client.service'
import { ClientRepository } from '@/infrastructure/database/repositories/client.repository'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await AuthService.getCurrentUser()
  if (!user || !AuthService.checkIsClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const subTeamCtx = await AuthService.getSubTeamContext(user.id)
    let clientId: string | null = null

    if (subTeamCtx) {
      clientId = subTeamCtx.clientId
    } else {
      const client = await ClientService.getClientByUserId(user.id, user.email)
      if (!client) return Errors.NOT_FOUND('Client account')
      clientId = client.id
    }

    const subTeams = await ClientRepository.findSubTeams(
      { clientId, ...(subTeamCtx ? { id: subTeamCtx.subTeamId } : {}) },
      {
        profile: { select: { email: true, name: true, isActive: true } },
        roles: true,
        members: {
          include: {
            role: true,
            profile: { select: { email: true, name: true, isActive: true } },
          },
        },
      }
    )

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
