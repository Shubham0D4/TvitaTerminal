import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const PLAN_STARTER_ID = '00000000-0000-0000-0000-000000000001'
const PLAN_GROWTH_ID  = '00000000-0000-0000-0000-000000000002'
const PLAN_AGENCY_ID  = '00000000-0000-0000-0000-000000000003'

async function main() {
  console.log('🌱 Seeding database plans...\n')

  // ─── Plans ────────────────────────────────────────────────────────────────
  console.log('📋 Creating default plans...')
  await Promise.all([
    prisma.plan.upsert({
      where: { id: PLAN_STARTER_ID },
      update: {},
      create: {
        id: PLAN_STARTER_ID,
        name: 'Starter',
        description: 'Perfect for small clients with basic needs.',
        price: 4999,
        currency: 'INR',
        billingCycle: 'MONTHLY',
        isActive: true,
        features: {
          create: [
            { name: '2 Active Projects', value: '2' },
            { name: '5GB File Storage', value: '5GB' },
            { name: 'Email Support', value: 'email' },
          ],
        },
      },
    }),
    prisma.plan.upsert({
      where: { id: PLAN_GROWTH_ID },
      update: {},
      create: {
        id: PLAN_GROWTH_ID,
        name: 'Growth',
        description: 'Ideal for growing businesses with more complex needs.',
        price: 14999,
        currency: 'INR',
        billingCycle: 'MONTHLY',
        isActive: true,
        features: {
          create: [
            { name: '10 Active Projects', value: '10' },
            { name: '5 Team Members', value: '5' },
            { name: '25GB File Storage', value: '25GB' },
            { name: 'Priority Support', value: 'priority' },
          ],
        },
      },
    }),
    prisma.plan.upsert({
      where: { id: PLAN_AGENCY_ID },
      update: {},
      create: {
        id: PLAN_AGENCY_ID,
        name: 'Agency',
        description: 'Full-featured plan for large organisations.',
        price: 39999,
        currency: 'INR',
        billingCycle: 'MONTHLY',
        isActive: true,
        features: {
          create: [
            { name: 'Unlimited Projects', value: 'unlimited' },
            { name: 'Unlimited Team Members', value: 'unlimited' },
            { name: '100GB File Storage', value: '100GB' },
            { name: 'Dedicated Account Manager', value: 'dedicated' },
          ],
        },
      },
    }),
  ])
  console.log('  ✓ Default plans created.\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
