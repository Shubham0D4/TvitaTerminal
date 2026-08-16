import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser } from '@/lib/auth/server'
import { TaskService } from '@/application/services/task.service'
import { NextRequest } from 'next/server'

export async function POST(
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
    const { content } = body

    const comment = await TaskService.addTaskComment(taskId, content, user)
    return apiSuccess(comment, 201)
  } catch (error: any) {
    console.error('Task add comment API error:', error)
    if (error.name === 'ValidationError') {
      return Errors.VALIDATION(error.message)
    }
    if (error.name === 'NotFoundError') {
      return Errors.NOT_FOUND(error.message)
    }
    return Errors.INTERNAL('Failed to add comment')
  }
}
