/**
 * Application Constants & Permissions Configuration
 */

export const ROLES = {
  ADMIN: 'ADMIN',
  TEAM_MEMBER: 'TEAM_MEMBER',
  CLIENT: 'CLIENT',
} as const

export const DEFAULT_ACCESS_COMPONENTS = [
  { key: 'projects', label: 'Projects & Workspaces' },
  { key: 'milestones', label: 'Milestones & Roadmaps' },
  { key: 'approvals', label: 'Deliverable Approvals' },
  { key: 'documents', label: 'Documents & Attachments' },
  { key: 'updates', label: 'Project Feed & Updates' },
  { key: 'invoices', label: 'Billing & Invoices' },
  { key: 'subscriptions', label: 'Subscription Plans' },
] as const

export const DEFAULT_FULL_POLICY = {
  projects: true,
  milestones: true,
  approvals: true,
  documents: true,
  updates: true,
  invoices: true,
  subscriptions: true,
}
