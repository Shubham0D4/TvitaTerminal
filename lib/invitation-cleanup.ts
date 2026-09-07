import { prisma } from '@/lib/prisma'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

let lastCleanupTime = 0
const CLEANUP_THROTTLE_MS = 60 * 60 * 1000 // 1 hour

/**
 * Purge unused invitations only.
 *
 * A profile is eligible only when it was invited more than 48 hours ago, never
 * set a password, has no sessions, and is not an ADMIN or a primary Client
 * owner. Live accounts must never be deleted because `invitedAt` used to stay
 * set after onboarding.
 */
export async function cleanupExpiredInvitations() {
  const now = Date.now()
  if (now - lastCleanupTime < CLEANUP_THROTTLE_MS) {
    return { cleanedCount: 0, skipped: true }
  }
  lastCleanupTime = now

  try {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

    const expiredProfiles = await prisma.profile.findMany({
      where: {
        invitedAt: { lt: fortyEightHoursAgo },
        passwordHash: null,
        role: { not: 'ADMIN' },
        clientProfile: { is: null },
        sessions: { none: {} },
        accounts: { none: { password: { not: null } } },
      },
      select: {
        id: true,
        email: true,
      },
    })

    if (expiredProfiles.length === 0) {
      return { cleanedCount: 0 }
    }

    const expiredIds = expiredProfiles.map((p) => p.id)

    console.log(`[Invitation Cleanup] Found ${expiredProfiles.length} unused expired invitations. Purging...`)

    const supabaseAdmin = createSupabaseAdminClient()
    for (const profile of expiredProfiles) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(profile.id)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        console.warn(`[Invitation Cleanup] Failed to delete Supabase user ${profile.id}:`, message)
      }
    }

    await prisma.clientSubTeamMember.deleteMany({
      where: {
        profileId: { in: expiredIds },
      },
    })

    const deleteRes = await prisma.profile.deleteMany({
      where: {
        id: { in: expiredIds },
        passwordHash: null,
        role: { not: 'ADMIN' },
        clientProfile: { is: null },
      },
    })

    console.log(`[Invitation Cleanup] Successfully purged ${deleteRes.count} unused invite profiles.`)
    return { cleanedCount: deleteRes.count }
  } catch (error) {
    console.error('[Invitation Cleanup] Error running cleanup:', error)
    return { error }
  }
}
