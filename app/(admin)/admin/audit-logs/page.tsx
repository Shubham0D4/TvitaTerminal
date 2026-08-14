import { prisma } from '@/lib/prisma'
import { ShieldCheck, User, Calendar, Activity } from 'lucide-react'

export const metadata = {
  title: 'Audit Logs — Tvita Admin',
  description: 'Security and compliance audit trail tracking system activity.',
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(date))
}

type SearchParams = Promise<{ action?: string; entityType?: string }>

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(params.action && params.action !== 'ALL' && { action: params.action }),
      ...(params.entityType && params.entityType !== 'ALL' && { entityType: params.entityType }),
    },
    include: {
      actor: { select: { name: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Audit Trail Logs</h1>
          <p className="page-header__subtitle">
            Immutable log of system events, status changes, administrative actions, and payments.
          </p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Activity size={28} />
            <div className="empty-state__title">No audit logs found</div>
            <div className="empty-state__desc">Actions performed in the system will automatically be recorded here.</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Target Label</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {formatDate(log.createdAt)}
                    </td>
                    <td>
                      <div>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                          {log.actor?.name ?? log.actorEmail ?? 'System'}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {log.actorRole ?? 'SYSTEM'}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          fontSize: '10px',
                          background:
                            log.action === 'CREATE'
                              ? 'var(--accent-primary-muted)'
                              : log.action === 'DELETE'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : log.action === 'PAYMENT'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'var(--bg-overlay)',
                          color:
                            log.action === 'CREATE'
                              ? 'var(--accent-primary)'
                              : log.action === 'DELETE'
                              ? 'var(--color-danger)'
                              : log.action === 'PAYMENT'
                              ? 'var(--color-success)'
                              : 'var(--text-muted)',
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {log.entityType}
                    </td>
                    <td style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                      {log.entityLabel ?? log.entityId ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
