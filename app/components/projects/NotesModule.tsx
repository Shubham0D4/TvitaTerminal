'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { Send, Lock, Eye, Trash2, Paperclip, FileText, X, Download, Image as ImageIcon, Wifi } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/utils/api-client'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { AGENCY_TEAM_LABEL, agencyNameForClient } from '@/lib/auth/visibility'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Attachment {
  name: string
  url: string
  mimeType: string
  size: number
}

interface Note {
  id: string
  title: string
  content: string
  type: 'INTERNAL_TEAM' | 'EXTERNAL_CLIENT'
  creatorId: string
  creator: { id: string; name: string; role: string }
  allowedProfileIds: string[]
  allowedSubTeamIds: string[]
  attachments: Attachment[]
  createdAt: string
}

interface Props {
  projectId: string
  clientId: string
  userRole: string
  userTeamRole: string | null
  userId: string
  hasAccess: boolean
  projectLeadId?: string | null
}

// Allowed file types (no executables, no zip)
const ACCEPT_TYPES = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.md', '.csv',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
].join(',')

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(mimeType: string) {
  return mimeType.startsWith('image/')
}

function FileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      background: 'rgba(99,102,241,0.08)',
      border: '1px solid rgba(99,102,241,0.2)',
      borderRadius: 8,
      padding: '4px 10px',
      fontSize: 12,
      maxWidth: 200,
    }}>
      {isImage(file.type) ? <ImageIcon size={12} style={{ color: '#6366f1', flexShrink: 0 }} /> : <FileText size={12} style={{ color: '#6366f1', flexShrink: 0 }} />}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
        {file.name}
      </span>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{formatFileSize(file.size)}</span>
      <button type="button" onClick={onRemove} style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: 0, background: 'none', border: 'none', display: 'flex' }}>
        <X size={11} />
      </button>
    </div>
  )
}

function AttachmentLink({ att }: { att: Attachment }) {
  return (
    <a
      href={att.url}
      target="_blank"
      rel="noreferrer noopener"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: 'rgba(99,102,241,0.07)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 8,
        padding: '4px 10px',
        fontSize: 11,
        color: 'var(--accent-primary)',
        textDecoration: 'none',
        maxWidth: 220,
      }}
    >
      {isImage(att.mimeType) ? <ImageIcon size={11} style={{ flexShrink: 0 }} /> : <FileText size={11} style={{ flexShrink: 0 }} />}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
      <Download size={10} style={{ flexShrink: 0, opacity: 0.6 }} />
    </a>
  )
}

