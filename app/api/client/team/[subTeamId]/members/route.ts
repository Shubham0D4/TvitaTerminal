import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { AuthService } from '@/application/services/auth.service'
import { ClientService } from '@/application/services/client.service'
import { ClientRepository } from '@/infrastructure/database/repositories/client.repository'
import { getAppBaseUrl } from '@/shared/utilities/url'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subTeamId: string }> }
) {
  const user = await AuthService.getCurrentUser()
  if (!user || !AuthService.checkIsClient(user)) return Errors.UNAUTHORIZED()

  const { subTeamId } = await params
  try {
    const members = await ClientRepository.findSubTeamMembers(
      { subTeamId },
      {
        role: true,
        profile: { select: { email: true, name: true, isActive: true } },
      }
    )
    return apiSuccess(members)
  } catch (error) {
    console.error('Fetch subteam members error:', error)
    return Errors.INTERNAL('Failed to fetch members')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subTeamId: string }> }
) {
  const user = await AuthService.getCurrentUser()
  if (!user || !AuthService.checkIsClient(user)) return Errors.UNAUTHORIZED()

  const subTeamCtx = await AuthService.getSubTeamContext(user.id)
  if (subTeamCtx) return Errors.FORBIDDEN('Only primary client can manage team members')

  const { subTeamId } = await params

  try {
    const client = await ClientService.getClientByUserId(user.id, user.email)
    if (!client) return Errors.NOT_FOUND('Client account')

    const body = await request.json()
    const { name, email, designation, roleId, customPolicy } = body

    if (!name || !email) {
      return Errors.VALIDATION('Member name and email are required')
    }

    const appUrl = getAppBaseUrl()

    const member = await ClientService.addOrReinviteMember({
      subTeamId,
      clientId: client.id,
      clientName: client.name,
      name,
      email,
      designation,
      roleId,
      customPolicy,
      appUrl,
    })

    return apiSuccess(member, 201)
  } catch (error: any) {
    console.error('Create subteam member error:', error)
    return Errors.INTERNAL(error.message || 'Failed to create team member')
  }
}
