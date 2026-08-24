import crypto from 'crypto'
import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { sendRoleAccountCreatedEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { prisma } from '@/lib/prisma'
import { getAppBaseUrl } from '@/lib/utils/url'
import { TeamRole } from '@prisma/client'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const role = searchParams.get('role') || ''
  const teamRole = searchParams.get('teamRole') || ''

  try {
    const where: any = {}
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ]
    }
    if (role) where.role = role
    if (teamRole) where.teamRole = teamRole

    const [members, totalCount, adminCount, teamLeadCount, memberCount] = await Promise.all([
      prisma.profile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          projectMembers: { include: { project: { select: { name: true } } } },
          tasksAssigned: { select: { id: true, status: true } },
        },
      }),
      prisma.profile.count(),
      prisma.profile.count({ where: { role: 'ADMIN' } }),
      prisma.profile.count({ where: { teamRole: 'TEAM_LEAD' } }),
      prisma.profile.count({ where: { teamRole: 'MEMBER' } }),
    ])

    return apiSuccess({
      members,
      stats: {
        totalCount,
        adminCount,
        teamLeadCount,
        memberCount,
      },
    })
  } catch (error) {
    console.error('Admin team GET API error:', error)
    return Errors.INTERNAL('Failed to fetch team members')
  }
}

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const body = await request.json()
    const { name, email, phone, salary, role, teamRole } = body

    if (!name || !email) {
      return Errors.VALIDATION('Name and email are required')
    }

    const existing = await prisma.profile.findUnique({ where: { email } })
    if (existing) {
      return Errors.CONFLICT('A profile with this email address already exists')
    }

    const appUrl = getAppBaseUrl(request)
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const userId = crypto.randomUUID()
    const inviteLink = `${appUrl}/auth/callback?token=${token}&email=${email}&next=/reset-password`

    const newMember = await prisma.profile.create({
      data: {
        id: userId,
        name,
        email,
        phone: phone || null,
        salary: salary !== undefined && salary !== null && !isNaN(Number(salary)) ? Number(salary) : null,
        role: role || 'TEAM_MEMBER',
        teamRole: (teamRole as TeamRole) || null,
        isActive: true,
        invitedAt: new Date(),
        magicLinkToken: token,
        magicLinkExpires: expires,
      },
    })

    // Send email invitation
    await sendRoleAccountCreatedEmail({
      to: email,
      name,
      role: teamRole || role || 'TEAM_MEMBER',
      inviteLink,
    })

    // Create welcoming in-app notification
    await createNotification({
      userId: newMember.id,
      title: 'Welcome to Tvita!',
      message: `Your staff account (${(teamRole || role).replace('_', ' ')}) has been set up. Check your email to set your password!`,
      type: 'INFO',
    })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'CREATE',
      entityType: 'user',
      entityId: newMember.id,
      entityLabel: newMember.name,
      newValue: { name: newMember.name, role: newMember.role, teamRole: newMember.teamRole },
    })

    return apiSuccess(newMember, 201)
  } catch (error) {
    console.error('Admin team POST API error:', error)
    return Errors.INTERNAL('Failed to create team member')
  }
}
