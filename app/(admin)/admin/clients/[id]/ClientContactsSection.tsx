'use client'

import { useState } from 'react'
import { Plus, Trash2, UserCheck, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import type { ClientContact } from '@prisma/client'

interface Props {
  clientId: string
  contacts: ClientContact[]
}

export default function ClientContactsSection({ clientId, contacts: initial }: Props) {
  const [contacts, setContacts] = useState(initial)
  const [isAdding, setIsAdding] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    const payload = {
      name: formData.get('name') as string,
      role: (formData.get('role') as string) || null,
      designation: (formData.get('designation') as string) || null,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      isDecisionMaker: formData.get('isDecisionMaker') === 'on',
    }

    setIsPending(true)
    const res = await apiClient<ClientContact>(`/api/admin/clients/${clientId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setIsPending(false)

    if (res.success && res.data) {
      toast.success('Contact added successfully.')
      setContacts((prev) => [...prev, res.data!])
      form.reset()
      setIsAdding(false)
    } else {
      toast.error(res.error?.message || 'Failed to add contact.')
    }
  }

  const handleDelete = async (contactId: string) => {
    setIsPending(true)
    const res = await apiClient(`/api/admin/clients/${clientId}/contacts/${contactId}`, {
      method: 'DELETE',
    })
    setIsPending(false)

    if (res.success) {
      toast.success('Contact deleted successfully.')
      setContacts((prev) => prev.filter((c) => c.id !== contactId))
    } else {
      toast.error(res.error?.message || 'Failed to delete contact.')
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
          Additional Contacts ({contacts.length})
        </h2>
        <button type="button" onClick={() => setIsAdding(!isAdding)} className="btn btn--ghost btn--sm">
          {isAdding ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Contact</>}
        </button>
      </div>

      {/* Add form */}
      {isAdding && (
        <form onSubmit={handleAdd} style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
          <div className="settings-grid" style={{ marginBottom: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="cc-name">Name <span className="form-required">*</span></label>
              <input id="cc-name" name="name" className="form-input" placeholder="Jane Smith" required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cc-role">Function / Dept</label>
              <input id="cc-role" name="role" className="form-input" placeholder="Finance, Technical, Legal…" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cc-designation">Designation</label>
              <input id="cc-designation" name="designation" className="form-input" placeholder="CFO, CTO…" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cc-email">Email</label>
              <input id="cc-email" name="email" type="email" className="form-input" placeholder="jane@acme.com" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cc-phone">Phone</label>
              <input id="cc-phone" name="phone" className="form-input" placeholder="+1 555 0100" />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: 'var(--space-5)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
                <input type="checkbox" name="isDecisionMaker" style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }} />
                Decision Maker
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className={`btn btn--primary btn--sm${isPending ? ' btn--loading' : ''}`} disabled={isPending}>
              {isPending ? '' : 'Add Contact'}
            </button>
          </div>
        </form>
      )}

      {contacts.length === 0 ? (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          No additional contacts. Click "+ Add Contact" to add finance, technical, or legal contacts.
        </p>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th><th>Role / Dept</th><th>Email</th><th>Phone</th><th>Decision Maker</th><th></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>{c.name}</div>
                    {c.designation && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{c.designation}</div>}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.role || '—'}</td>
                  <td>
                    {c.email ? (
                      <a href={`mailto:${c.email}`} style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-primary)' }}>{c.email}</a>
                    ) : '—'}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{c.phone || '—'}</td>
                  <td>
                    {c.isDecisionMaker && (
                      <span className="badge badge--active" style={{ fontSize: 9 }}>
                        <UserCheck size={10} /> Yes
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="btn btn--ghost btn--icon"
                      style={{ width: 28, height: 28 }}
                      title="Remove contact"
                    >
                      <Trash2 size={13} style={{ color: 'var(--color-danger)' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
