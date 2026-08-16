import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getClientSubTeamContext, getServerUser, isClient } from '@/lib/auth/server'
import { ClientService } from '@/application/services/client.service'
import { NextRequest } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ subTeamId: string; memberId: string }> }
) {
  const user = await getServerUser()
  if (!user || !isClient(user)) return Errors.UNAUTHORIZED()

  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx) return Errors.FORBIDDEN('Only primary client can modify team members')

  const { subTeamId, memberId } = await params

  try {
    const client = await ClientService.getClientByUserId(user.id, user.email)
    if (!client) return Errors.NOT_FOUND('Client account')

    const body = await request.json()
    const updated = await ClientService.updateSubTeamMember(subTeamId, memberId, body)
    return apiSuccess(updated)
  } catch (error: any) {
    console.error('Update subteam member error:', error)
    if (error.message === 'Sub-team member not found') {
      return Errors.NOT_FOUND('Sub-team member')
    }
    return Errors.INTERNAL('Failed to update team member')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ subTeamId: string; memberId: string }> }
) {
  const user = await getServerUser()
  if (!user || !isClient(user)) return Errors.UNAUTHORIZED()

  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx) return Errors.FORBIDDEN('Only primary client can delete team members')

  const { subTeamId, memberId } = await params

  try {
    const client = await ClientService.getClientByUserId(user.id, user.email)
    if (!client) return Errors.NOT_FOUND('Client account')

    // Soft remove: set member status INACTIVE and deactivate associated profile (preserving history & logs)
    const result = await ClientService.softRemoveMember(memberId)
    if (!result) return Errors.NOT_FOUND('Sub-team member')

    return apiSuccess(result)
  } catch (error) {
    console.error('Soft delete subteam member error:', error)
    return Errors.INTERNAL('Failed to soft remove team member')
  }
}
