import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { sendRoleAccountCreatedEmail } from '@/infrastructure/email'
import { createNotification } from '@/lib/notifications'
import { prisma } from '@/lib/prisma'
import { createSupabaseAdminClient } from '@/infrastructure/supabase/server'
import { getAppBaseUrl } from '@/shared/utilities/url'
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

    const [members, totalCount, adminCount, teamLeadCount, devCount, testerCount] = await Promise.all([
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
      prisma.profile.count({ where: { teamRole: 'DEVELOPER' } }),
      prisma.profile.count({ where: { teamRole: 'TESTER' } }),
    ])

    return apiSuccess({
      members,
      stats: {
        totalCount,
        adminCount,
        teamLeadCount,
        devCount,
        testerCount,
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
    let inviteLink = `${appUrl}/login`
    let userId = crypto.randomUUID()
    const supabaseAdmin = createSupabaseAdminClient()

    try {
      let { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
          data: { role: role || 'TEAM_MEMBER', teamRole, name },
        },
      })

      if (linkError || !linkData?.user?.id) {
        const fallback = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: {
            redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
          },
        })
        linkData = fallback.data
        linkError = fallback.error
      }

      if (linkData?.user?.id) {
        userId = linkData.user.id
        inviteLink = linkData.properties?.action_link ?? `${appUrl}/login`
      } else if (linkError) {
        console.warn('Supabase invite link warning:', linkError.message)
      }
    } catch (err) {
      console.warn('Failed to invoke Supabase Auth Admin:', err)
    }

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
