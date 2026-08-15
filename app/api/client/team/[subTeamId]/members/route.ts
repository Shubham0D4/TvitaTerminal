import { apiSuccess, Errors } from '@/lib/api-response'
import { AuthService } from '@/lib/services/auth.service'
import { ClientService } from '@/lib/services/client.service'
import { prisma } from '@/lib/prisma'
import { getAppBaseUrl } from '@/lib/url'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subTeamId: string }> }
) {
  const user = await AuthService.getCurrentUser()
  if (!user || !AuthService.checkIsClient(user)) return Errors.UNAUTHORIZED()

  const { subTeamId } = await params
  try {
    const members = await prisma.clientSubTeamMember.findMany({
      where: { subTeamId },
      include: {
        role: true,
        profile: { select: { email: true, name: true, isActive: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
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

    const appUrl = getAppBaseUrl(request)

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
  } catch (error: unknown) {
    console.error('Create subteam member error:', error)
    return Errors.INTERNAL((error as Error)?.message || 'Failed to create team member')
  }
}
