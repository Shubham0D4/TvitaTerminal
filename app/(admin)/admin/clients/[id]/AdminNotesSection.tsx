'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, Trash2, Globe, Lock, Link, Calendar, Paperclip, Send, Eye, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/utils/api-client'
import type { NoteType } from '@prisma/client'

interface ProjectItem {
  id: string
  name: string
}

interface NoteAttachment {
  name: string
  url: string
  mimeType?: string
  size?: number
}

interface NoteItem {
  id: string
  title: string
  content: string
  type: NoteType
  createdAt: string
  creatorId: string
  creator?: {
    id: string
    name: string
    role: string
  }
  attachments?: any // JSON array
}

interface Props {
  clientId: string
  projects: ProjectItem[]
}

export default function AdminNotesSection({ clientId, projects = [] }: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '')
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPosting, setIsPosting] = useState(false)

  // Form State
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [shareWithClient, setShareWithClient] = useState(true)
  const [uploadedFiles, setUploadedFiles] = useState<NoteAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (!selectedProjectId) {
      setNotes([])
      return
    }

    async function fetchNotes() {
      setIsLoading(true)
      const res = await apiClient<NoteItem[]>(`/api/projects/${selectedProjectId}/notes`)
      setIsLoading(false)

      if (res.success && res.data) {
        setNotes(res.data)
      } else {
        toast.error(res.error?.message || 'Failed to fetch notes.')
      }
    }

    fetchNotes()
  }, [selectedProjectId])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !selectedProjectId) return

    setIsUploading(true)
    const file = files[0]
    const formData = new FormData()
    formData.append('file', file)

    try {
      // Direct call since we need multi-part formData
      const response = await fetch(`/api/projects/${selectedProjectId}/notes/attachments`, {
        method: 'POST',
        body: formData,
      })

      const json = await response.json()
      if (!response.ok || json.error) {
        throw new Error(json.error?.message || 'Failed to upload file.')
      }

      const uploaded = json.data as NoteAttachment
      setUploadedFiles((prev) => [...prev, uploaded])
      toast.success(`Uploaded ${file.name}`)
    } catch (err: any) {
      toast.error(err.message || 'File upload failed.')
    } finally {
      setIsUploading(false)
      // reset file input
      e.target.value = ''
    }
  }

  const handleRemoveUploaded = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId || !title.trim() || !content.trim()) {
      toast.error('Title and content are required.')
      return
    }

    setIsPosting(true)
    const noteType: NoteType = shareWithClient ? 'EXTERNAL_CLIENT' : 'INTERNAL_TEAM'

    const res = await apiClient<NoteItem>(`/api/projects/${selectedProjectId}/notes`, {
      method: 'POST',
      body: JSON.stringify({
        title: title.trim(),
        content: content.trim(),
        type: noteType,
        attachments: uploadedFiles,
      }),
    })

    setIsPosting(false)

    if (res.success && res.data) {
      toast.success('Note posted successfully.')
      setNotes((prev) => [res.data!, ...prev])
      setTitle('')
      setContent('')
      setUploadedFiles([])
    } else {
      toast.error(res.error?.message || 'Failed to post note.')
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to permanently delete this note?')) return

    const res = await apiClient(`/api/projects/notes/${noteId}`, {
      method: 'DELETE',
    })

    if (res.success) {
      toast.success('Note deleted.')
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    } else {
      toast.error(res.error?.message || 'Failed to delete note.')
    }
  }

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Selector card */}
      <div 
        className="card" 
        style={{ 
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid rgba(16, 28, 107, 0.08)',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', margin: 0 }}>
            Shared Notes Workspace
          </h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
            Post updates, upload files, and share notes with the client portal.
          </p>
        </div>

        {projects.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>Select Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="form-select"
              style={{ padding: '6px 12px', fontSize: 'var(--text-xs)', borderRadius: '8px', border: '1px solid var(--border-default)', minWidth: 200 }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <span style={{ fontSize: 'var(--text-xs)', color: '#ea580c', fontWeight: 600, background: 'rgba(234, 88, 12, 0.08)', padding: '4px 12px', borderRadius: '8px' }}>
            No Projects Linked to Client
          </span>
        )}
      </div>

      {projects.length > 0 && (
        <div className="grid grid-cols-3 gap-6" style={{ alignItems: 'start' }}>
          
          {/* Timeline - Left 2 Columns */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div 
              className="card" 
              style={{ 
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid rgba(16, 28, 107, 0.08)',
                padding: '24px',
              }}
            >
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', marginTop: 0 }}>
                Notes Timeline
              </h4>

              {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                  <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : notes.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center' }}>
                  <FileText size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No notes posted in this project yet.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {notes.map((note) => {
                    const isClientVisible = note.type === 'EXTERNAL_CLIENT'
                    const attachments = Array.isArray(note.attachments)
                      ? note.attachments
                      : typeof note.attachments === 'string'
                      ? JSON.parse(note.attachments)
                      : []

                    return (
                      <div
                        key={note.id}
                        style={{
                          padding: '16px',
                          borderRadius: '12px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid rgba(16, 28, 107, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {note.creator?.name || 'Team member'}
                              </span>
                              <span 
                                style={{ 
                                  fontSize: '9px', 
                                  color: 'var(--text-muted)', 
                                  background: 'rgba(0,0,0,0.05)', 
                                  padding: '2px 6px', 
                                  borderRadius: '4px',
                                  textTransform: 'uppercase',
                                  fontWeight: 600
                                }}
                              >
                                {note.creator?.role || 'Admin'}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {formatDate(note.createdAt)}
                              </span>
                            </div>
                            <h5 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', margin: '8px 0 0 0' }}>
                              {note.title}
                            </h5>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isClientVisible ? (
                              <span 
                                style={{ 
                                  fontSize: '10px', 
                                  fontWeight: 600, 
                                  color: '#10b981', 
                                  background: 'rgba(16, 185, 129, 0.08)', 
                                  padding: '2px 8px', 
                                  borderRadius: '10px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  border: '1px solid rgba(16, 185, 129, 0.15)'
                                }}
                              >
                                <Globe size={10} /> Shared
                              </span>
                            ) : (
                              <span 
                                style={{ 
                                  fontSize: '10px', 
                                  fontWeight: 600, 
                                  color: 'var(--text-muted)', 
                                  background: 'rgba(107, 114, 128, 0.08)', 
                                  padding: '2px 8px', 
                                  borderRadius: '10px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  border: '1px solid rgba(107, 114, 128, 0.15)'
                                }}
                              >
                                <Lock size={10} /> Internal
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteNote(note.id)}
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', color: 'var(--color-danger)', borderRadius: '4px' }}
                              className="btn-delete-note"
                              title="Delete Note"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {note.content}
                        </div>

                        {attachments.length > 0 && (
                          <div style={{ marginTop: '4px', borderTop: '1px solid rgba(16, 28, 107, 0.04)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Attachments ({attachments.length})
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {attachments.map((file: NoteAttachment, i: number) => (
                                <a
                                  key={i}
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    background: '#ffffff',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: '8px',
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--text-primary)',
                                    textDecoration: 'none',
                                    fontWeight: 500,
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                  }}
                                >
                                  <Paperclip size={12} style={{ color: 'var(--text-muted)' }} />
                                  <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {file.name}
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Form - Right 1 Column */}
          <div className="lg:col-span-1">
            <form 
              onSubmit={handlePostNote}
              className="card" 
              style={{ 
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid rgba(16, 28, 107, 0.08)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Write Note
              </h4>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Walkthrough Summary"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>Content *</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Write note details or project updates here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="form-textarea"
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={shareWithClient}
                    onChange={(e) => setShareWithClient(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                  />
                  Share with Client Portal
                </label>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>Attachments</label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px',
                      border: '1.5px dashed var(--border-default)',
                      borderRadius: '8px',
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                      fontWeight: 500,
                      textAlign: 'center',
                      background: 'rgba(0,0,0,0.01)'
                    }}
                  >
                    <Paperclip size={14} />
                    {isUploading ? 'Uploading file...' : 'Choose File to Attach'}
                    <input
                      type="file"
                      disabled={isUploading}
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {uploadedFiles.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                      {uploadedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: 'var(--bg-elevated)',
                            borderRadius: '8px',
                            fontSize: 'var(--text-xs)',
                            border: '1px solid var(--border-subtle)'
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px', color: 'var(--text-primary)' }}>
                            {file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveUploaded(idx)}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isPosting}
                className={`btn btn--primary${isPosting ? ' btn--loading' : ''}`}
                style={{
                  borderRadius: '10px', 
                  background: 'var(--accent-primary)', 
                  color: '#ffffff',
                  fontWeight: 600, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px',
                  boxShadow: '0 2px 4px rgba(35, 64, 184, 0.15)',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '8px'
                }}
              >
                <Send size={14} /> {isPosting ? 'Posting...' : 'Post Note'}
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  )
}
