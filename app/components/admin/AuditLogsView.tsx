'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/utils/api-client'
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  ShieldAlert,
} from 'lucide-react'

interface AuditLogRecord {
  id: string
  createdAt: string
  actorId?: string
  actorEmail?: string
  actorRole?: string
  action: string
  entityType: string
  entityId?: string
  entityLabel?: string
  oldValue?: any
  newValue?: any
  ipAddress?: string
  userAgent?: string
  actor?: {
    name: string
    email: string
    role: string
  }
}

interface AuditLogsApiResponse {
  logs: AuditLogRecord[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export default function AuditLogsView() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [entityFilter, setEntityFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 25 })
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '25')
      if (search) params.set('search', search)
      if (actionFilter !== 'ALL') params.set('action', actionFilter)
      if (entityFilter !== 'ALL') params.set('entityType', entityFilter)

      const res = await apiClient.get<AuditLogsApiResponse>(`/api/admin/audit-logs?${params.toString()}`)
      setLogs(res.logs)
      setPagination(res.pagination)
    } catch (err: any) {
      toast.error('Failed to load audit trail records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, actionFilter, entityFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchLogs()
  }

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'CREATE':
        return { bg: '#dcfce7', color: '#15803d' }
      case 'DELETE':
        return { bg: '#fee2e2', color: '#b91c1c' }
      case 'UPDATE':
      case 'STATUS_CHANGE':
        return { bg: '#eff6ff', color: '#1d4ed8' }
      case 'FAILED_LOGIN':
      case 'UNAUTHORIZED':
        return { bg: '#fff7ed', color: '#c2410c' }
      case 'LOGIN':
        return { bg: '#f0fdf4', color: '#16a34a' }
      default:
        return { bg: '#f1f5f9', color: '#475569' }
    }
  }

  return (
    <div className="card" style={{ background: '#ffffff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="settings-section__title flex items-center gap-2" style={{ margin: 0 }}>
            <ScrollText size={22} style={{ color: '#1e40af' }} />
            Audit Trail & Event Logs
          </h2>
          <p className="settings-section__desc" style={{ marginTop: '4px' }}>
            Immutable record of all administrative operations, security events, access attempts, and data updates.
          </p>
        </div>

        <button type="button" onClick={fetchLogs} className="btn btn--secondary btn--sm flex items-center gap-1">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Logs
        </button>
      </div>

      {/* Filter & Search Bar */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
            placeholder="Search by actor, entity, action..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            className="form-select"
            style={{ height: '38px', fontSize: '13px', width: '160px' }}
            value={actionFilter}
            onChange={e => {
              setActionFilter(e.target.value)
              setPage(1)
            }}
          >
            <option value="ALL">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
            <option value="FAILED_LOGIN">FAILED LOGIN</option>
            <option value="UNAUTHORIZED">UNAUTHORIZED</option>
            <option value="STATUS_CHANGE">STATUS CHANGE</option>
          </select>

          <select
            className="form-select"
            style={{ height: '38px', fontSize: '13px', width: '160px' }}
            value={entityFilter}
            onChange={e => {
              setEntityFilter(e.target.value)
              setPage(1)
            }}
          >
            <option value="ALL">All Entities</option>
            <option value="user">User / Profile</option>
            <option value="client">Client</option>
            <option value="project">Project</option>
            <option value="task">Task</option>
            <option value="invoice">Invoice</option>
            <option value="quote">Quote</option>
            <option value="settings">Settings</option>
          </select>

          <button type="submit" className="btn btn--primary btn--sm" style={{ height: '38px', background: '#1e40af' }}>
            Filter
          </button>
        </div>
      </form>

      {/* Logs Table */}
      {loading && logs.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={24} className="animate-spin" style={{ color: '#1e40af', margin: '0 auto 12px' }} />
          Loading audit trail records...
        </div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <ShieldAlert size={28} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
          <div style={{ fontWeight: 700, color: '#0f172a' }}>No audit trail records found</div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>Try adjusting your search query or filter parameters.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px' }}>Timestamp</th>
                <th style={{ padding: '10px 14px' }}>Actor</th>
                <th style={{ padding: '10px 14px' }}>Action</th>
                <th style={{ padding: '10px 14px' }}>Entity Type</th>
                <th style={{ padding: '10px 14px' }}>Target Label / ID</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const badge = getActionBadgeClass(log.action)
                const formattedDate = new Date(log.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })

                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#64748b', fontSize: '12px' }}>
                      {formattedDate}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        {log.actor?.name || log.actorEmail || 'System'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{log.actorRole || 'SYSTEM'}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: '11px', background: badge.bg, color: badge.color, padding: '3px 8px', borderRadius: '4px', fontWeight: 800 }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', textTransform: 'uppercase', color: '#475569', fontSize: '12px' }}>
                      {log.entityType}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                      {log.entityLabel || log.entityId || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="btn btn--secondary btn--xs flex items-center gap-1"
                        style={{ background: '#f8fafc', marginLeft: 'auto' }}
                      >
                        <Eye size={12} /> Inspect
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '12px', color: '#64748b' }}>
          Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total log entries)
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            className="btn btn--secondary btn--sm"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(prev => prev + 1)}
            className="btn btn--secondary btn--sm"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Inspect Modal */}
      {selectedLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '640px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a' }}>Audit Event Details</h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Event ID: {selectedLog.id}</span>
              </div>
              <button type="button" onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px', maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Actor</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedLog.actor?.name || selectedLog.actorEmail || 'System'}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{selectedLog.actorRole || 'SYSTEM'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Timestamp</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{new Date(selectedLog.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>IP Address</div>
                  <div style={{ fontFamily: 'monospace', color: '#0f172a' }}>{selectedLog.ipAddress || '127.0.0.1'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Action / Entity</div>
                  <div style={{ fontWeight: 700, color: '#1e40af' }}>{selectedLog.action} ({selectedLog.entityType})</div>
                </div>
              </div>

              {selectedLog.oldValue && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Previous State (Old Value)</div>
                  <pre style={{ background: '#f1f5f9', padding: '10px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto' }}>
                    {JSON.stringify(selectedLog.oldValue, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newValue && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#15803d', marginBottom: '4px' }}>New State (Updated Value)</div>
                  <pre style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto' }}>
                    {JSON.stringify(selectedLog.newValue, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.userAgent && (
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>User Agent</div>
                  <div style={{ fontSize: '11px', color: '#475569', wordBreak: 'break-all', fontFamily: 'monospace' }}>{selectedLog.userAgent}</div>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
              <button type="button" onClick={() => setSelectedLog(null)} className="btn btn--secondary btn--sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
