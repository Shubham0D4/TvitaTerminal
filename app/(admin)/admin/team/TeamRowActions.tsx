'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import { UserCheck, UserX, Send, Check } from 'lucide-react'

interface TeamRowActionsProps {
  memberId: string
  isActive: boolean
  hasPassword?: boolean
  email?: string
}

export default function TeamRowActions({ memberId, isActive, hasPassword = true, email }: TeamRowActionsProps) {
  const [isPending, setIsPending] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleToggle = async () => {
    setIsPending(true)
    const res = await apiClient(`/api/admin/team/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: !isActive }),
    })
    setIsPending(false)

    if (res.success) {
      toast.success(`Member ${!isActive ? 'activated' : 'deactivated'}.`)
      window.location.reload()
    } else {
      toast.error(res.error?.message || 'Action failed')
    }
  }

  const handleResendInvite = async () => {
    setIsResending(true)
    try {
      const res = await apiClient<{ message: string; inviteLink?: string }>(`/api/admin/team/${memberId}/resend-invite`, {
        method: 'POST',
      })

      if (res.success && res.data) {
        if (res.data.inviteLink && typeof navigator !== 'undefined' && navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(res.data.inviteLink)
            setCopied(true)
            setTimeout(() => setCopied(false), 3000)
          } catch (clipErr) {
            console.warn('Clipboard write error:', clipErr)
          }
        }
        toast.success(res.data.message || 'Invitation resent successfully!')
      } else {
        toast.error(res.error?.message || 'Failed to resend invitation')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to resend invitation')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {!hasPassword && (
        <button
          type="button"
          onClick={handleResendInvite}
          disabled={isResending}
          className="btn btn--secondary btn--xs"
          style={{ gap: 4, background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', border: '1px solid rgba(99, 102, 241, 0.3)' }}
          title="Resend magic link invitation email"
        >
          {copied ? <Check size={12} className="text-success" /> : <Send size={12} />}
          {isResending ? 'Sending...' : 'Resend Invite'}
        </button>
      )}

      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`btn btn--ghost btn--icon${isActive ? '' : ' text-success'}`}
        title={isActive ? 'Deactivate Member' : 'Activate Member'}
      >
        {isActive ? <UserX size={15} /> : <UserCheck size={15} />}
      </button>
    </div>
  )
}
