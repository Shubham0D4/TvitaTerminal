import { prisma } from '@/lib/prisma'
import { getClientSubTeamContext, AuthUser } from '@/lib/auth/server'
import { ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors'
import { writeAuditLog } from '@/lib/audit'
import { NoteType } from '@prisma/client'
import { assertProjectAccess, isProjectManager, redactAgencyPersonForClient } from '@/lib/auth/access'

export class NoteService {
  static async validateProjectAccess(projectId: string, user: AuthUser) {
    return assertProjectAccess(user, projectId, { clientPolicy: 'notes' })
  }

  static async getNotesList(projectId: string, user: AuthUser) {
    const project = await this.validateProjectAccess(projectId, user)

    const allNotes = await prisma.note.findMany({
      where: { projectId },
      include: {
        creator: { select: { id: true, name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (isProjectManager(user, project)) {
      return allNotes
    }

    if (user.role === 'TEAM_MEMBER') {
      return allNotes.filter((n) => {
        if (n.type === NoteType.EXTERNAL_CLIENT) return false
        const hasProfiles = n.allowedProfileIds && n.allowedProfileIds.length > 0
        if (hasProfiles) {
          return n.creatorId === user.id || n.allowedProfileIds.includes(user.id)
        }
        return true
      })
    }

    if (user.role === 'CLIENT') {
      const subteam = await getClientSubTeamContext(user.id)
      return allNotes
        .filter((n) => {
          if (n.type !== NoteType.EXTERNAL_CLIENT) return false

          const hasProfiles = n.allowedProfileIds && n.allowedProfileIds.length > 0
          const hasSubteams = n.allowedSubTeamIds && n.allowedSubTeamIds.length > 0

          if (!hasProfiles && !hasSubteams) return true

          if (n.creatorId === user.id) return true
          if (hasProfiles && n.allowedProfileIds.includes(user.id)) return true
          if (hasSubteams && subteam && n.allowedSubTeamIds.includes(subteam.subTeamId)) return true

          return false
        })
        .map((n) => ({
          ...n,
          creator: redactAgencyPersonForClient(n.creator, project.leadId),
        }))
    }

    return []
  }

  static async createNote(
    body: {
      projectId: string
      title: string
      content: string
      type?: NoteType
      allowedProfileIds?: string[]
      allowedSubTeamIds?: string[]
      attachments?: { name: string; url: string; mimeType: string; size: number }[]
    },
    user: AuthUser
  ) {
    const { projectId, title, content, type = NoteType.INTERNAL_TEAM, allowedProfileIds = [], allowedSubTeamIds = [], attachments = [] } = body
    if (!content) {
      throw new ValidationError('Message content is required')
    }
    const project = await this.validateProjectAccess(projectId, user)

    let noteType = type
    if (user.role === 'CLIENT') {
      noteType = NoteType.EXTERNAL_CLIENT
    } else if (!isProjectManager(user, project)) {
      noteType = NoteType.INTERNAL_TEAM
    }

    const autoTitle = title?.trim() || (content.length > 40 ? content.slice(0, 40) + '...' : content)

    const note = await prisma.note.create({
      data: {
        projectId,
        title: autoTitle,
        content,
        type: noteType,
        creatorId: user.id,
        allowedProfileIds,
        allowedSubTeamIds,
        attachments,
      },
      include: {
        creator: { select: { id: true, name: true, role: true } }
      }
    })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'CREATE',
      entityType: 'note',
      entityId: note.id,
      entityLabel: autoTitle,
      newValue: { projectId, type: noteType },
    })

    return note
  }

  static async updateNote(
    id: string,
    body: {
      title?: string
      content?: string
      allowedProfileIds?: string[]
      allowedSubTeamIds?: string[]
    },
    user: AuthUser
  ) {
    const note = await prisma.note.findUnique({ where: { id } })
    if (!note) throw new NotFoundError('Note not found')

    const project = await this.validateProjectAccess(note.projectId, user)

    const canManage = isProjectManager(user, project)
    const isCreator = note.creatorId === user.id

    if (!isCreator && !canManage) {
      throw new AuthorizationError('Unauthorized to modify this note')
    }

    const updateData: any = {}
    if (body.title && (isCreator || canManage)) updateData.title = body.title
    if (body.content && (isCreator || canManage)) updateData.content = body.content
    
    if (body.allowedProfileIds) updateData.allowedProfileIds = body.allowedProfileIds
    if (body.allowedSubTeamIds) updateData.allowedSubTeamIds = body.allowedSubTeamIds

    const updated = await prisma.note.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, role: true } }
      }
    })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'UPDATE',
      entityType: 'note',
      entityId: id,
      entityLabel: updated.title,
    })

    return updated
  }

  static async deleteNote(id: string, user: AuthUser) {
    const note = await prisma.note.findUnique({ where: { id } })
    if (!note) throw new NotFoundError('Note not found')

    const project = await this.validateProjectAccess(note.projectId, user)

    const canManage = isProjectManager(user, project)
    const isCreator = note.creatorId === user.id

    if (!isCreator && !canManage) {
      throw new AuthorizationError('Only the creator or project lead can delete this note')
    }

    await prisma.note.delete({ where: { id } })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'DELETE',
      entityType: 'note',
      entityId: id,
      entityLabel: note.title,
    })

    return { deleted: true }
  }
}
