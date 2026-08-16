import { prisma } from '@/lib/prisma'
import { getClientSubTeamContext, AuthUser } from '@/lib/auth/server'
import { ValidationError, NotFoundError } from '@/shared/errors/application-errors'
import { writeAuditLog } from '@/lib/audit'
import { scheduleGoogleMeetEvent } from '@/lib/google-calendar'
import { google } from 'googleapis'

export class MeetingService {
  static async validateProjectAccess(projectId: string, user: AuthUser) {
    if (user.role === 'ADMIN') return true

    if (user.role === 'TEAM_MEMBER') {
      const pm = await prisma.projectMember.findFirst({
        where: { projectId, profileId: user.id }
      })
      if (!pm && user.teamRole !== 'TEAM_LEAD') {
        throw new Error('Unauthorized project access')
      }
      return true
    }

    if (user.role === 'CLIENT') {
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      })
      if (!project) throw new NotFoundError('Project not found')

      const subteam = await getClientSubTeamContext(user.id)
      const clientId = subteam ? subteam.clientId : (await prisma.client.findFirst({
        where: { profileId: user.id },
        select: { id: true }
      }))?.id

      if (!clientId || clientId !== project.clientId) {
        throw new Error('Unauthorized project access')
      }

      if (subteam) {
        if (subteam.allowedProjectIds.length > 0 && !subteam.allowedProjectIds.includes(projectId)) {
          throw new Error('Unauthorized project access')
        }
      }
      return true
    }

    throw new Error('Unauthorized')
  }

  static async getMeetingsList(projectId: string, user: AuthUser) {
    await this.validateProjectAccess(projectId, user)
    return prisma.meeting.findMany({
      where: { projectId },
      include: {
        host: { select: { id: true, name: true, role: true } }
      },
      orderBy: { scheduledAt: 'asc' }
    })
  }

  static async createMeeting(
    body: { projectId: string; title: string; description?: string; scheduledAt: string; duration?: number },
    user: AuthUser
  ) {
    const { projectId, title, description, scheduledAt, duration = 30 } = body
    if (!projectId || !title || !scheduledAt) {
      throw new ValidationError('projectId, title, and scheduledAt are required')
    }

    const scheduledDate = new Date(scheduledAt)
    if (scheduledDate.getTime() < Date.now()) {
      throw new ValidationError('Meetings must be scheduled in the future')
    }

    await this.validateProjectAccess(projectId, user)

    const activeMeetingsCount = await prisma.meeting.count({
      where: {
        projectId,
        scheduledAt: { gte: new Date() }
      }
    })

    if (activeMeetingsCount >= 3) {
      throw new ValidationError('Maximum of 3 scheduled meetings reached for this project. Please complete or cancel existing meetings first.')
    }

    const { eventId, meetLink } = await scheduleGoogleMeetEvent({
      title,
      description,
      scheduledAt: scheduledDate,
      duration,
    })

    const meeting = await prisma.meeting.create({
      data: {
        projectId,
        title,
        description,
        scheduledAt: scheduledDate,
        duration,
        hostId: user.id,
        meetLink,
        eventId,
      },
      include: {
        host: { select: { id: true, name: true, role: true } }
      }
    })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'CREATE',
      entityType: 'meeting',
      entityId: meeting.id,
      entityLabel: title,
      newValue: { projectId, scheduledAt, meetLink },
    })

    return meeting
  }

  static async deleteMeeting(id: string, user: AuthUser) {
    const meeting = await prisma.meeting.findUnique({ where: { id } })
    if (!meeting) throw new NotFoundError('Meeting not found')

    await this.validateProjectAccess(meeting.projectId, user)

    const isLeadOrAdmin = user.role === 'ADMIN' || user.teamRole === 'TEAM_LEAD'
    const isHost = meeting.hostId === user.id

    if (!isHost && !isLeadOrAdmin) {
      throw new Error('Only the host or admin can cancel this meeting')
    }

    if (meeting.eventId && !meeting.eventId.startsWith('mock_')) {
      try {
        const clientId = process.env.GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

        if (clientId && clientSecret && refreshToken) {
          const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
          oauth2Client.setCredentials({ refresh_token: refreshToken })
          const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
          await calendar.events.delete({
            calendarId: 'primary',
            eventId: meeting.eventId,
          })
        }
      } catch (err) {
        console.error('Failed to delete google calendar event:', err)
      }
    }

    await prisma.meeting.delete({ where: { id } })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'DELETE',
      entityType: 'meeting',
      entityId: id,
      entityLabel: meeting.title,
    })

    return { deleted: true }
  }
}
