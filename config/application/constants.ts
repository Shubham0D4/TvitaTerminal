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
  { key: 'milestones', label: 'Process & Roadmaps' },
  { key: 'updates', label: 'Project Feed & Updates' },
  { key: 'invoices', label: 'Billing & Invoices' },
  { key: 'subscriptions', label: 'Subscription Plans' },
] as const

export const DEFAULT_FULL_POLICY = {
  projects: true,
  milestones: true,
  updates: true,
  invoices: true,
  subscriptions: true,
}
