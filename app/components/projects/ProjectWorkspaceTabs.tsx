'use client'

import { useState } from 'react'
import { AlertCircle, FileText, Calendar, Layers } from 'lucide-react'
import MilestonesPanel from './MilestonesPanel'
import NotesModule from './NotesModule'
import TicketsModule from './TicketsModule'
import MeetingsModule from './MeetingsModule'

import type { Milestone } from '@prisma/client'

type MilestoneWithAssignee = Milestone & {
  assignee?: { name: string } | null
  imageUrls?: string[]
  tasks?: any[]
}

interface ProjectMember {
  profileId: string
  role: string
  profile: {
    id: string
    name: string
  }
}

interface Props {
  projectId: string
  clientId: string
  userRole: string
  userTeamRole: string | null
  userId: string
  clientPolicy?: {
    milestones: boolean
    notes: boolean
  }
  milestones: MilestoneWithAssignee[]
  projectMembers: ProjectMember[]
  isLead: boolean
  projectLeadId?: string | null
}

export default function ProjectWorkspaceTabs({
  projectId,
  clientId,
  userRole,
  userTeamRole,
  userId,
  clientPolicy = { milestones: true, notes: true },
  milestones,
  projectMembers,
  isLead,
  projectLeadId = null,
}: Props) {
  const [activeTab, setActiveTab] = useState<'milestones' | 'notes' | 'tickets' | 'meetings'>('milestones')

  const isClient = userRole === 'CLIENT'

  // Granular Access Policies for Client Sub-Teams
  const canSeeMilestones = !isClient || clientPolicy.milestones !== false
  const canSeeNotes = !isClient || clientPolicy.notes !== false

  const canSeeTickets = isClient || isLead || userRole === 'ADMIN'
  const canSeeMeetings = true

  const tabs = [
    { id: 'milestones', label: 'Milestones', icon: Layers, visible: canSeeMilestones },
    { id: 'notes', label: 'Notes', icon: FileText, visible: canSeeNotes },
    { id: 'tickets', label: 'Tickets', icon: AlertCircle, visible: canSeeTickets },
    { id: 'meetings', label: 'Meetings', icon: Calendar, visible: canSeeMeetings },
  ] as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%' }}>
      {/* Premium Tab Bar with White Background */}
      <div 
        className="card"
        style={{
          padding: 'var(--space-2)',
          display: 'flex',
          gap: 'var(--space-2)',
          overflowX: 'auto',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        {tabs.filter(t => t.visible).map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`btn btn--sm ${isActive ? 'btn--primary' : 'btn--ghost'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
                fontWeight: isActive ? 'var(--font-semibold)' : 'var(--font-medium)'
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Render active module */}
      <div>
        {activeTab === 'milestones' && canSeeMilestones && (
          <MilestonesPanel
            projectId={projectId}
            isLead={isLead}
            userId={userId}
            userRole={userRole}
            milestones={milestones}
            projectMembers={projectMembers}
          />
        )}

        {activeTab === 'notes' && canSeeNotes && (
          <NotesModule
            projectId={projectId}
            clientId={clientId}
            userRole={userRole}
            userTeamRole={isLead ? 'TEAM_LEAD' : null}
            userId={userId}
            hasAccess={canSeeNotes}
            projectLeadId={projectLeadId}
          />
        )}

        {activeTab === 'tickets' && canSeeTickets && (
          <TicketsModule
            projectId={projectId}
            userRole={userRole}
            userTeamRole={isLead ? 'TEAM_LEAD' : null}
            userId={userId}
            hasAccess={canSeeTickets}
            projectLeadId={projectLeadId}
          />
        )}

        {activeTab === 'meetings' && canSeeMeetings && (
          <MeetingsModule
            projectId={projectId}
            userRole={userRole}
            userTeamRole={isLead ? 'TEAM_LEAD' : null}
            userId={userId}
            hasAccess={canSeeMeetings}
            projectLeadId={projectLeadId}
          />
        )}
      </div>
    </div>
  )
}
