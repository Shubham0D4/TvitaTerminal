'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import toast from 'react-hot-toast'
import { UserCheck, UserX } from 'lucide-react'

interface TeamRowActionsProps {
  memberId: string
  isActive: boolean
}

export default function TeamRowActions({ memberId, isActive }: TeamRowActionsProps) {
  const [isPending, setIsPending] = useState(false)

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

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`btn btn--ghost btn--icon${isActive ? '' : ' text-success'}`}
      title={isActive ? 'Deactivate Member' : 'Activate Member'}
    >
      {isActive ? <UserX size={15} /> : <UserCheck size={15} />}
    </button>
  )
}
