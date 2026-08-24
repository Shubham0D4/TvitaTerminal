'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/utils/api-client'
import { AlertTriangle, Trash2 } from 'lucide-react'

interface Props {
  memberId: string
  memberName: string
  memberEmail: string
}

export default function MemberDangerZone({ memberId, memberName, memberEmail }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [pending, setPending] = useState(false)

  const handleDelete = async () => {
    if (confirmEmail !== memberEmail) return
    setPending(true)

    try {
      const res = await apiClient(`/api/admin/team/${memberId}`, {
        method: 'DELETE',
      })

      if (res.success) {
        toast.success('Team member profile and auth access deleted.')
        router.push('/admin/team')
        router.refresh()
      } else {
        toast.error(res.error?.message || 'Failed to delete team member')
      }
    } catch (err) {
      console.error('Delete team member error:', err)
      toast.error('An unexpected error occurred.')
    } finally {
      setPending(false)
      setIsOpen(false)
    }
  }

  return (
    <>
      <div className="card" style={{ border: '1px solid var(--color-error-border, #fecaca)', background: 'var(--color-error-bg, #fef2f2)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: '#dc2626', marginBottom: 'var(--space-3)' }}>
          <AlertTriangle size={20} />
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', margin: 0 }}>
            Danger Zone
          </h2>
        </div>
        <p style={{ fontSize: 'var(--text-sm)', color: '#7f1d1d', margin: '0 0 var(--space-4) 0', lineHeight: 1.5 }}>
          Permanently delete this staff member account, clear their project memberships, and revoke their system login access. This action is irreversible.
        </p>
        <button
          onClick={() => setIsOpen(true)}
          className="btn"
          style={{
            background: '#dc2626',
            color: '#ffffff',
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontWeight: 'var(--font-medium)',
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#b91c1c')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#dc2626')}
        >
          <Trash2 size={16} />
          Delete Account
        </button>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '480px',
              background: 'var(--bg-card, #ffffff)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-xl)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: 'var(--space-6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: '#dc2626', marginBottom: 'var(--space-4)' }}>
                <AlertTriangle size={24} />
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: 0 }}>
                  Confirm Account Deletion
                </h3>
              </div>

              <div
                style={{
                  background: '#fff5f5',
                  border: '1px solid #fee2e2',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-3)',
                  marginBottom: 'var(--space-4)',
                  fontSize: 'var(--text-sm)',
                  color: '#991b1b',
                  lineHeight: 1.5,
                }}
              >
                <strong>Warning:</strong> You are about to permanently delete <strong>{memberName}</strong>.
                This will revoke their access to the portal and clear their roles from all assigned tasks. 
                This action is irreversible.
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                <label className="form-label" htmlFor="confirm-email" style={{ marginBottom: 'var(--space-2)', display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                  To confirm, type their email <strong>{memberEmail}</strong> below:
                </label>
                <input
                  id="confirm-email"
                  type="text"
                  className="form-input"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder={memberEmail}
                  style={{ width: '100%' }}
                  disabled={pending}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    setConfirmEmail('')
                  }}
                  className="btn btn--ghost"
                  disabled={pending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn"
                  disabled={confirmEmail !== memberEmail || pending}
                  style={{
                    background: confirmEmail === memberEmail ? '#dc2626' : '#fca5a5',
                    color: '#ffffff',
                    border: 'none',
                    padding: 'var(--space-2) var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    cursor: confirmEmail === memberEmail && !pending ? 'pointer' : 'not-allowed',
                    fontWeight: 'var(--font-medium)',
                  }}
                >
                  {pending ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
