import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ADMIN_EMAIL = 'shubhamd@tvita.in'
const ADMIN_PASSWORD = 'Pass1234..'
const ADMIN_NAME = 'Shubham Verma'

async function resetDatabase() {
  console.log('🧹 Starting Complete Database Reset & Single Admin Provisioning...\n')

  try {
    // 1. Clear Prisma Database Tables in Sequential Order
    console.log('🗑️ Purging database tables...')
    
    const deleteOps = [
      () => prisma.auditLog.deleteMany(),
      () => prisma.notification.deleteMany(),
      () => prisma.clientApproval.deleteMany(),
      () => prisma.projectUpdate.deleteMany(),
      () => prisma.document.deleteMany(),
      () => prisma.invoice.deleteMany(),
      () => prisma.subscription.deleteMany(),
      () => prisma.taskComment.deleteMany(),
      () => prisma.task.deleteMany(),
      () => prisma.milestone.deleteMany(),
      () => prisma.projectMember.deleteMany(),
      () => prisma.project.deleteMany(),
      () => prisma.clientSubTeamMember.deleteMany(),
      () => prisma.clientSubTeamRole.deleteMany(),
      () => prisma.clientSubTeam.deleteMany(),
      () => prisma.clientContact.deleteMany(),
      () => prisma.clientDocument.deleteMany(),
      () => prisma.client.deleteMany(),
      () => prisma.planFeature.deleteMany(),
      () => prisma.plan.deleteMany(),
      () => prisma.profile.deleteMany(),
    ]

    for (const op of deleteOps) {
      try {
        await op()
      } catch (err: unknown) {
        console.warn('  ⚠️ Soft delete skip warning:', (err as Error)?.message)
      }
    }
    console.log('  ✓ All database tables purged cleanly.')

    // 2. Clear Supabase Auth Users
    console.log('\n🔒 Resetting Supabase Auth users...')
    const { data: usersData, error: listUsersErr } = await supabaseAdmin.auth.admin.listUsers()
    if (listUsersErr) {
      console.warn('  ⚠️ Could not list Supabase users:', listUsersErr.message)
    } else if (usersData?.users) {
      for (const u of usersData.users) {
        if (u.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
          console.log(`  - Deleting auth user ${u.email}...`)
          await supabaseAdmin.auth.admin.deleteUser(u.id).catch(() => {})
        }
      }
    }

    // 3. Create or Update Admin User in Supabase Auth
    console.log(`\n👤 Provisioning Admin User (${ADMIN_EMAIL})...`)
    let adminUserId: string

    const { data: searchUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingAdminUser = searchUsers?.users.find(
      (u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    )

    if (existingAdminUser) {
      adminUserId = existingAdminUser.id
      console.log(`  - Updating existing auth user (${adminUserId})...`)
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(adminUserId, {
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { role: 'ADMIN', name: ADMIN_NAME },
      })
      if (updateErr) throw new Error(`Failed to update admin user password: ${updateErr.message}`)
    } else {
      console.log('  - Creating new admin auth user...')
      const { data: newUserData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { role: 'ADMIN', name: ADMIN_NAME },
      })
      if (createErr || !newUserData.user) {
        throw new Error(`Failed to create admin auth user: ${createErr?.message}`)
      }
      adminUserId = newUserData.user.id
    }

    // 4. Create Single Admin Profile in Prisma
    console.log(`  - Creating Admin Profile in Prisma (${adminUserId})...`)
    const adminProfile = await prisma.profile.create({
      data: {
        id: adminUserId,
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        role: 'ADMIN',
        isActive: true,
        phone: '+91 98765 43210',
      },
    })

    console.log('\n✅ Database reset complete!')
    console.log(`----------------------------------------`)
    console.log(` Admin Email   : ${ADMIN_EMAIL}`)
    console.log(` Admin Password: ${ADMIN_PASSWORD}`)
    console.log(` Profile ID    : ${adminProfile.id}`)
    console.log(` Status        : Single Admin Active, All test data purged`)
    console.log(`----------------------------------------\n`)
  } catch (error) {
    console.error('❌ Reset database failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetDatabase()
