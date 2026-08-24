import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { getClientSubTeamContext, getServerUser, isClient } from '@/lib/auth/server'
import { ClientService } from '@/lib/services/client.service'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subTeamId: string }> }
) {
  const user = await getServerUser()
  if (!user || !isClient(user)) return Errors.UNAUTHORIZED()

  const { subTeamId } = await params
  try {
    const roles = await prisma.clientSubTeamRole.findMany({
      where: { subTeamId },
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess(roles)
  } catch (error) {
    console.error('Fetch subteam roles error:', error)
    return Errors.INTERNAL('Failed to fetch roles')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subTeamId: string }> }
) {
  const user = await getServerUser()
  if (!user || !isClient(user)) return Errors.UNAUTHORIZED()

  const subTeamCtx = await getClientSubTeamContext(user.id)
  if (subTeamCtx) return Errors.FORBIDDEN('Only primary client can manage team roles')

  const { subTeamId } = await params

  try {
    const client = await ClientService.getClientByUserId(user.id, user.email)
    if (!client) return Errors.NOT_FOUND('Client account')

    const team = await prisma.clientSubTeam.findFirst({
      where: { id: subTeamId, clientId: client.id },
    })
    if (!team) return Errors.NOT_FOUND('Sub-team')

    const body = await request.json()
    const { name, description, permissions } = body

    if (!name || !name.trim()) {
      return Errors.VALIDATION('Role name is required')
    }

    const role = await ClientService.createSubTeamRole(subTeamId, name, description, permissions)
    return apiSuccess(role, 201)
  } catch (error) {
    console.error('Create subteam role error:', error)
    return Errors.INTERNAL('Failed to create role')
  }
}
