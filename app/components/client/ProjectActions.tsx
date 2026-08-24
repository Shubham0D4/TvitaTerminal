'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StickyNote, CalendarDays } from 'lucide-react'

import MeetingRequestModal, { type MeetingProject } from './MeetingRequestModal'

interface ProjectActionsProps {
  project: MeetingProject
  /** Sub-teams can have notes switched off. */
  canUseNotes?: boolean
}

export default function ProjectActions({ project, canUseNotes = true }: ProjectActionsProps) {
  const [meetOpen, setMeetOpen] = useState(false)

  return (
    <>
      <div className="pacts">
        {canUseNotes && (
          <Link href="/client/notes" className="pact">
            <StickyNote size={17} />
            Notes
          </Link>
        )}

        <button type="button" className="pact" onClick={() => setMeetOpen(true)}>
          <CalendarDays size={17} />
          Meet
        </button>
      </div>

      <MeetingRequestModal
        open={meetOpen}
        onClose={() => setMeetOpen(false)}
        projects={[project]}
      />
    </>
  )
}
