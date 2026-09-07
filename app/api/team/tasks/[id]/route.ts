import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { getServerUser, isTeamMember, isAdmin } from '@/lib/auth/server'
import { TaskService } from '@/lib/services/task.service'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || (!isTeamMember(user) && !isAdmin(user))) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const result = await TaskService.getTaskDetails(id, user)
    return apiSuccess(result)
  } catch (error) {
    console.error('Task GET API error:', error)
    return fromUnknownError(error, 'Failed to fetch task')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || (!isTeamMember(user) && !isAdmin(user))) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const body = await request.json()
    const updated = await TaskService.updateTask(id, body, user)
    return apiSuccess(updated)
  } catch (error) {
    console.error('Task PUT API error:', error)
    return fromUnknownError(error, 'Failed to update task')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || (!isTeamMember(user) && !isAdmin(user))) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const result = await TaskService.deleteTask(id, user)
    return apiSuccess(result)
  } catch (error) {
    console.error('Task DELETE API error:', error)
    return fromUnknownError(error, 'Failed to delete task')
  }
}
