import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { AuthService } from '@/application/services/auth.service'
import { ClientService } from '@/application/services/client.service'
import { NextRequest } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ subTeamId: string }> }
) {
  const user = await AuthService.getCurrentUser()
  if (!user || !AuthService.checkIsClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { subTeamId } = await params

  try {
    const subTeamCtx = await AuthService.getSubTeamContext(user.id)
    if (subTeamCtx) {
      return Errors.FORBIDDEN('Only primary client can modify sub-teams')
    }

    const client = await ClientService.getClientByUserId(user.id, user.email)
    if (!client) return Errors.NOT_FOUND('Client account')

    const body = await request.json()
    const updated = await ClientService.updateSubTeam(subTeamId, client.id, body)
    return apiSuccess(updated)
  } catch (error: any) {
    console.error('Client update sub-team API error:', error)
    if (error.message === 'Sub-team not found') {
      return Errors.NOT_FOUND('Sub-team')
    }
    if (error.message.includes('revoked')) {
      return Errors.FORBIDDEN(error.message)
    }
    return Errors.INTERNAL('Failed to update sub-team')
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ subTeamId: string }> }
) {
  return PUT(request, context)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ subTeamId: string }> }
) {
  const user = await AuthService.getCurrentUser()
  if (!user || !AuthService.checkIsClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { subTeamId } = await params

  try {
    const subTeamCtx = await AuthService.getSubTeamContext(user.id)
    if (subTeamCtx) {
      return Errors.FORBIDDEN('Only primary client can delete sub-teams')
    }

    const client = await ClientService.getClientByUserId(user.id, user.email)
    if (!client) return Errors.NOT_FOUND('Client account')

    const result = await ClientService.softDeleteSubTeam(subTeamId)
    return apiSuccess(result)
  } catch (error) {
    console.error('Client soft delete sub-team API error:', error)
    return Errors.INTERNAL('Failed to deactivate sub-team')
  }
}
