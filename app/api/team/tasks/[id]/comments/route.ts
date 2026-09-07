import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { getServerUser, isTeamMember, isAdmin } from '@/lib/auth/server'
import { TaskService } from '@/lib/services/task.service'
import { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || (!isTeamMember(user) && !isAdmin(user))) {
    return Errors.UNAUTHORIZED()
  }

  const { id: taskId } = await params

  try {
    const body = await request.json()
    const { content } = body

    const comment = await TaskService.addTaskComment(taskId, content, user)
    return apiSuccess(comment, 201)
  } catch (error: any) {
    console.error('Task add comment API error:', error)
    return fromUnknownError(error, 'Failed to add comment')
  }
}
