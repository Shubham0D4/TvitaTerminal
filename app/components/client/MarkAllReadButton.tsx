'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MarkAllReadButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const markAllRead = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      if (!res.ok) throw new Error('Request failed')
      // Re-render the server component so the list reflects the new state.
      router.refresh()
    } catch {
      toast.error('Could not mark notifications as read.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button type="button" className="notif-markall" onClick={markAllRead} disabled={loading}>
      <CheckCheck size={16} strokeWidth={2} />
      {loading ? 'Marking…' : 'Mark all read'}
    </button>
  )
}
