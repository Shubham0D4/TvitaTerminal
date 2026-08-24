import { NextRequest } from 'next/server'
import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { getServerUser } from '@/lib/auth/server'
import { MeetingService } from '@/lib/services/meeting.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  const { id } = await params

  try {
    const meetings = await MeetingService.getMeetingsList(id, user)
    return apiSuccess(meetings)
  } catch (error: any) {
    console.error('GET meetings error:', error)
    return Errors.INTERNAL(error.message || 'Failed to fetch meetings')
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
    const meeting = await MeetingService.createMeeting({ ...body, projectId: id }, user)
    return apiSuccess(meeting, 201)
  } catch (error: any) {
    console.error('POST meeting error:', error)
    if (error.name === 'ValidationError') {
      return Errors.VALIDATION(error.message)
    }
    return Errors.INTERNAL(error.message || 'Failed to schedule meeting')
  }
}
