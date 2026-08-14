'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Trash2, Download } from 'lucide-react'
import type { Visibility } from '@prisma/client'

interface DocumentRowActionsProps {
  docId: string
  currentVisibility: Visibility
  fileUrl: string
}

export default function DocumentRowActions({ docId, currentVisibility, fileUrl }: DocumentRowActionsProps) {
  const [isPending, setIsPending] = useState(false)

  const handleToggle = async () => {
    const nextVis: Visibility = currentVisibility === 'CLIENT_VISIBLE' ? 'INTERNAL' : 'CLIENT_VISIBLE'
    setIsPending(true)
    const res = await apiClient(`/api/admin/documents/${docId}`, {
      method: 'PUT',
      body: JSON.stringify({ visibility: nextVis }),
    })
    setIsPending(false)

    if (res.success) {
      toast.success('Document visibility updated.')
      window.location.reload()
    } else {
      toast.error(res.error?.message || 'Failed to update visibility')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this document record?')) return
    setIsPending(true)
    const res = await apiClient(`/api/admin/documents/${docId}`, {
      method: 'DELETE',
    })
    setIsPending(false)

    if (res.success) {
      toast.success('Document deleted.')
      window.location.reload()
    } else {
      toast.error(res.error?.message || 'Failed to delete document')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className="btn btn--ghost btn--icon"
        title={currentVisibility === 'CLIENT_VISIBLE' ? 'Make Internal Only' : 'Make Client Visible'}
      >
        {currentVisibility === 'CLIENT_VISIBLE' ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>

      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className="btn btn--ghost btn--icon"
        title="Download"
      >
        <Download size={14} />
      </a>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="btn btn--ghost btn--icon"
        style={{ color: 'var(--color-danger)' }}
        title="Delete"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
