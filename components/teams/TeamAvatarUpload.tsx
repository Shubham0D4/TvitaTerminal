'use client'

import { useState, useRef } from 'react'
import { Camera } from 'lucide-react'
import toast from 'react-hot-toast'

interface TeamAvatarUploadProps {
  teamId: string
  teamName: string
  currentAvatarUrl?: string | null
}

export default function TeamAvatarUpload({ teamId, teamName, currentAvatarUrl }: TeamAvatarUploadProps) {
  const [avatar, setAvatar] = useState<string | null>(currentAvatarUrl || null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 3 * 1024 * 1024) {
      toast.error('Team picture size must be less than 3MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = async () => {
      setUploading(true)
      try {
        const base64Data = reader.result as string
        const res = await fetch(`/api/client/team/${teamId}/avatar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data, filename: file.name }),
        })

        const data = await res.json()
        if (res.ok && data.success && data.data?.avatarUrl) {
          setAvatar(data.data.avatarUrl)
          toast.success('Team picture updated successfully!')
        } else {
          toast.error(data.error?.message || 'Failed to update team picture')
        }
      } catch (err) {
        console.error('Team avatar upload error:', err)
        toast.error('Failed to upload team picture')
      } finally {
        setUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const initialLetter = teamName.charAt(0).toUpperCase()

  return (
    <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
      
      {avatar ? (
        <img
          src={avatar}
          alt={teamName}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 'var(--radius-md)',
            objectFit: 'cover',
            border: '1px solid var(--border-subtle)',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, #8b5cf6 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'var(--font-bold)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {initialLetter}
        </div>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          fileInputRef.current?.click()
        }}
        disabled={uploading}
        title="Upload Team Picture"
        style={{
          position: 'absolute',
          bottom: -3,
          right: -3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'var(--accent-primary)',
          color: '#ffffff',
          border: '1.5px solid var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Camera size={10} />
      </button>
    </div>
  )
}
