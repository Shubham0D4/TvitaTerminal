'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import { Plus, X, Upload, Link as LinkIcon, FileText } from 'lucide-react'

interface DocumentUploadModalProps {
  clients: Array<{ id: string; name: string }>
  projects: Array<{ id: string; name: string; clientId: string }>
}

export default function DocumentUploadModal({ clients, projects }: DocumentUploadModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadMode, setUploadMode] = useState<'FILE' | 'LINK'>('FILE')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [docName, setDocName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const router = useRouter()

  const filteredProjects = selectedClientId
    ? projects.filter((p) => p.clientId === selectedClientId)
    : projects

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setPickedFile(file)
      if (!docName) {
        setDocName(file.name)
      }
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = (formData.get('name') as string) || docName
    const clientId = formData.get('clientId') as string
    const projectId = formData.get('projectId') as string
    const visibility = formData.get('visibility') as 'CLIENT_VISIBLE' | 'INTERNAL'

    let finalFileUrl = ''

    if (uploadMode === 'LINK') {
      finalFileUrl = linkUrl
    } else if (pickedFile) {
      finalFileUrl = URL.createObjectURL(pickedFile)
    }

    if (!finalFileUrl) {
      toast.error('Please select a file or provide a valid link URL.')
      setLoading(false)
      return
    }

    const res = await apiClient('/api/team/documents', {
      method: 'POST',
      body: JSON.stringify({
        name,
        fileUrl: finalFileUrl,
        clientId: clientId || undefined,
        projectId: projectId || undefined,
        visibility,
      }),
    })

    setLoading(false)

    if (res.success) {
      toast.success('Document uploaded.')
      setIsOpen(false)
      setPickedFile(null)
      setDocName('')
      setLinkUrl('')
      router.refresh()
    } else {
      toast.error(res.error?.message || 'Failed to upload document.')
    }
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn--primary btn--sm">
        <Plus size={16} />
        Upload Document
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
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
              maxWidth: 540,
              padding: 'var(--space-6)',
              position: 'relative',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', background: 'var(--accent-primary-muted)', color: 'var(--accent-primary)' }}>
                  <Upload size={18} />
                </div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                  Upload Document / Link
                </h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="btn btn--ghost btn--icon">
                <X size={18} />
              </button>
            </div>

            {/* Toggle Mode: File Picker vs Link */}
            <div className="flex gap-2 mb-4 p-1" style={{ background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)' }}>
              <button
                type="button"
                className={`btn btn--xs flex-1 ${uploadMode === 'FILE' ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setUploadMode('FILE')}
              >
                <FileText size={14} />
                <span>File Picker</span>
              </button>
              <button
                type="button"
                className={`btn btn--xs flex-1 ${uploadMode === 'LINK' ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setUploadMode('LINK')}
              >
                <LinkIcon size={14} />
                <span>External Link</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="name">
                  Document Title <span className="form-required">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  className="form-input"
                  placeholder="e.g. Project Architecture Spec v1.pdf"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  required
                />
              </div>

              {uploadMode === 'FILE' ? (
                <div className="form-group">
                  <label className="form-label">
                    Select Local File <span className="form-required">*</span>
                  </label>
                  <input
                    key={isOpen ? 'file-open' : 'file-closed'}
                    type="file"
                    className="form-input"
                    onChange={handleFileChange}
                    style={{ padding: '6px 12px' }}
                    required={!pickedFile}
                  />
                  {pickedFile && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', marginTop: 4 }}>
                      Selected: {pickedFile.name} ({(pickedFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label" htmlFor="fileUrl">
                    External Link / URL <span className="form-required">*</span>
                  </label>
                  <input
                    id="fileUrl"
                    name="fileUrl"
                    type="url"
                    className="form-input"
                    placeholder="https://figma.com/file/... or https://drive.google.com/..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    required={uploadMode === 'LINK'}
                  />
                </div>
              )}

              <div className="settings-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="clientId">Associated Client</label>
                  <select
                    id="clientId"
                    name="clientId"
                    className="form-select"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                  >
                    <option value="">Select client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="projectId">Associated Project</label>
                  <select id="projectId" name="projectId" className="form-select">
                    <option value="">Select project...</option>
                    {filteredProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="visibility">Visibility Level</label>
                <select id="visibility" name="visibility" className="form-select" defaultValue="CLIENT_VISIBLE">
                  <option value="CLIENT_VISIBLE">Client Visible (Client & Team can view)</option>
                  <option value="INTERNAL">Internal Only (Team & Admin only)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                <button type="button" onClick={() => setIsOpen(false)} className="btn btn--ghost">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className={`btn btn--primary${loading ? ' btn--loading' : ''}`}>
                  {loading ? '' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
