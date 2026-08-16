import { NextRequest } from 'next/server'
import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser } from '@/lib/auth/server'
import { IssueService } from '@/application/services/issue.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  const { id } = await params

  try {
    const issues = await IssueService.getIssuesList(id, user)
    return apiSuccess(issues)
  } catch (error: any) {
    console.error('GET issues error:', error)
    return Errors.INTERNAL(error.message || 'Failed to fetch issues')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  const { id } = await params

  try {
    const body = await request.json()
    const issue = await IssueService.createIssue({ ...body, projectId: id }, user)
    return apiSuccess(issue, 201)
  } catch (error: any) {
    console.error('POST issue error:', error)
    if (error.name === 'ValidationError') {
      return Errors.VALIDATION(error.message)
    }
    return Errors.INTERNAL(error.message || 'Failed to create issue')
  }
}
