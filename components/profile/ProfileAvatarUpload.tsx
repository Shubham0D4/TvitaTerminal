'use client'

import { useState, useRef } from 'react'
import { Camera } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProfileAvatarUploadProps {
  currentAvatarUrl?: string | null
  userName: string
}

export default function ProfileAvatarUpload({ currentAvatarUrl, userName }: ProfileAvatarUploadProps) {
  const [avatar, setAvatar] = useState<string | null>(currentAvatarUrl || null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 3 * 1024 * 1024) {
      toast.error('Avatar image size must be less than 3MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = async () => {
      setUploading(true)
      const base64Data = reader.result as string
      setAvatar(base64Data) // Instant visual preview

      try {
        const res = await fetch('/api/profile/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data, filename: file.name }),
        })

        const data = await res.json()
        if (res.ok && data.success && data.data?.avatarUrl) {
          setAvatar(`${data.data.avatarUrl}?t=${Date.now()}`)
          toast.success('Profile picture updated successfully!')
        } else {
          toast.error(data.error?.message || 'Failed to update profile picture')
        }
      } catch (err) {
        console.error('Avatar upload error:', err)
        toast.error('Failed to upload profile picture')
      } finally {
        setUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const initialLetter = userName.charAt(0).toUpperCase()

  return (
    <div className="flex items-center gap-3">
      <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
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
            alt={userName}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--accent-primary)',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'var(--accent-gradient)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-bold)',
            }}
          >
            {initialLetter}
          </div>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Change Profile Picture"
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'var(--accent-primary)',
            color: '#ffffff',
            border: '2px solid var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Camera size={12} />
        </button>
      </div>
    </div>
  )
}
