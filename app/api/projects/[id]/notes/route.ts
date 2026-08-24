import { NextRequest } from 'next/server'
import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { getServerUser } from '@/lib/auth/server'
import { NoteService } from '@/lib/services/note.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  const { id } = await params

  try {
    const notes = await NoteService.getNotesList(id, user)
    return apiSuccess(notes)
  } catch (error: any) {
    console.error('GET notes error:', error)
    return Errors.INTERNAL(error.message || 'Failed to fetch notes')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  const { id } = await params

  try {
    const body = await request.json()
    const note = await NoteService.createNote({ ...body, projectId: id }, user)
    return apiSuccess(note, 201)
  } catch (error: any) {
    console.error('POST note error:', error)
    if (error.name === 'ValidationError') {
      return Errors.VALIDATION(error.message)
    }
    return Errors.INTERNAL(error.message || 'Failed to create note')
  }
}
