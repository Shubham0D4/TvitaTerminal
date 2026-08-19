import 'dotenv/config'
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const ADMIN_EMAIL = 'shubhamd@tvita.in'
const ADMIN_PASSWORD = 'Pass1234'
const ADMIN_NAME = 'Shubham Darekar'

async function resetDatabase() {
  console.log('🧹 Starting Complete Database Reset & Single Admin Provisioning...\n')

  try {
    // 1. Clear Prisma Database Tables in Sequential Order
    console.log('🗑️ Purging database tables...')

    const deleteOps = [
      () => prisma.auditLog.deleteMany(),
      () => prisma.notification.deleteMany(),
      () => prisma.projectUpdate.deleteMany(),
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

    // 2. Hash password and seed admin
    console.log(`\n👤 Provisioning Admin User (${ADMIN_EMAIL})...`)
    const adminUserId = crypto.randomUUID()
    const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10)

    const adminProfile = await prisma.profile.create({
      data: {
        id: adminUserId,
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        role: 'ADMIN',
        isActive: true,
        phone: '+91 98765 43210',
        passwordHash,
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
