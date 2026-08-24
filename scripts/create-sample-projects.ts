/**
 * scripts/create-sample-projects.ts
 * Seeds demo projects, milestones and a recent update for the test client.
 *
 * Run with:
 *   npm run projects:sample
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const CLIENT_EMAIL = 'client@tvita.in'

/** Milestones are ordered; the first non-completed one is the current phase. */
const SAMPLE_PROJECTS = [
  {
    name: 'Elita EV',
    description: 'Storefront and configurator for the Elita electric range.',
    status: 'IN_PROGRESS' as const,
    progress: 64,
    milestones: [
      { name: 'Discovery & Scoping', status: 'COMPLETED' as const, progress: 100 },
      { name: 'Design System', status: 'COMPLETED' as const, progress: 100 },
      { name: 'Crafting the Backend', status: 'IN_PROGRESS' as const, progress: 55 },
      { name: 'QA & Launch', status: 'PLANNED' as const, progress: 0 },
    ],
  },
  {
    name: 'Northwind Commerce',
    description: 'Headless commerce replatform with a new checkout flow.',
    status: 'IN_PROGRESS' as const,
    progress: 38,
    milestones: [
      { name: 'Data Migration Plan', status: 'COMPLETED' as const, progress: 100 },
      { name: 'Checkout Rebuild', status: 'IN_PROGRESS' as const, progress: 40 },
      { name: 'Payment Integration', status: 'PLANNED' as const, progress: 0 },
    ],
  },
  {
    name: 'Loyalty App',
    description: 'Cross-platform rewards app for in-store and online purchases.',
    status: 'CLIENT_REVIEW' as const,
    progress: 82,
    milestones: [
      { name: 'Prototype', status: 'COMPLETED' as const, progress: 100 },
      { name: 'Beta Feedback Round', status: 'IN_PROGRESS' as const, progress: 70 },
    ],
  },
  {
    name: 'Brand Refresh',
    description: 'Identity refresh across storefront, packaging and campaigns.',
    status: 'COMPLETED' as const,
    progress: 100,
    milestones: [{ name: 'Rollout Complete', status: 'COMPLETED' as const, progress: 100 }],
  },
]

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!connectionString) {
    console.error('❌ DIRECT_URL / DATABASE_URL is not set.')
    process.exit(1)
  }

  const pool = new pg.Pool({ connectionString })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  try {
    const profile = await prisma.profile.findUnique({
      where: { email: CLIENT_EMAIL },
      select: { id: true, name: true },
    })
    if (!profile) {
      console.error(`❌ No profile for ${CLIENT_EMAIL}. Run: npm run client:create`)
      process.exit(1)
    }

    const client = await prisma.client.findFirst({
      where: { profileId: profile.id },
      select: { id: true, name: true },
    })
    if (!client) {
      console.error('❌ No client linked to that profile. Run: npm run client:create')
      process.exit(1)
    }

    const admin = await prisma.profile.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true, name: true },
    })

    for (const sample of SAMPLE_PROJECTS) {
      const existing = await prisma.project.findFirst({
        where: { clientId: client.id, name: sample.name },
        select: { id: true },
      })

      const data = {
        clientId: client.id,
        name: sample.name,
        description: sample.description,
        status: sample.status,
        progress: sample.progress,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-10-31'),
        leadId: admin?.id ?? null,
        createdById: admin?.id ?? null,
      }

      const project = existing
        ? await prisma.project.update({ where: { id: existing.id }, data })
        : await prisma.project.create({ data })

      // Rebuild milestones so re-runs stay idempotent.
      await prisma.milestone.deleteMany({ where: { projectId: project.id } })
      await prisma.milestone.createMany({
        data: sample.milestones.map((milestone, index) => ({
          projectId: project.id,
          name: milestone.name,
          status: milestone.status,
          progress: milestone.progress,
          clientVisible: true,
          sortOrder: index,
          dueDate: new Date(2026, 6 + index, 15),
        })),
      })

      console.log(`  ✓ ${sample.name} — ${sample.status}, ${sample.progress}%`)
    }

    // A short client-visible note thread on the lead project.
    const elita = await prisma.project.findFirst({
      where: { clientId: client.id, name: 'Elita EV' },
      select: { id: true },
    })
    if (elita && admin) {
      await prisma.note.deleteMany({ where: { projectId: elita.id } })
      await prisma.note.createMany({
        data: [
          {
            projectId: elita.id,
            title: 'Charging analytics units',
            content:
              'Charging analytics should report kW to match the spec sheet — the current mock shows amps.',
            type: 'EXTERNAL_CLIENT',
            creatorId: admin.id,
          },
          {
            projectId: elita.id,
            title: 'Fleet-manager SSO',
            content:
              'Fleet-manager accounts must use the same SSO as the web dashboard — please keep login unified.',
            type: 'EXTERNAL_CLIENT',
            creatorId: admin.id,
          },
          {
            projectId: elita.id,
            title: 'Confirmed',
            content: 'Understood — we will align both before the next build.',
            type: 'EXTERNAL_CLIENT',
            creatorId: profile.id,
          },
        ],
      })
      console.log('  ✓ 3 client notes added to Elita EV')
    }

    // A short run of updates per project — these drive the Process rail on
    // the projects page, newest against the milestone underway.
    const UPDATES: Record<string, Array<{ title: string; content: string; daysAgo: number }>> = {
      'Elita EV': [
        {
          title: 'Charging telemetry live',
          content: 'Charging telemetry wired up to the live test fleet.',
          daysAgo: 1,
        },
        {
          title: 'Payment sandbox integrated',
          content: 'Payment sandbox integrated; invoices generating correctly.',
          daysAgo: 3,
        },
        {
          title: 'Schema migrated to staging',
          content: 'Database schema locked and migrated to staging.',
          daysAgo: 6,
        },
      ],
      'Northwind Commerce': [
        {
          title: 'Checkout skeleton deployed',
          content: 'New checkout flow deployed behind a flag for internal testing.',
          daysAgo: 2,
        },
        {
          title: 'Catalogue import verified',
          content: 'Catalogue import verified against the legacy store — counts match.',
          daysAgo: 5,
        },
      ],
      'Loyalty App': [
        {
          title: 'Beta build with testers',
          content: 'Beta build is with your testers; first feedback is coming in.',
          daysAgo: 1,
        },
        {
          title: 'Rewards engine tuned',
          content: 'Points accrual rules tuned to match the in-store scheme.',
          daysAgo: 4,
        },
      ],
    }

    let updateCount = 0
    for (const [projectName, entries] of Object.entries(UPDATES)) {
      const target = await prisma.project.findFirst({
        where: { clientId: client.id, name: projectName },
        select: { id: true },
      })
      if (!target) continue

      await prisma.projectUpdate.deleteMany({ where: { projectId: target.id } })
      for (const entry of entries) {
        await prisma.projectUpdate.create({
          data: {
            projectId: target.id,
            title: entry.title,
            content: entry.content,
            authorId: admin?.id ?? null,
            clientVisible: true,
            createdAt: new Date(Date.now() - entry.daysAgo * 24 * 60 * 60 * 1000),
          },
        })
        updateCount += 1
      }
    }
    console.log(`  ✓ ${updateCount} project updates posted`)

    console.log(`\n✅ Sample projects ready for ${client.name}\n`)
  } catch (error) {
    console.error('❌ Failed:', error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()
