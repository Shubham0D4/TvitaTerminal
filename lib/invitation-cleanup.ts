import { prisma } from '@/lib/prisma'
import { createSupabaseAdminClient } from '@/infrastructure/supabase/server'

export async function cleanupExpiredInvitations() {
  try {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

    const expiredProfiles = await prisma.profile.findMany({
      where: {
        invitedAt: {
          lt: fortyEightHoursAgo,
        },
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

    console.log(`[Invitation Cleanup] Found ${expiredProfiles.length} expired invitations. Purging...`)

    const supabaseAdmin = createSupabaseAdminClient()
    for (const profile of expiredProfiles) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(profile.id)
        console.log(`[Invitation Cleanup] Deleted Supabase user ${profile.id} (${profile.email})`)
      } catch (err: any) {
        console.warn(`[Invitation Cleanup] Failed to delete Supabase user ${profile.id}:`, err?.message || err)
      }
    }

    await prisma.clientSubTeamMember.deleteMany({
      where: {
        profileId: { in: expiredIds },
      },
    })

    await prisma.client.deleteMany({
      where: {
        profileId: { in: expiredIds },
      },
    })

    const deleteRes = await prisma.profile.deleteMany({
      where: {
        id: { in: expiredIds },
      },
    })

    console.log(`[Invitation Cleanup] Successfully purged ${deleteRes.count} profiles.`)
    return { cleanedCount: deleteRes.count }
  } catch (error) {
    console.error('[Invitation Cleanup] Error running cleanup:', error)
    return { error }
  }
}
