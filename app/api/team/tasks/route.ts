import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { getServerUser, isTeamMember, isAdmin } from '@/lib/auth/server'
import { TaskService } from '@/lib/services/task.service'
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
  } catch (error) {
    console.error('Team tasks GET API error:', error)
    return fromUnknownError(error, 'Failed to fetch tasks')
  }
}

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user || (!isTeamMember(user) && !isAdmin(user))) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const body = await request.json()
    const task = await TaskService.createTask(body, user)
    return apiSuccess(task, 201)
  } catch (error) {
    console.error('Team task POST API error:', error)
    return fromUnknownError(error, 'Failed to create task')
  }
}
