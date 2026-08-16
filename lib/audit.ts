import { AuditRepository } from '@/infrastructure/database/repositories/audit.repository'
import { getServerUser } from '@/lib/auth/server'
import type { NextRequest } from 'next/server'

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'ASSIGN'
  | 'UPLOAD'
  | 'DOWNLOAD'
  | 'PAYMENT'
  | 'SUBSCRIPTION_CHANGE'

export type AuditEntityType =
  | 'user'
  | 'client'
  | 'project'
  | 'task'
  | 'milestone'
  | 'invoice'
  | 'payment'
  | 'document'
  | 'subscription'
  | 'plan'
  | 'notification'
  | 'settings'
  | 'issue'
  | 'note'
  | 'ticket'
  | 'meeting'
  | 'quote'

export interface AuditLogOptions {
  actorId?: string
  actorEmail?: string
  actorRole?: string
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string
  entityLabel?: string
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function writeAuditLog(options: AuditLogOptions): Promise<void> {
  await AuditRepository.create({
    actorId: options.actorId ?? null,
    actorEmail: options.actorEmail ?? null,
    actorRole: options.actorRole ?? null,
    action: options.action,
    entityType: options.entityType,
    entityId: options.entityId ?? null,
    entityLabel: options.entityLabel ?? null,
    oldValue: (options.oldValue as any) ?? undefined,
    newValue: (options.newValue as any) ?? undefined,
    ipAddress: options.ipAddress ?? null,
    userAgent: options.userAgent ?? null,
  })
}

export function extractRequestMeta(req: NextRequest): { ipAddress: string; userAgent: string } {
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  const userAgent = req.headers.get('user-agent') ?? 'unknown'
  return { ipAddress, userAgent }
}

/**
 * Convenience wrapper: gets current user from session and logs audit event.
 */
export async function auditLog(
  action: AuditAction,
  entityType: AuditEntityType,
  options: {
    entityId?: string
    entityLabel?: string
    oldValue?: Record<string, unknown>
    newValue?: Record<string, unknown>
    req?: NextRequest
  }
): Promise<void> {
  const user = await getServerUser()
  const meta = options.req ? extractRequestMeta(options.req) : {}

  await writeAuditLog({
    actorId: user?.id,
    actorEmail: user?.email,
    actorRole: user?.role,
    action,
    entityType,
    entityId: options.entityId,
    entityLabel: options.entityLabel,
    oldValue: options.oldValue,
    newValue: options.newValue,
    ...meta,
  })
}
