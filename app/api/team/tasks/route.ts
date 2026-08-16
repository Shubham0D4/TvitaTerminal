import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser, isTeamMember, isAdmin } from '@/lib/auth/server'
import { TaskService } from '@/application/services/task.service'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || (!isTeamMember(user) && !isAdmin(user))) {
    return Errors.UNAUTHORIZED()
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || ''
  const projectId = searchParams.get('projectId') || ''
  const assigneeId = searchParams.get('assigneeId') || ''

  try {
    const tasks = await TaskService.getTasksList({ status, projectId, assigneeId }, user)
    return apiSuccess(tasks)
  } catch (error: any) {
    console.error('Team tasks GET API error:', error)
    return Errors.INTERNAL('Failed to fetch tasks')
  }
}

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const body = await request.json()
    const task = await TaskService.createTask(body, user)
    return apiSuccess(task, 201)
  } catch (error: any) {
    console.error('Team task POST API error:', error)
    if (error.name === 'ValidationError') {
      return Errors.VALIDATION(error.message)
    }
    if (error.name === 'NotFoundError') {
      return Errors.NOT_FOUND(error.message)
    }
    return Errors.INTERNAL(error.message || 'Failed to create task')
  }
}
