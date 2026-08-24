import { prisma } from '@/lib/prisma'
import { getClientSubTeamContext, AuthUser } from '@/lib/auth/server'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { writeAuditLog } from '@/lib/audit'
import { NoteType } from '@prisma/client'

export class NoteService {
  static async validateProjectAccess(projectId: string, user: AuthUser) {
    if (user.role === 'ADMIN') return true

    if (user.role === 'TEAM_MEMBER') {
      const pm = await prisma.projectMember.findFirst({
        where: { projectId, profileId: user.id }
      })
      if (!pm && user.teamRole !== 'TEAM_LEAD') {
        throw new Error('Unauthorized project access')
      }
      return true
    }

    if (user.role === 'CLIENT') {
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      })
      if (!project) throw new NotFoundError('Project not found')

      const subteam = await getClientSubTeamContext(user.id)
      const clientId = subteam ? subteam.clientId : (await prisma.client.findFirst({
        where: { profileId: user.id },
        select: { id: true }
      }))?.id

      if (!clientId || clientId !== project.clientId) {
        throw new Error('Unauthorized project access')
      }

      if (subteam) {
        if (!subteam.policy.notes) {
          throw new Error('Unauthorized notes access')
        }
        if (subteam.allowedProjectIds.length > 0 && !subteam.allowedProjectIds.includes(projectId)) {
          throw new Error('Unauthorized project access')
        }
      }
      return true
    }

    throw new Error('Unauthorized')
  }

  static async getNotesList(projectId: string, user: AuthUser) {
    await this.validateProjectAccess(projectId, user)

    const allNotes = await prisma.note.findMany({
      where: { projectId },
      include: {
        creator: { select: { id: true, name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (user.role === 'ADMIN' || user.teamRole === 'TEAM_LEAD') {
      return allNotes
    }

    if (user.role === 'TEAM_MEMBER') {
      return allNotes.filter((n) => {
        const hasProfiles = n.allowedProfileIds && n.allowedProfileIds.length > 0
        if (hasProfiles) {
          return n.creatorId === user.id || n.allowedProfileIds.includes(user.id)
        }
        return true
      })
    }

    if (user.role === 'CLIENT') {
      const subteam = await getClientSubTeamContext(user.id)
      return allNotes.filter((n) => {
        if (n.type !== NoteType.EXTERNAL_CLIENT) return false

        const hasProfiles = n.allowedProfileIds && n.allowedProfileIds.length > 0
        const hasSubteams = n.allowedSubTeamIds && n.allowedSubTeamIds.length > 0

        if (!hasProfiles && !hasSubteams) return true

        if (n.creatorId === user.id) return true
        if (hasProfiles && n.allowedProfileIds.includes(user.id)) return true
        if (hasSubteams && subteam && n.allowedSubTeamIds.includes(subteam.subTeamId)) return true

        return false
      })
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
    await this.validateProjectAccess(projectId, user)

    let noteType = type
    if (user.role === 'CLIENT') {
      noteType = NoteType.EXTERNAL_CLIENT
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

    await this.validateProjectAccess(note.projectId, user)

    const isLeadOrAdmin = user.role === 'ADMIN' || user.teamRole === 'TEAM_LEAD'
    const isCreator = note.creatorId === user.id
    
    const isClientEditor = user.role === 'CLIENT' && note.type === NoteType.EXTERNAL_CLIENT

    if (!isCreator && !isLeadOrAdmin && !isClientEditor) {
      throw new Error('Unauthorized to modify this note')
    }

    const updateData: any = {}
    if (body.title && (isCreator || isLeadOrAdmin)) updateData.title = body.title
    if (body.content && (isCreator || isLeadOrAdmin)) updateData.content = body.content
    
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

    await this.validateProjectAccess(note.projectId, user)

    const isLeadOrAdmin = user.role === 'ADMIN' || user.teamRole === 'TEAM_LEAD'
    const isCreator = note.creatorId === user.id

    if (!isCreator && !isLeadOrAdmin) {
      throw new Error('Only the creator or admin can delete this note')
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