export default function NotesModule({ projectId, userRole, userTeamRole, userId, hasAccess, projectLeadId = null }: Props) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [activeChannel, setActiveChannel] = useState<'ALL' | 'INTERNAL_TEAM' | 'EXTERNAL_CLIENT'>('ALL')
  const [content, setContent] = useState('')
  const [messageType, setMessageType] = useState<'INTERNAL_TEAM' | 'EXTERNAL_CLIENT'>(
    userRole === 'CLIENT' ? 'EXTERNAL_CLIENT' : 'INTERNAL_TEAM'
  )
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const isClient = userRole === 'CLIENT'
  const isLeadOrAdmin = userRole === 'ADMIN' || userTeamRole === 'TEAM_LEAD'

  const presentNote = (note: Note): Note => {
    if (!isClient) return note
    return {
      ...note,
      creator: {
        ...note.creator,
        name: agencyNameForClient(note.creator, projectLeadId),
      },
    }
  }

  // Initial fetch
  useEffect(() => {
    if (!hasAccess) return
    apiClient.get<Note[]>(`/api/projects/${projectId}/notes`)
      .then((res) => {
        const sorted = [...(res || [])]
          .map(presentNote)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        setNotes(sorted)
        setLoading(false)
      })
      .catch(() => {
        toast.error('Failed to load messages')
        setLoading(false)
      })
  }, [projectId, hasAccess])

  // WebSocket Realtime Channel Subscription
  useEffect(() => {
    if (!hasAccess || !projectId) return

    const supabase = createSupabaseBrowserClient()
    const channelName = `project-notes:${projectId}`
    
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    })

    channel
      .on('broadcast', { event: 'new_note' }, ({ payload }) => {
        const note = payload as Note
        if (isClient && note.type === 'INTERNAL_TEAM') return
        if (!isLeadOrAdmin && !isClient && note.type === 'EXTERNAL_CLIENT') return
        setNotes((prev) => {
          if (prev.some((n) => n.id === note.id)) return prev
          return [...prev, presentNote(note)].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        })
      })
      .on('broadcast', { event: 'delete_note' }, ({ payload }) => {
        const { noteId } = payload as { noteId: string }
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        } else {
          setIsConnected(false)
        }
      })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      setIsConnected(false)
    }
  }, [projectId, hasAccess, isClient, isLeadOrAdmin, projectLeadId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [notes, activeChannel])

  if (!hasAccess) {
    return (
      <div className="card text-center py-6">
        <p style={{ color: 'var(--text-muted)' }}>You do not have permission to access notes for this project.</p>
      </div>
    )
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const valid = files.filter(f => f.size <= 20 * 1024 * 1024)
    const invalid = files.filter(f => f.size > 20 * 1024 * 1024)
    if (invalid.length > 0) toast.error('Some files exceed 20MB and were excluded')
    setPendingFiles(prev => [...prev, ...valid].slice(0, 5))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (idx: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const uploadFiles = async (): Promise<Attachment[]> => {
    const uploaded: Attachment[] = []
    for (const file of pendingFiles) {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/projects/${projectId}/notes/attachments`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Failed to upload ${file.name}`)
      }
      const data = await res.json()
      uploaded.push(data.data || data)
    }
    return uploaded
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && pendingFiles.length === 0) return

    startTransition(async () => {
      setUploading(true)
      try {
        let attachments: Attachment[] = []
        if (pendingFiles.length > 0) {
          attachments = await uploadFiles()
        }

        const newNote = await apiClient.post<Note>(`/api/projects/${projectId}/notes`, {
          content: content.trim() || '📎 Shared a file',
          type: isClient ? 'EXTERNAL_CLIENT' : isLeadOrAdmin ? messageType : 'INTERNAL_TEAM',
          attachments,
        })

        setNotes(prev => [...prev, presentNote(newNote)])
        setContent('')
        setPendingFiles([])

        // Broadcast to other WebSocket subscribers
        channelRef.current?.send({
          type: 'broadcast',
          event: 'new_note',
          payload: newNote,
        })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to send message')
      } finally {
        setUploading(false)
      }
    })
  }

  const handleDelete = (noteId: string) => {
    if (!confirm('Delete this message?')) return
    startTransition(async () => {
      try {
        await apiClient.delete(`/api/projects/notes/${noteId}`)
        setNotes(prev => prev.filter(n => n.id !== noteId))
        toast.success('Message deleted')

        // Broadcast deletion event to WebSocket subscribers
        channelRef.current?.send({
          type: 'broadcast',
          event: 'delete_note',
          payload: { noteId },
        })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete')
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e as unknown as React.FormEvent)
    }
  }

  const filteredNotes = notes.filter(n => {
    if (activeChannel === 'ALL') return true
    return n.type === activeChannel
  })

  if (loading) {
    return (
      <div className="card text-center py-8">
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Loading messages...</p>
      </div>
    )
  }

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: 580,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexShrink: 0,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', margin: 0 }}>
              Notes & Chat
            </h2>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: isConnected ? '#DFF0E8' : '#FFF3D6',
                color: isConnected ? '#1E6B50' : '#8A6A0B',
                fontSize: 10,
                fontWeight: 'var(--font-bold)',
              }}
            >
              <Wifi size={10} />
              <span>{isConnected ? 'LIVE WS' : 'CONNECTING'}</span>
            </div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {filteredNotes.length} message{filteredNotes.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Channel filter — Lead/Admin only */}
        {isLeadOrAdmin && (
          <div style={{ display: 'flex', gap: 4 }}>
            {([
              { key: 'ALL' as const, label: 'All', icon: null },
              { key: 'INTERNAL_TEAM' as const, label: 'Internal', icon: <Lock size={10} /> },
              { key: 'EXTERNAL_CLIENT' as const, label: 'Client', icon: <Eye size={10} /> },
            ]).map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveChannel(tab.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 20,
                  border: '1px solid',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                  backgroundColor: activeChannel === tab.key ? 'var(--accent-primary)' : 'transparent',
                  borderColor: activeChannel === tab.key ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  color: activeChannel === tab.key ? '#fff' : 'var(--text-muted)',
                }}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        background: '#fafafa',
      }}>
        {filteredNotes.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', margin: 0 }}>No messages yet.</p>
            <p style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>Send a message below to start the conversation.</p>
          </div>
        ) : filteredNotes.map(note => {
          const isMe = note.creatorId === userId
          const canDelete = isMe || isLeadOrAdmin

          return (
            <div
              key={note.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
                maxWidth: '78%',
                alignSelf: isMe ? 'flex-end' : 'flex-start',
              }}
            >
              {/* Meta */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, fontSize: 11, color: 'var(--text-muted)' }}>
                {!isMe && (
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--accent-primary)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}>
                    {(note.creator.name || AGENCY_TEAM_LABEL).charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={{ fontWeight: 600, color: isMe ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                  {isMe ? 'You' : (note.creator.name || AGENCY_TEAM_LABEL)}
                </span>
                {isLeadOrAdmin && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 9,
                    background: note.type === 'INTERNAL_TEAM' ? 'rgba(139,92,246,0.12)' : 'rgba(16,185,129,0.12)',
                    color: note.type === 'INTERNAL_TEAM' ? '#8b5cf6' : '#10b981',
                    padding: '1px 5px', borderRadius: 8, fontWeight: 600,
                  }}>
                    {note.type === 'INTERNAL_TEAM' ? <><Lock size={8} /> Internal</> : <><Eye size={8} /> Client</>}
                  </span>
                )}
                <span>·</span>
                <span>{new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }).format(new Date(note.createdAt))}</span>
              </div>

              {/* Bubble */}
              <div style={{
                background: isMe ? 'rgba(99,102,241,0.09)' : '#ffffff',
                border: `1px solid ${isMe ? 'rgba(99,102,241,0.22)' : 'var(--border-subtle)'}`,
                borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '8px 12px',
                position: 'relative',
                width: '100%',
              }}>
                {/* Content */}
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {note.content}
                </div>

                {/* Attachments */}
                {Array.isArray(note.attachments) && note.attachments.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {note.attachments.map((att, i) => (
                      <AttachmentLink key={i} att={att} />
                    ))}
                  </div>
                )}

                {/* Delete button */}
                {canDelete && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => handleDelete(note.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', opacity: 0.6, padding: '1px 3px',
                        borderRadius: 4, fontSize: 10,
                      }}
                      title="Delete message"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Pending file chips */}
      {pendingFiles.length > 0 && (
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex', flexWrap: 'wrap', gap: 6,
          background: '#fff',
        }}>
          {pendingFiles.map((f, i) => (
            <FileChip key={i} file={f} onRemove={() => removeFile(i)} />
          ))}
        </div>
      )}

      {/* Composer */}
      <form onSubmit={handleSend} style={{
        padding: '10px 12px',
        borderTop: '1px solid var(--border-subtle)',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flexShrink: 0,
      }}>
        {/* Type selector — Lead/Admin only */}
        {isLeadOrAdmin && (
          <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input
                type="radio"
                checked={messageType === 'EXTERNAL_CLIENT'}
                onChange={() => setMessageType('EXTERNAL_CLIENT')}
              />
              <Eye size={11} style={{ color: '#10b981' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Shared with Client</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input
                type="radio"
                checked={messageType === 'INTERNAL_TEAM'}
                onChange={() => setMessageType('INTERNAL_TEAM')}
              />
              <Lock size={11} style={{ color: '#8b5cf6' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Internal Team Only</span>
            </label>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          {/* File attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={pendingFiles.length >= 5}
            title="Attach file (PDF, DOC, image, etc.)"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 8,
              background: pendingFiles.length > 0 ? 'rgba(99,102,241,0.1)' : 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              cursor: pendingFiles.length >= 5 ? 'not-allowed' : 'pointer',
              color: pendingFiles.length > 0 ? 'var(--accent-primary)' : 'var(--text-muted)',
              flexShrink: 0,
            }}
          >
            <Paperclip size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT_TYPES}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* Message textarea */}
          <textarea
            ref={textareaRef}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending || uploading}
            rows={1}
            style={{
              flex: 1,
              resize: 'none',
              borderRadius: 10,
              border: '1px solid var(--border-subtle)',
              padding: '8px 12px',
              fontSize: 'var(--text-sm)',
              lineHeight: 1.5,
              fontFamily: 'inherit',
              background: '#fff',
              color: 'var(--text-primary)',
              outline: 'none',
              minHeight: 36,
              maxHeight: 100,
              overflowY: 'auto',
            }}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={isPending || uploading || (!content.trim() && pendingFiles.length === 0)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '0 16px', height: 36,
              borderRadius: 10,
              background: 'var(--accent-primary)',
              color: '#fff', border: 'none',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              flexShrink: 0,
              opacity: (isPending || uploading || (!content.trim() && pendingFiles.length === 0)) ? 0.5 : 1,
            }}
          >
            <Send size={14} />
            {uploading ? 'Uploading...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
