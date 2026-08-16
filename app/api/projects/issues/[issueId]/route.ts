import { NextRequest } from 'next/server'
import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser } from '@/lib/auth/server'
import { IssueService } from '@/application/services/issue.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  const { issueId } = await params

  try {
    const body = await request.json()
    const issue = await IssueService.updateIssue(issueId, body, user)
    return apiSuccess(issue)
  } catch (error: any) {
    console.error('PATCH issue error:', error)
    if (error.name === 'ValidationError') {
      return Errors.VALIDATION(error.message)
    }
    if (error.name === 'NotFoundError') {
      return Errors.NOT_FOUND(error.message)
    }
    return Errors.INTERNAL(error.message || 'Failed to update issue')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  const { issueId } = await params

  try {
    const result = await IssueService.deleteIssue(issueId, user)
    return apiSuccess(result)
  } catch (error: any) {
    console.error('DELETE issue error:', error)
    if (error.name === 'NotFoundError') {
      return Errors.NOT_FOUND(error.message)
    }
    return Errors.INTERNAL(error.message || 'Failed to delete issue')
  }
}
