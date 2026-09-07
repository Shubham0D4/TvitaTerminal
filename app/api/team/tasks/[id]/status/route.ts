import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { getServerUser, isTeamMember, isAdmin } from '@/lib/auth/server'
import { TaskService } from '@/lib/services/task.service'
import { TaskStatus } from '@prisma/client'
import { NextRequest } from 'next/server'

export async function PATCH(
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
    const { status: targetStatus } = body

    if (!targetStatus) {
      return Errors.VALIDATION('status is required')
    }

    const updated = await TaskService.updateTaskStatus(taskId, targetStatus as TaskStatus, user)
    return apiSuccess(updated)
  } catch (error: any) {
    console.error('Update task status API error:', error)
    return fromUnknownError(error, 'Failed to update task status')
  }
}
