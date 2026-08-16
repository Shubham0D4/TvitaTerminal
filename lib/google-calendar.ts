import { google } from 'googleapis'

export async function scheduleGoogleMeetEvent({
  title,
  description,
  scheduledAt,
  duration,
}: {
  title: string
  description?: string
  scheduledAt: Date
  duration: number
}) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn('Google Calendar API environment variables are not fully configured. Using mock meeting link.')
    const mockMeetCode = Math.random().toString(36).substring(2, 5) + '-' +
                         Math.random().toString(36).substring(2, 6) + '-' +
                         Math.random().toString(36).substring(2, 5)
    return {
      eventId: 'mock_' + Math.random().toString(36).substring(2, 10),
      meetLink: `https://meet.google.com/${mockMeetCode}`
    }
  }

  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
    oauth2Client.setCredentials({ refresh_token: refreshToken })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const end = new Date(scheduledAt.getTime() + duration * 60 * 1000)

    const event = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: title,
        description: description || 'Project Meeting',
        start: { dateTime: scheduledAt.toISOString() },
        end: { dateTime: end.toISOString() },
        conferenceData: {
          createRequest: {
            requestId: 'meet_' + Math.random().toString(36).substring(2, 10),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    })

    const eventId = event.data.id || null
    const meetLink = event.data.conferenceData?.entryPoints?.[0]?.uri || null

    return { eventId, meetLink }
  } catch (error) {
    console.error('Failed to create google calendar event:', error)
    const mockMeetCode = Math.random().toString(36).substring(2, 5) + '-' +
                         Math.random().toString(36).substring(2, 6) + '-' +
                         Math.random().toString(36).substring(2, 5)
    return {
      eventId: 'mock_' + Math.random().toString(36).substring(2, 10),
      meetLink: `https://meet.google.com/${mockMeetCode}`
    }
  }
}
