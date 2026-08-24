import { NextRequest } from 'next/server'
import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { getServerUser } from '@/lib/auth/server'
import { MeetingService } from '@/lib/services/meeting.service'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  const { meetingId } = await params

  try {
    const result = await MeetingService.deleteMeeting(meetingId, user)
    return apiSuccess(result)
  } catch (error: any) {
    console.error('DELETE meeting error:', error)
    if (error.name === 'NotFoundError') {
      return Errors.NOT_FOUND(error.message)
    }
    return Errors.INTERNAL(error.message || 'Failed to cancel meeting')
  }
}
