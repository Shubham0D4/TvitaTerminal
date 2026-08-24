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

  const subTeamCtx = await AuthService.getSubTeamContext(user.id)
  if (subTeamCtx) return Errors.FORBIDDEN('Sub-team members cannot remove others')

  const { memberId } = await params

  const result = await ClientService.softRemoveMember(memberId)
  if (!result) return Errors.NOT_FOUND('Member')

  return apiSuccess({ deleted: true })
}
