'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, X, Calendar, Video, Clock, Trash2, ExternalLink, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/utils/api-client'
import { agencyNameForClient } from '@/lib/auth/visibility'

interface Meeting {
  id: string
  title: string
  description?: string
  scheduledAt: string
  duration: number
  meetLink?: string
  hostId: string
  host: { id: string; name: string; role: string }
}

interface Props {
  projectId: string
  userRole: string
  userTeamRole: string | null
  userId: string
  hasAccess: boolean
  projectLeadId?: string | null
}

function getMeetPlatformLabel(url: string): string {
  if (!url) return 'Join Meeting'
  if (url.includes('meet.google.com')) return 'Join Google Meet'
  if (url.includes('zoom.us')) return 'Join Zoom Meeting'
  if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) return 'Join MS Teams Meeting'
  if (url.includes('whereby.com')) return 'Join Whereby Room'
  if (url.includes('webex.com')) return 'Join Webex Meeting'
  return 'Join Meeting'
}

function getMeetPlatformColor(url: string): string {
  if (!url) return '#10b981'
  if (url.includes('meet.google.com')) return '#10b981'
  if (url.includes('zoom.us')) return '#2D8CFF'
  if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) return '#6264A7'
  return '#10b981'
}

export default function MeetingsModule({ projectId, userRole, userTeamRole, userId, hasAccess, projectLeadId = null }: Props) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState(30)
  const [linkMode, setLinkMode] = useState<'auto' | 'custom'>('auto')
  const [customLink, setCustomLink] = useState('')

  useEffect(() => {
    if (!hasAccess) return
    apiClient.get<Meeting[]>(`/api/projects/${projectId}/meetings`)
      .then((res) => {
        setMeetings(res)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        toast.error('Failed to load meetings')
        setLoading(false)
      })
  }, [projectId, hasAccess])

  if (!hasAccess) {
    return (
      <div className="card text-center py-6">
        <p style={{ color: 'var(--text-muted)' }}>You do not have permission to access meetings for this project.</p>
      </div>
    )
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !scheduledAt) return
    if (linkMode === 'custom' && !customLink.trim()) {
      toast.error('Please enter a valid meeting link')
      return
    }

    startTransition(async () => {
      try {
        const payload: Record<string, any> = {
          title,
          description,
          scheduledAt,
          duration: Number(duration),
        }
        if (linkMode === 'custom' && customLink.trim()) {
          payload.meetLink = customLink.trim()
        }
        const newMeeting = await apiClient.post<Meeting>(`/api/projects/${projectId}/meetings`, payload)
        setMeetings((prev) => [...prev, newMeeting].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()))
        toast.success('Meeting scheduled successfully')
        setShowCreate(false)
        setTitle('')
        setDescription('')
        setScheduledAt('')
        setDuration(30)
        setLinkMode('auto')
        setCustomLink('')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to schedule meeting'
        toast.error(msg)
      }
    })
  }

  const handleDelete = (meetingId: string) => {
    if (!confirm('Are you sure you want to cancel this meeting?')) return

    startTransition(async () => {
      try {
        await apiClient.delete(`/api/projects/meetings/${meetingId}`)
        setMeetings((prev) => prev.filter((m) => m.id !== meetingId))
        toast.success('Meeting cancelled successfully')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to cancel meeting'
        toast.error(msg)
      }
    })
  }

  const [now] = useState(() => Date.now())

  const isFuture = (dateStr: string) => {
    return new Date(dateStr).getTime() > now
  }

  if (loading) {
    return <div className="card text-center py-6"><p style={{ color: 'var(--text-muted)' }}>Loading meetings...</p></div>
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
          Meetings Scheduler
        </h2>
        <button type="button" onClick={() => setShowCreate(!showCreate)} className="btn btn--ghost btn--sm">
          {showCreate ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Schedule Meeting</>}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="mt-title">Meeting Title *</label>
            <input id="mt-title" value={title} onChange={(e) => setTitle(e.target.value)} className="form-input" placeholder="e.g. Sync-up / Demo" required />
          </div>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="mt-desc">Description</label>
            <textarea id="mt-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="form-textarea" rows={2} placeholder="Agenda, notes..." />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="form-group">
              <label className="form-label" htmlFor="mt-date">Date &amp; Time *</label>
              <input id="mt-date" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="mt-duration">Duration (Minutes)</label>
              <select id="mt-duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="form-input">
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
              </select>
            </div>
          </div>

          {/* Meeting Link Mode Selector */}
          <div className="form-group mb-3">
            <label className="form-label">Meeting Link</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => setLinkMode('auto')}
                className={`btn btn--sm ${linkMode === 'auto' ? 'btn--primary' : 'btn--ghost'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <Video size={13} /> Auto-generate (Google Meet)
              </button>
              <button
                type="button"
                onClick={() => setLinkMode('custom')}
                className={`btn btn--sm ${linkMode === 'custom' ? 'btn--primary' : 'btn--ghost'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <Link2 size={13} /> Paste Custom Link
              </button>
            </div>

            {linkMode === 'auto' && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                A Google Meet link will be automatically created via Google Calendar API.
              </p>
            )}

            {linkMode === 'custom' && (
              <input
                id="mt-custom-link"
                type="url"
                value={customLink}
                onChange={(e) => setCustomLink(e.target.value)}
                className="form-input"
                placeholder="https://zoom.us/j/… or https://meet.google.com/… or any meeting URL"
              />
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn--primary btn--sm" disabled={isPending}>
              Schedule Meeting
            </button>
          </div>
        </form>
      )}

      {meetings.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No meetings scheduled.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {meetings.map((meeting) => {
            const isHost = meeting.hostId === userId
            const isLeadOrAdmin = userRole === 'ADMIN' || userTeamRole === 'TEAM_LEAD'
            const active = isFuture(meeting.scheduledAt)
            const joinLabel = meeting.meetLink ? getMeetPlatformLabel(meeting.meetLink) : 'Join Meeting'
            const joinColor = meeting.meetLink ? getMeetPlatformColor(meeting.meetLink) : '#10b981'

            return (
              <div key={meeting.id} style={{ background: 'var(--bg-elevated)', border: `1px solid ${active ? 'rgba(59,130,246,0.3)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, background: active ? 'rgba(59,130,246,0.15)' : 'rgba(107,114,128,0.12)', color: active ? '#3b82f6' : '#64748b', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                        <Calendar size={10} /> {active ? 'Upcoming' : 'Past'}
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        Host: {userRole === 'CLIENT' ? agencyNameForClient(meeting.host, projectLeadId) : `${meeting.host.name} (${meeting.host.role})`}
                      </span>
                    </div>

                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{meeting.title}</div>
                    {meeting.description && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>{meeting.description}</p>}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginTop: 8, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(meeting.scheduledAt))} ({meeting.duration}m)
                      </span>
                    </div>

                    {meeting.meetLink && active && (
                      <div style={{ marginTop: 12 }}>
                        <a
                          href={meeting.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn--primary btn--sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: joinColor, borderColor: joinColor }}
                        >
                          <Video size={14} /> {joinLabel} <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>

                  {(isHost || isLeadOrAdmin) && (
                    <button onClick={() => handleDelete(meeting.id)} title="Cancel Meeting" className="btn btn--ghost btn--sm btn--icon" style={{ color: 'var(--color-danger)' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
