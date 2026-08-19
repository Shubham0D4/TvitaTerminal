import { NextRequest } from 'next/server'
import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser } from '@/lib/auth/server'
import { uploadToSupabaseStorage } from '@/infrastructure/supabase/storage'
import path from 'path'

// Allowed MIME types — documents, images only. No executables.
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  const { id: projectId } = await params

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return Errors.VALIDATION('No file provided')
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return Errors.VALIDATION(
        `File type "${file.type}" is not allowed. Only documents and images are permitted.`
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return Errors.VALIDATION('File size must be under 20MB')
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = path.extname(file.name) || ''
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
    const storagePath = `note-attachments/${projectId}/${safeName}`

    const url = await uploadToSupabaseStorage({
      filePath: storagePath,
      fileBuffer: buffer,
      contentType: file.type,
      bucketName: 'note-attachments',
    })

    return apiSuccess({
      name: file.name,
      url,
      mimeType: file.type,
      size: file.size,
    })
  } catch (error) {
    console.error('Note attachment upload error:', error)
    return Errors.INTERNAL('Failed to upload attachment')
  }
}
