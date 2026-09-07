import type { ProcessStage } from '@prisma/client'

export const PROCESS_STAGES = [
  { key: 'DISCOVERY' as const, name: 'Discovery & research' },
  { key: 'DESIGN' as const, name: 'Design' },
  { key: 'QUOTE' as const, name: 'Quote & planning' },
  { key: 'BACKEND' as const, name: 'Crafting the Backend' },
  { key: 'LAUNCH' as const, name: 'Testing & launch' },
] as const

export type ProcessStageKey = (typeof PROCESS_STAGES)[number]['key']

export type StageMilestone = {
  stage?: string | null
  status: string
  name?: string
}

const STAGE_KEYS = new Set<string>(PROCESS_STAGES.map((s) => s.key))

export function isProcessStageKey(value: string | null | undefined): value is ProcessStageKey {
  return Boolean(value && STAGE_KEYS.has(value))
}

export function inferStageFromName(name: string): ProcessStageKey {
  const n = name.toLowerCase()
  if (n.includes('test') || n.includes('launch') || n.includes('uat') || n.includes('beta') || n.includes('release')) {
    return 'LAUNCH'
  }
  if (n.includes('backend') || n.includes('craft') || n.includes('develop') || n.includes('api') || n.includes('architect')) {
    return 'BACKEND'
  }
  if (n.includes('quote') || n.includes('planning') || n.includes('estimat')) {
    return 'QUOTE'
  }
  if (n.includes('design') || n.includes('wireframe') || n.includes('mockup') || n.includes('prototype') || n.includes('ux')) {
    return 'DESIGN'
  }
  if (n.includes('discover') || n.includes('research') || n.includes('kickoff') || n.includes('requirement')) {
    return 'DISCOVERY'
  }
  return 'DISCOVERY'
}

export function stageOf(milestone: StageMilestone): ProcessStageKey {
  if (isProcessStageKey(milestone.stage)) return milestone.stage
  if (milestone.name) return inferStageFromName(milestone.name)
  return 'DISCOVERY'
}

/** Index of the stage currently underway. `STAGES.length` means every stage is done. */
export function stageIndexFromMilestones(
  milestones: StageMilestone[],
  projectStatus?: string
): number {
  if (projectStatus === 'COMPLETED') return PROCESS_STAGES.length

  for (let i = 0; i < PROCESS_STAGES.length; i++) {
    const items = milestones.filter((m) => stageOf(m) === PROCESS_STAGES[i].key)
    if (items.some((m) => m.status !== 'COMPLETED')) return i
  }

  if (milestones.length === 0) return 0
  if (milestones.every((m) => m.status === 'COMPLETED')) return PROCESS_STAGES.length
  return 0
}

export function progressFromMilestones(milestones: { status: string }[]): number {
  if (milestones.length === 0) return 0
  const done = milestones.filter((m) => m.status === 'COMPLETED').length
  return Math.round((done / milestones.length) * 100)
}

export function currentPhaseName(
  milestones: StageMilestone[],
  projectStatus?: string
): string | undefined {
  const idx = stageIndexFromMilestones(milestones, projectStatus)
  if (idx >= PROCESS_STAGES.length) return undefined
  return PROCESS_STAGES[idx].name
}

export type AssigneeOption = {
  profileId: string
  role: string
  profile: { id: string; name: string }
}

/** Project lead is always a valid assignee, even when they are not in `project_members`. */
export function withLeadAssignee(
  members: AssigneeOption[],
  lead: { id: string; name: string } | null | undefined
): AssigneeOption[] {
  if (!lead) return members
  if (members.some((m) => m.profileId === lead.id)) {
    return members.map((m) =>
      m.profileId === lead.id && m.role === 'MEMBER'
        ? { ...m, role: 'LEAD' }
        : m
    )
  }
  return [
    { profileId: lead.id, role: 'LEAD', profile: { id: lead.id, name: lead.name } },
    ...members,
  ]
}

export function asProcessStage(value: string | null | undefined): ProcessStage {
  return isProcessStageKey(value) ? value : inferStageFromName(value ?? '')
}
