import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { getServerUser, isClient } from '@/lib/auth/server'
import { ClientService } from '@/lib/services/client.service'
import { NextRequest } from 'next/server'
import { isSubTeamActor } from '@/lib/auth/access'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ subTeamId: string; memberId: string }> }
) {
  const user = await getServerUser()
  if (!user || !isClient(user)) return Errors.UNAUTHORIZED()

  if (await isSubTeamActor(user)) return Errors.FORBIDDEN('Only primary client can modify team members')

  const { subTeamId, memberId } = await params

  try {
    const client = await ClientService.getClientByUserId(user.id, user.email)
    if (!client) return Errors.NOT_FOUND('Client account')

    const body = await request.json()
    const updated = await ClientService.updateSubTeamMember(subTeamId, memberId, client.id, body)
    return apiSuccess(updated)
  } catch (error: unknown) {
    console.error('Update subteam member error:', error)
    const { fromUnknownError } = await import('@/lib/utils/api-response')
    return fromUnknownError(error, 'Failed to update team member')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ subTeamId: string; memberId: string }> }
) {
  const user = await getServerUser()
  if (!user || !isClient(user)) return Errors.UNAUTHORIZED()

  if (await isSubTeamActor(user)) return Errors.FORBIDDEN('Only primary client can delete team members')

  const { subTeamId, memberId } = await params

  try {
    const client = await ClientService.getClientByUserId(user.id, user.email)
    if (!client) return Errors.NOT_FOUND('Client account')

    // Soft remove: set member status INACTIVE and deactivate associated profile (preserving history & logs)
    const result = await ClientService.softRemoveMember(memberId, client.id)
    if (!result) return Errors.NOT_FOUND('Sub-team member')

    return apiSuccess(result)
  } catch (error) {
    console.error('Soft delete subteam member error:', error)
    return Errors.INTERNAL('Failed to soft remove team member')
  }
}
