import { prisma } from '@/lib/prisma'
import { AuthUser } from '@/lib/auth/server'
import { ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors'
import { writeAuditLog } from '@/lib/audit'
import { scheduleGoogleMeetEvent } from '@/lib/google-calendar'
import { google } from 'googleapis'
import { assertProjectAccess, isProjectManager, redactAgencyPersonForClient } from '@/lib/auth/access'

export class MeetingService {
  static async validateProjectAccess(projectId: string, user: AuthUser) {
    return assertProjectAccess(user, projectId, { clientPolicy: 'projects' })
  }

  static async getMeetingsList(projectId: string, user: AuthUser) {
    const project = await this.validateProjectAccess(projectId, user)
    const meetings = await prisma.meeting.findMany({
      where: { projectId },
      include: {
        host: { select: { id: true, name: true, role: true } }
      },
      orderBy: { scheduledAt: 'asc' }
    })

    if (user.role === 'CLIENT') {
      return meetings
        .filter((meeting) => (
          meeting.host.role === 'CLIENT'
          || meeting.hostId === project.leadId
          || meeting.host.role === 'ADMIN'
        ))
        .map((meeting) => ({
          ...meeting,
          host: redactAgencyPersonForClient(meeting.host, project.leadId),
        }))
    }

    if (user.role === 'TEAM_MEMBER' && !isProjectManager(user, project)) {
      return meetings.filter((meeting) => meeting.host.role !== 'CLIENT')
    }

    return meetings
  }

  static async createMeeting(
    body: { projectId: string; title: string; description?: string; scheduledAt: string; duration?: number; meetLink?: string },
    user: AuthUser
  ) {
    const { projectId, title, description, scheduledAt, duration = 30, meetLink: customMeetLink } = body
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

    let eventId: string | null
    let meetLink: string | null

    if (customMeetLink) {
      // User pasted a custom link — skip Google Calendar API
      eventId = `mock_manual_${Math.random().toString(36).substring(2, 10)}`
      meetLink = customMeetLink
    } else {
      const result = await scheduleGoogleMeetEvent({
        title,
        description,
        scheduledAt: scheduledDate,
        duration,
      })
      eventId = result.eventId
      meetLink = result.meetLink
    }

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

    const project = await this.validateProjectAccess(meeting.projectId, user)

    const canManage = isProjectManager(user, project)
    const isHost = meeting.hostId === user.id

    if (!isHost && !canManage) {
      throw new AuthorizationError('Only the host or project lead can cancel this meeting')
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
