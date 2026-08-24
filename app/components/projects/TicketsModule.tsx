'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, X, MessageSquare, AlertTriangle, Check, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/utils/api-client'

interface Ticket {
  id: string
  title: string
  description: string
  status: string
  priority: string
  creatorId: string
  creator: { id: string; name: string; role: string }
  createdAt: string
}

interface Props {
  projectId: string
  userRole: string
  userTeamRole: string | null
  userId: string
  hasAccess: boolean
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW: '#10b981',
  MEDIUM: '#3b82f6',
  HIGH: '#ef4444',
}

const STATUS_COLOR: Record<string, string> = {
  OPEN: '#ef4444',
  IN_PROGRESS: '#3b82f6',
  RESOLVED: '#10b981',
  CLOSED: '#64748b',
}

export default function TicketsModule({ projectId, userRole, userTeamRole, userId, hasAccess }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')

  const isClient = userRole === 'CLIENT'

  useEffect(() => {
    if (!hasAccess) return
    apiClient.get<Ticket[]>(`/api/projects/${projectId}/tickets`)
      .then((res) => {
        setTickets(res)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        toast.error('Failed to load tickets')
        setLoading(false)
      })
  }, [projectId, hasAccess])

  if (!hasAccess) {
    return (
      <div className="card text-center py-6">
        <p style={{ color: 'var(--text-muted)' }}>You do not have permission to access tickets for this project.</p>
      </div>
    )
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !description) return

    startTransition(async () => {
      try {
        const newTicket = await apiClient.post<Ticket>(`/api/projects/${projectId}/tickets`, {
          title,
          description,
          priority,
        })
        setTickets((prev) => [newTicket, ...prev])
        toast.success('Support ticket raised successfully')
        setShowCreate(false)
        setTitle('')
        setDescription('')
        setPriority('MEDIUM')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to raise ticket'
        toast.error(msg)
      }
    })
  }

  const handleUpdateStatus = (ticketId: string, status: string) => {
    startTransition(async () => {
      try {
        const updated = await apiClient.patch<Ticket>(`/api/projects/tickets/${ticketId}`, { status })
        setTickets((prev) => prev.map((t) => t.id === ticketId ? updated : t))
        toast.success(`Ticket status updated to ${status}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update ticket status'
        toast.error(msg)
      }
    })
  }

  const handleDelete = (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this ticket?')) return

    startTransition(async () => {
      try {
        await apiClient.delete(`/api/projects/tickets/${ticketId}`)
        setTickets((prev) => prev.filter((t) => t.id !== ticketId))
        toast.success('Ticket deleted successfully')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to delete ticket'
        toast.error(msg)
      }
    })
  }

  if (loading) {
    return <div className="card text-center py-6"><p style={{ color: 'var(--text-muted)' }}>Loading tickets...</p></div>
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
          Support Tickets
          {tickets.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 11, background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '1px 8px', borderRadius: 10, fontWeight: 700 }}>
              {tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length} Pending
            </span>
          )}
        </h2>
        {isClient && (
          <button type="button" onClick={() => setShowCreate(!showCreate)} className="btn btn--ghost btn--sm">
            {showCreate ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Raise Ticket</>}
          </button>
        )}
      </div>

      {showCreate && isClient && (
        <form onSubmit={handleCreate} style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="tk-title">Ticket Title *</label>
            <input id="tk-title" value={title} onChange={(e) => setTitle(e.target.value)} className="form-input" placeholder="Summarize your issue..." required />
          </div>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="tk-desc">Describe the Problem *</label>
            <textarea id="tk-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="form-textarea" rows={3} placeholder="Please provide specific details..." required />
          </div>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="tk-priority">Urgency / Priority</label>
            <select id="tk-priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="form-input">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn--primary btn--sm" disabled={isPending}>
              Raise Ticket
            </button>
          </div>
        </form>
      )}

      {tickets.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No support tickets raised for this project.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {tickets.map((ticket) => {
            const isCreator = ticket.creatorId === userId
            const isLeadOrAdmin = userRole === 'ADMIN' || userTeamRole === 'TEAM_LEAD'

            return (
              <div key={ticket.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, background: `${PRIORITY_COLOR[ticket.priority]}22`, color: PRIORITY_COLOR[ticket.priority], padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                        {ticket.priority}
                      </span>
                      <span style={{ fontSize: 10, background: `${STATUS_COLOR[ticket.status]}22`, color: STATUS_COLOR[ticket.status], padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                        {ticket.status.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        Raised by {ticket.creator.name} · {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(ticket.createdAt))}
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{ticket.title}</div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>{ticket.description}</p>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                    {isLeadOrAdmin && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
                      <>
                        <button onClick={() => handleUpdateStatus(ticket.id, 'IN_PROGRESS')} title="In Progress" className="btn btn--secondary btn--sm">
                          Work On
                        </button>
                        <button onClick={() => handleUpdateStatus(ticket.id, 'RESOLVED')} title="Resolve" className="btn btn--primary btn--sm" style={{ background: '#10b981', borderColor: '#10b981' }}>
                          Resolve
                        </button>
                      </>
                    )}
                    {isLeadOrAdmin && ticket.status === 'RESOLVED' && (
                      <button onClick={() => handleUpdateStatus(ticket.id, 'CLOSED')} title="Close" className="btn btn--secondary btn--sm">
                        Close
                      </button>
                    )}
                    {(isCreator || isLeadOrAdmin) && (
                      <button onClick={() => handleDelete(ticket.id)} title="Delete" className="btn btn--ghost btn--sm btn--icon" style={{ color: 'var(--color-danger)' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
