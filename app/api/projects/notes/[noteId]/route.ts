import { NextRequest } from 'next/server'
import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { getServerUser } from '@/lib/auth/server'
import { NoteService } from '@/lib/services/note.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  const { noteId } = await params

  try {
    const body = await request.json()
    const note = await NoteService.updateNote(noteId, body, user)
    return apiSuccess(note)
  } catch (error: any) {
    console.error('PATCH note error:', error)
    return fromUnknownError(error, 'Failed to update note')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  const { noteId } = await params

  try {
    const result = await NoteService.deleteNote(noteId, user)
    return apiSuccess(result)
  } catch (error: any) {
    console.error('DELETE note error:', error)
    return fromUnknownError(error, 'Failed to delete note')
  }
}
