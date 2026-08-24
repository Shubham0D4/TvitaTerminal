'use client'

import { useState, useRef } from 'react'
import { Camera } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProjectBannerUploadProps {
  projectId: string
  canUpload: boolean
}

export default function ProjectBannerUpload({ projectId, canUpload }: ProjectBannerUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!canUpload) return null

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 4 * 1024 * 1024) {
      toast.error('File size must be less than 4MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = async () => {
      setUploading(true)
      try {
        const base64Data = reader.result as string
        const res = await fetch(`/api/projects/${projectId}/banner`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            base64Data,
            filename: file.name,
          }),
        })

        const data = await res.json()
        if (res.ok && data.success) {
          toast.success('Project banner updated successfully!')
          window.location.reload()
        } else {
          toast.error(data.error?.message || 'Failed to upload project banner')
        }
      } catch (err) {
        console.error('Upload error:', err)
        toast.error('Failed to upload project banner')
      } finally {
        setUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="btn flex items-center gap-1"
        style={{ 
          background: 'rgba(15, 23, 42, 0.75)', 
          backdropFilter: 'blur(4px)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '6px 12px',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-xs)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <Camera size={14} />
        {uploading ? 'Uploading...' : 'Update Cover'}
      </button>
    </div>
  )
}
