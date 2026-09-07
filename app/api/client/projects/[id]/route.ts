import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { AuthService } from '@/lib/services/auth.service'
import { ProjectService } from '@/lib/services/project.service'
import { NextRequest } from 'next/server'
import { assertClientPolicy, assertProjectAccess, hasClientPolicy } from '@/lib/auth/access'

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
    const { client, subTeam } = await AuthService.resolveClientActor(user)
    assertClientPolicy(subTeam, 'projects')
    await assertProjectAccess(user, id, { clientPolicy: 'projects' })

    const showMilestones = hasClientPolicy(subTeam, 'milestones')
    const project = await ProjectService.getClientProjectDetail(id, client.id, showMilestones)

    if (!project) {
      return Errors.NOT_FOUND('Project')
    }

    return apiSuccess(project)
  } catch (error) {
    console.error('Client project GET API error:', error)
    return fromUnknownError(error, 'Failed to fetch project detail')
  }
}
