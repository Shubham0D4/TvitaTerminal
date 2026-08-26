'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, HelpCircle, Trash2, Calendar, User, CheckCircle2, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/utils/api-client'

interface ProjectItem {
  id: string
  name: string
}

interface TicketItem {
  id: string
  title: string
  description: string
  status: string // OPEN, IN_PROGRESS, RESOLVED, CLOSED
  priority: string // LOW, MEDIUM, HIGH
  createdAt: string
  creatorId: string
  creator?: {
    id: string
    name: string
    role: string
  }
}

interface Props {
  clientId: string
  projects: ProjectItem[]
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  OPEN: { bg: 'rgba(239, 68, 68, 0.08)', text: '#ef4444', label: 'Open' },
  IN_PROGRESS: { bg: 'rgba(245, 158, 11, 0.08)', text: '#d97706', label: 'In Progress' },
  RESOLVED: { bg: 'rgba(16, 185, 129, 0.08)', text: '#10b981', label: 'Resolved' },
  CLOSED: { bg: 'rgba(107, 114, 128, 0.08)', text: '#6b7280', label: 'Closed' },
}

const priorityColors: Record<string, { bg: string; text: string }> = {
  LOW: { bg: 'rgba(107, 114, 128, 0.06)', text: '#6b7280' },
  MEDIUM: { bg: 'rgba(245, 158, 11, 0.08)', text: '#d97706' },
  HIGH: { bg: 'rgba(239, 68, 68, 0.08)', text: '#ef4444' },
}

export default function AdminTicketsSection({ clientId, projects = [] }: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '')
  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, setIsPending] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!selectedProjectId) {
      setTickets([])
      return
    }

    async function fetchTickets() {
      setIsLoading(true)
      const res = await apiClient<TicketItem[]>(`/api/projects/${selectedProjectId}/tickets`)
      setIsLoading(false)

      if (res.success && res.data) {
        setTickets(res.data)
      } else {
        toast.error(res.error?.message || 'Failed to fetch tickets.')
      }
    }

    fetchTickets()
  }, [selectedProjectId])

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    setIsPending((prev) => ({ ...prev, [ticketId]: true }))

    const res = await apiClient<TicketItem>(`/api/projects/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    })

    setIsPending((prev) => ({ ...prev, [ticketId]: false }))

    if (res.success && res.data) {
      toast.success(`Ticket status updated to ${newStatus}`)
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t)))
    } else {
      toast.error(res.error?.message || 'Failed to update ticket status.')
    }
  }

  const handlePriorityChange = async (ticketId: string, newPriority: string) => {
    setIsPending((prev) => ({ ...prev, [ticketId]: true }))

    const res = await apiClient<TicketItem>(`/api/projects/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify({ priority: newPriority }),
    })

    setIsPending((prev) => ({ ...prev, [ticketId]: false }))

    if (res.success && res.data) {
      toast.success(`Ticket priority updated to ${newPriority}`)
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, priority: newPriority } : t)))
    } else {
      toast.error(res.error?.message || 'Failed to update ticket priority.')
    }
  }

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to permanently delete this ticket?')) return

    setIsPending((prev) => ({ ...prev, [ticketId]: true }))
    const res = await apiClient(`/api/projects/tickets/${ticketId}`, {
      method: 'DELETE',
    })
    setIsPending((prev) => ({ ...prev, [ticketId]: false }))

    if (res.success) {
      toast.success('Ticket deleted.')
      setTickets((prev) => prev.filter((t) => t.id !== ticketId))
    } else {
      toast.error(res.error?.message || 'Failed to delete ticket.')
    }
  }

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Selector header */}
      <div 
        className="card" 
        style={{ 
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid rgba(16, 28, 107, 0.08)',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', margin: 0 }}>
            Support Tickets &amp; Issues
          </h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
            Review support issues raised by the client and manage their resolution states.
          </p>
        </div>

        {projects.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>Select Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="form-select"
              style={{ padding: '6px 12px', fontSize: 'var(--text-xs)', borderRadius: '8px', border: '1px solid var(--border-default)', minWidth: 200 }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <span style={{ fontSize: 'var(--text-xs)', color: '#ea580c', fontWeight: 600, background: 'rgba(234, 88, 12, 0.08)', padding: '4px 12px', borderRadius: '8px' }}>
            No Projects Linked to Client
          </span>
        )}
      </div>

      {projects.length > 0 && (
        <div 
          className="card" 
          style={{ 
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid rgba(16, 28, 107, 0.08)',
            padding: '24px',
          }}
        >
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <HelpCircle size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No support tickets raised for this project.</div>
            </div>
          ) : (
            <div className="table-wrapper" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(16, 28, 107, 0.08)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ticket Details</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Created Info</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Priority</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status Action</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => {
                    const statusCfg = statusColors[ticket.status] || { bg: 'rgba(0,0,0,0.05)', text: '#6b7280', label: ticket.status }
                    const priorityCfg = priorityColors[ticket.priority] || { bg: 'rgba(0,0,0,0.05)', text: '#6b7280' }
                    const pending = isPending[ticket.id] || false

                    return (
                      <tr 
                        key={ticket.id} 
                        style={{ 
                          borderBottom: '1px solid rgba(16, 28, 107, 0.04)',
                          verticalAlign: 'middle'
                        }}
                      >
                        <td style={{ padding: '16px', maxWidth: '320px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                            {ticket.title}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                            {ticket.description}
                          </div>
                        </td>

                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <User size={12} style={{ color: 'var(--text-muted)' }} /> {ticket.creator?.name || 'Client Representative'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={12} style={{ color: 'var(--text-muted)' }} /> {formatDate(ticket.createdAt)}
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: '16px' }}>
                          <select
                            disabled={pending}
                            value={ticket.priority}
                            onChange={(e) => handlePriorityChange(ticket.id, e.target.value)}
                            style={{ 
                              fontSize: '11px', 
                              fontWeight: 600, 
                              color: priorityCfg.text,
                              backgroundColor: priorityCfg.bg,
                              border: '1px solid rgba(0,0,0,0.05)',
                              borderRadius: '8px',
                              padding: '4px 8px',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                          </select>
                        </td>

                        <td style={{ padding: '16px' }}>
                          <select
                            disabled={pending}
                            value={ticket.status}
                            onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                            style={{ 
                              fontSize: '11px', 
                              fontWeight: 600, 
                              color: statusCfg.text,
                              backgroundColor: statusCfg.bg,
                              border: '1px solid rgba(0,0,0,0.05)',
                              borderRadius: '8px',
                              padding: '4px 8px',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                          </select>
                        </td>

                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => handleDeleteTicket(ticket.id)}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: 'var(--color-danger)', borderRadius: '6px' }}
                            title="Delete Ticket"
                          >
                            <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
