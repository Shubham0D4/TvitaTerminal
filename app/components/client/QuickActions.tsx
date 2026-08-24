'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import MeetingRequestModal, { type MeetingProject } from './MeetingRequestModal'
import QuoteRequestModal from './QuoteRequestModal'

export type QuickAction = {
  label: string
  icon: string
  href?: string
}

interface QuickActionsProps {
  actions: QuickAction[]
  projects: MeetingProject[]
}

export default function QuickActions({ actions, projects }: QuickActionsProps) {
  const [meetingOpen, setMeetingOpen] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)

  return (
    <>
      <nav className="qactions" aria-label="Quick actions">
        {actions.map((action) => {
          const content = (
            <>
              <span className="qaction__disc">
                <Image src={action.icon} alt="" width={34} height={34} />
              </span>
              <span className="qaction__label">{action.label}</span>
            </>
          )

          // Meet and Quote open request sheets; the rest navigate.
          const opener =
            action.label === 'Meet'
              ? setMeetingOpen
              : action.label === 'Quote'
                ? setQuoteOpen
                : null

          return opener ? (
            <button
              key={action.label}
              type="button"
              className="qaction"
              onClick={() => opener(true)}
            >
              {content}
            </button>
          ) : (
            <Link key={action.label} href={action.href ?? '/client/projects'} className="qaction">
              {content}
            </Link>
          )
        })}
      </nav>

      <MeetingRequestModal
        open={meetingOpen}
        onClose={() => setMeetingOpen(false)}
        projects={projects}
      />

      <QuoteRequestModal open={quoteOpen} onClose={() => setQuoteOpen(false)} />
    </>
  )
}
