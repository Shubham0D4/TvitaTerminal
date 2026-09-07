import { NextRequest } from 'next/server'
import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { AuthService } from '@/lib/services/auth.service'
import { ClientService } from '@/lib/services/client.service'

/**
 * DELETE /api/client/members/[memberId]
 * Removes a member from the client's default team
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const user = await AuthService.getCurrentUser()
  if (!user || !AuthService.checkIsClient(user)) return Errors.UNAUTHORIZED()

  if (await AuthService.isSubTeamActor(user)) return Errors.FORBIDDEN('Team members cannot remove others')

  const { memberId } = await params

  const client = await ClientService.getClientByUserId(user.id, user.email)
  if (!client) return Errors.NOT_FOUND('Client account')

  const result = await ClientService.softRemoveMember(memberId, client.id)
  if (!result) return Errors.NOT_FOUND('Member')

  return apiSuccess({ deleted: true })
}
