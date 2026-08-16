import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser } from '@/lib/auth/server'
import { TaskService } from '@/application/services/task.service'
import { TaskStatus } from '@prisma/client'
import { NextRequest } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) {
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
    if (error.name === 'NotFoundError') {
      return Errors.NOT_FOUND(error.message)
    }
    if (error.name === 'ValidationError') {
      return Errors.VALIDATION(error.message)
    }
    return Errors.INTERNAL('Failed to update task status')
  }
}
