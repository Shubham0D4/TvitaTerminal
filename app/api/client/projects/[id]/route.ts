import { apiSuccess, Errors } from '@/lib/api-response'
import { AuthService } from '@/lib/services/auth.service'
import { ClientService } from '@/lib/services/client.service'
import { ProjectService } from '@/lib/services/project.service'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await AuthService.getCurrentUser()
  if (!user || !AuthService.checkIsClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const subTeamCtx = await AuthService.getSubTeamContext(user.id)
    if (subTeamCtx && !subTeamCtx.policy.projects) {
      return Errors.FORBIDDEN('Project access is restricted by policy')
    }

    const client = await (subTeamCtx
      ? prisma.client.findUnique({ where: { id: subTeamCtx.clientId } })
      : ClientService.getClientByUserId(user.id, user.email))

    if (!client) {
      return Errors.NOT_FOUND('Client')
    }

    const showMilestones = subTeamCtx ? Boolean(subTeamCtx.policy.milestones) : true
    const project = await ProjectService.getClientProjectDetail(id, client.id, showMilestones)

    if (!project) {
      return Errors.NOT_FOUND('Project')
    }

    return apiSuccess(project)
  } catch (error) {
    console.error('Client project GET API error:', error)
    return Errors.INTERNAL('Failed to fetch project detail')
  }
}
