'use client'

import { useState } from 'react'
import { Ticket as TicketIcon, CheckCircle2, Plus } from 'lucide-react'

import TicketRequestModal, { type TicketProject } from './TicketRequestModal'

export type ClientTicket = {
  id: string
  title: string
  description: string
  status: string
  projectName: string
  createdAt: string
}

interface TicketsWorkspaceProps {
  tickets: ClientTicket[]
  projects: TicketProject[]
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

const FILED = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })

/** Drives the badge and icon tint. */
function tone(status: string) {
  if (status === 'RESOLVED' || status === 'CLOSED') return 'done'
  if (status === 'IN_PROGRESS') return 'active'
  return 'open'
}

export default function TicketsWorkspace({ tickets, projects }: TicketsWorkspaceProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="tkts">
      <header className="tkts__header">
        <h1 className="tkts__title">Tickets</h1>

        <button type="button" className="tkts__new" onClick={() => setModalOpen(true)}>
          <Plus size={18} strokeWidth={2.5} />
          New ticket
        </button>
      </header>

      {tickets.length === 0 ? (
        <p className="tkts__empty">No tickets raised yet.</p>
      ) : (
        <ul className="tkts__list">
          {tickets.map((ticket) => {
            const status = tone(ticket.status)
            const resolved = status === 'done'

            return (
              <li key={ticket.id} className="tkt">
                <span className={`tkt__icon tkt__icon--${status}`}>
                  <TicketIcon size={18} />
                </span>

                <div className="tkt__body">
                  <div className="tkt__top">
                    <h2 className="tkt__title">{ticket.title}</h2>
                    <span className={`tkt__badge tkt__badge--${status}`}>
                      {STATUS_LABELS[ticket.status] ?? ticket.status}
                    </span>
                  </div>

                  <p className="tkt__meta">
                    {ticket.projectName} · Filed {FILED.format(new Date(ticket.createdAt))}
                  </p>

                  {ticket.description &&
                    (resolved ? (
                      <p className="tkt__resolved">
                        <CheckCircle2 size={16} />
                        {ticket.description}
                      </p>
                    ) : (
                      <p className="tkt__desc">{ticket.description}</p>
                    ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <TicketRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        projects={projects}
      />
    </div>
  )
}
