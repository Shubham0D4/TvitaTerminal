/**
 * scripts/rich-seed.ts
 * Seeds rich demo data using actual Supabase Auth user IDs and valid UUID formats.
 * Run with: npx tsx --env-file=.env scripts/rich-seed.ts
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Real IDs from Supabase Auth
const IDS = {
  ADMIN:   '32270386-4e3f-4380-a7d2-26299cf4acff',
  LEAD_1:  '083ffe80-0705-4164-bf15-662ca48f14d9',
  DEV_1:   'a0d7d287-8add-415b-ad4f-9057defa3643',
  TESTER_1:'d774aa0e-e0c4-486b-beee-c00daf44dc0b',
  CLIENT_1:'c639a411-331d-4384-868c-859a7bae7fe4',
}

const DEFAULT_PASSWORD = 'Password123!'

// New profiles to create in Supabase Auth + DB
const NEW_USERS = [
  { email: 'lead2@tvita.dev',   name: 'Priya Mehta',       role: 'TEAM_MEMBER', teamRole: 'TEAM_LEAD',  key: 'LEAD_2' },
  { email: 'lead3@tvita.dev',   name: 'Vikram Singh',      role: 'TEAM_MEMBER', teamRole: 'TEAM_LEAD',  key: 'LEAD_3' },
  { email: 'dev2@tvita.dev',    name: 'Sneha Reddy',       role: 'TEAM_MEMBER', teamRole: 'DEVELOPER',  key: 'DEV_2' },
  { email: 'dev3@tvita.dev',    name: 'Arjun Nair',        role: 'TEAM_MEMBER', teamRole: 'DEVELOPER',  key: 'DEV_3' },
  { email: 'dev4@tvita.dev',    name: 'Pooja Verma',       role: 'TEAM_MEMBER', teamRole: 'DEVELOPER',  key: 'DEV_4' },
  { email: 'tester2@tvita.dev', name: 'Ravi Kumar',        role: 'TEAM_MEMBER', teamRole: 'TESTER',     key: 'TESTER_2' },
  { email: 'client2@tvita.dev', name: 'Anita Patel',       role: 'CLIENT',      teamRole: null,         key: 'CLIENT_2' },
  { email: 'client3@tvita.dev', name: 'Vikram Kapoor',     role: 'CLIENT',      teamRole: null,         key: 'CLIENT_3' },
  { email: 'client4@tvita.dev', name: 'Deepa Sharma',      role: 'CLIENT',      teamRole: null,         key: 'CLIENT_4' },
]

async function main() {
  console.log('🌱 Starting Rich Seed...\n')

  // --- Step 1: Provision Auth users ---
  console.log('🔑 Provisioning additional Auth users...')
  const { data: existingList } = await supabaseAdmin.auth.admin.listUsers()
  const newIds: Record<string, string> = {}

  for (const u of NEW_USERS) {
    const existing = existingList?.users.find(e => e.email === u.email)
    if (existing) {
      newIds[u.key] = existing.id
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password: DEFAULT_PASSWORD,
        user_metadata: { role: u.role, teamRole: u.teamRole, name: u.name },
        email_confirm: true,
      })
      console.log(`  ↻ Updated: ${u.email} (${u.key})`)
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { role: u.role, teamRole: u.teamRole, name: u.name },
      })
      if (error) { console.error(`  ✗ Failed ${u.email}:`, error.message); continue }
      newIds[u.key] = created.user.id
      console.log(`  ✓ Created: ${u.email} (${u.key})`)
    }
  }

  // --- Step 2: Sync profiles into public.profiles ---
  console.log('\n👥 Syncing profiles...')
  await prisma.profile.update({ where: { id: IDS.ADMIN }, data: { name: 'Shubham Verma', teamRole: null } })
  await prisma.profile.update({ where: { id: IDS.LEAD_1 }, data: { name: 'Rahul Sharma', teamRole: 'TEAM_LEAD', phone: '+91 98001 11111' } })
  await prisma.profile.update({ where: { id: IDS.DEV_1 }, data: { name: 'Amit Patel', teamRole: 'DEVELOPER', phone: '+91 98001 22222' } })
  await prisma.profile.update({ where: { id: IDS.TESTER_1 }, data: { name: 'Neha Gupta', teamRole: 'TESTER', phone: '+91 98001 33333' } })
  await prisma.profile.update({ where: { id: IDS.CLIENT_1 }, data: { name: 'Rajesh Kumar', teamRole: null } })

  for (const u of NEW_USERS) {
    const uid = newIds[u.key]
    if (!uid) continue
    await prisma.profile.upsert({
      where: { email: u.email },
      update: { id: uid, name: u.name, role: u.role as any, teamRole: u.teamRole as any, isActive: true },
      create: { id: uid, email: u.email, name: u.name, role: u.role as any, teamRole: u.teamRole as any, isActive: true },
    })
  }
  console.log('  ✓ Profiles synced\n')

  const LEAD_2 = newIds['LEAD_2']
  const LEAD_3 = newIds['LEAD_3']
  const DEV_2 = newIds['DEV_2']
  const DEV_3 = newIds['DEV_3']
  const DEV_4 = newIds['DEV_4']
  const TESTER_2 = newIds['TESTER_2']
  const CLIENT_2 = newIds['CLIENT_2']
  const CLIENT_3 = newIds['CLIENT_3']
  const CLIENT_4 = newIds['CLIENT_4']

  // --- Step 3: Plans ---
  console.log('📋 Creating plans...')
  const starterPlan = await prisma.plan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Starter',
      description: 'Perfect for small clients with 2-3 ongoing projects.',
      price: 4999,
      currency: 'INR',
      billingCycle: 'MONTHLY',
      isActive: true,
      features: { create: [{ name: '3 Active Projects', value: '3' }, { name: '5GB Storage', value: '5GB' }] },
    },
  })
  const growthPlan = await prisma.plan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Growth',
      description: 'For growing businesses with larger project portfolios.',
      price: 14999,
      currency: 'INR',
      billingCycle: 'MONTHLY',
      isActive: true,
      features: { create: [{ name: '10 Active Projects', value: '10' }, { name: '25GB Storage', value: '25GB' }] },
    },
  })
  const agencyPlan = await prisma.plan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Agency',
      description: 'Full-featured plan for large organisations and enterprises.',
      price: 39999,
      currency: 'INR',
      billingCycle: 'MONTHLY',
      isActive: true,
      features: { create: [{ name: 'Unlimited Projects', value: 'unlimited' }, { name: '100GB Storage', value: '100GB' }] },
    },
  })
  console.log('  ✓ Plans created\n')

  // --- Step 4: Clients ---
  console.log('🏢 Creating clients...')
  const clTechvision = await prisma.client.upsert({
    where: { profileId: IDS.CLIENT_1 },
    update: {},
    create: {
      name: 'TechVision Solutions',
      email: 'contact@techvision.in',
      phone: '+91 22 4000 1234',
      contactPerson: 'Rajesh Kumar',
      gstin: '27AAACT2727Q1Z5',
      address: '302, Andheri East, Mumbai, Maharashtra - 400069',
      status: 'ACTIVE',
      profileId: IDS.CLIENT_1,
      createdById: IDS.ADMIN,
    },
  })
  const clGreenleaf = CLIENT_2 ? await prisma.client.upsert({
    where: { profileId: CLIENT_2 },
    update: {},
    create: {
      name: 'Greenleaf Organics',
      email: 'info@greenleaf.co',
      phone: '+91 80 6700 8900',
      contactPerson: 'Anita Patel',
      gstin: '29AABCG5432N1Z8',
      address: 'HSR Layout, Bengaluru, Karnataka - 560102',
      status: 'ACTIVE',
      profileId: CLIENT_2,
      createdById: IDS.ADMIN,
    },
  }) : clTechvision
  const clAerocraft = CLIENT_3 ? await prisma.client.upsert({
    where: { profileId: CLIENT_3 },
    update: {},
    create: {
      name: 'Aerocraft Studios',
      email: 'projects@aerocraft.io',
      phone: '+91 11 2600 5500',
      contactPerson: 'Vikram Kapoor',
      address: 'Connaught Place, New Delhi - 110001',
      status: 'ACTIVE',
      profileId: CLIENT_3,
      createdById: IDS.ADMIN,
    },
  }) : clTechvision
  const clZenitech = CLIENT_4 ? await prisma.client.upsert({
    where: { profileId: CLIENT_4 },
    update: {},
    create: {
      name: 'Zenitech Retail',
      email: 'admin@zenitech.in',
      phone: '+91 44 2900 3344',
      contactPerson: 'Deepa Sharma',
      gstin: '33AABCZ9876Y1Z4',
      address: '14, Anna Salai, Chennai, Tamil Nadu - 600002',
      status: 'ACTIVE',
      profileId: CLIENT_4,
      createdById: IDS.ADMIN,
    },
  }) : clTechvision
  console.log('  ✓ 4 clients created\n')

  // --- Step 5: Subscriptions ---
  console.log('📦 Creating subscriptions...')
  await prisma.subscription.upsert({
    where: { id: '10000000-0000-0000-0000-000000000001' },
    update: {},
    create: { id: '10000000-0000-0000-0000-000000000001', clientId: clTechvision.id, planId: agencyPlan.id, status: 'ACTIVE', startDate: new Date('2025-01-01'), renewalDate: new Date('2026-12-31'), createdById: IDS.ADMIN },
  })
  await prisma.subscription.upsert({
    where: { id: '10000000-0000-0000-0000-000000000002' },
    update: {},
    create: { id: '10000000-0000-0000-0000-000000000002', clientId: clGreenleaf.id, planId: growthPlan.id, status: 'ACTIVE', startDate: new Date('2025-06-01'), renewalDate: new Date('2026-06-01'), createdById: IDS.ADMIN },
  })
  await prisma.subscription.upsert({
    where: { id: '10000000-0000-0000-0000-000000000003' },
    update: {},
    create: { id: '10000000-0000-0000-0000-000000000003', clientId: clAerocraft.id, planId: starterPlan.id, status: 'ACTIVE', startDate: new Date('2026-02-01'), renewalDate: new Date('2027-02-01'), createdById: IDS.ADMIN },
  })
  await prisma.subscription.upsert({
    where: { id: '10000000-0000-0000-0000-000000000004' },
    update: {},
    create: { id: '10000000-0000-0000-0000-000000000004', clientId: clZenitech.id, planId: growthPlan.id, status: 'ACTIVE', startDate: new Date('2026-04-01'), renewalDate: new Date('2027-04-01'), createdById: IDS.ADMIN },
  })
  console.log('  ✓ Subscriptions created\n')

  // --- Step 6: Projects ---
  console.log('🗂  Creating projects...')
  const projects = await Promise.all([
    prisma.project.upsert({
      where: { id: '20000000-0000-0000-0000-000000000001' },
      update: { progress: 65 },
      create: { id: '20000000-0000-0000-0000-000000000001', name: 'TechVision Website Redesign', description: 'Full redesign and development of corporate website.', clientId: clTechvision.id, leadId: IDS.LEAD_1, status: 'IN_PROGRESS', progress: 65, startDate: new Date('2026-06-01'), endDate: new Date('2026-09-30'), createdById: IDS.ADMIN },
    }),
    prisma.project.upsert({
      where: { id: '20000000-0000-0000-0000-000000000002' },
      update: {},
      create: { id: '20000000-0000-0000-0000-000000000002', name: 'CRM System Development', description: 'Custom CRM to manage sales pipeline & client lifecycle.', clientId: clTechvision.id, leadId: LEAD_2 || IDS.LEAD_1, status: 'PLANNED', progress: 5, startDate: new Date('2026-10-01'), endDate: new Date('2027-03-31'), createdById: IDS.ADMIN },
    }),
    prisma.project.upsert({
      where: { id: '20000000-0000-0000-0000-000000000003' },
      update: { progress: 40 },
      create: { id: '20000000-0000-0000-0000-000000000003', name: 'E-commerce Platform', description: 'Shopify store for organic product range.', clientId: clGreenleaf.id, leadId: IDS.LEAD_1, status: 'IN_PROGRESS', progress: 40, startDate: new Date('2026-07-15'), endDate: new Date('2026-10-15'), createdById: IDS.ADMIN },
    }),
    prisma.project.upsert({
      where: { id: '20000000-0000-0000-0000-000000000004' },
      update: {},
      create: { id: '20000000-0000-0000-0000-000000000004', name: 'Social Media Marketing Campaign', description: 'Multi-channel social media content strategy.', clientId: clGreenleaf.id, leadId: LEAD_3 || IDS.LEAD_1, status: 'IN_PROGRESS', progress: 20, startDate: new Date('2026-08-01'), endDate: new Date('2026-11-30'), createdById: IDS.ADMIN },
    }),
    prisma.project.upsert({
      where: { id: '20000000-0000-0000-0000-000000000005' },
      update: {},
      create: { id: '20000000-0000-0000-0000-000000000005', name: 'Brand Identity & Guidelines', description: 'Full brand identity package: logo, palette, typography.', clientId: clAerocraft.id, leadId: LEAD_2 || IDS.LEAD_1, status: 'COMPLETED', progress: 100, startDate: new Date('2026-04-01'), endDate: new Date('2026-06-30'), createdById: IDS.ADMIN },
    }),
    prisma.project.upsert({
      where: { id: '20000000-0000-0000-0000-000000000006' },
      update: {},
      create: { id: '20000000-0000-0000-0000-000000000006', name: 'VFX Demo Reel Website', description: 'Showcase portfolio website with video embeds.', clientId: clAerocraft.id, leadId: LEAD_3 || IDS.LEAD_1, status: 'IN_PROGRESS', progress: 30, startDate: new Date('2026-08-01'), endDate: new Date('2026-10-31'), createdById: IDS.ADMIN },
    }),
    prisma.project.upsert({
      where: { id: '20000000-0000-0000-0000-000000000007' },
      update: {},
      create: { id: '20000000-0000-0000-0000-000000000007', name: 'Inventory Management System', description: 'Real-time inventory tracking across 15 outlets.', clientId: clZenitech.id, leadId: IDS.LEAD_1, status: 'IN_PROGRESS', progress: 55, startDate: new Date('2026-05-15'), endDate: new Date('2026-12-15'), createdById: IDS.ADMIN },
    }),
    prisma.project.upsert({
      where: { id: '20000000-0000-0000-0000-000000000008' },
      update: {},
      create: { id: '20000000-0000-0000-0000-000000000008', name: 'Mobile POS App', description: 'POS application integrating with inventory.', clientId: clZenitech.id, leadId: LEAD_2 || IDS.LEAD_1, status: 'PLANNED', progress: 0, startDate: new Date('2026-11-01'), endDate: new Date('2027-04-30'), createdById: IDS.ADMIN },
    }),
  ])
  console.log(`  ✓ ${projects.length} projects created\n`)

  const [pTV1, pTV2, pGL1, pGL2, pAC1, pAC2, pZT1, pZT2] = projects

  // --- Project Members ---
  const memberships = [
    { pid: pTV1.id, uid: IDS.DEV_1,   role: 'DEVELOPER' },
    { pid: pTV1.id, uid: DEV_2,       role: 'DEVELOPER' },
    { pid: pTV1.id, uid: IDS.TESTER_1,role: 'TESTER' },
    { pid: pTV2.id, uid: DEV_3,       role: 'DEVELOPER' },
    { pid: pTV2.id, uid: TESTER_2,    role: 'TESTER' },
    { pid: pGL1.id, uid: IDS.DEV_1,   role: 'DEVELOPER' },
    { pid: pGL1.id, uid: DEV_4,       role: 'DEVELOPER' },
    { pid: pGL1.id, uid: IDS.TESTER_1,role: 'TESTER' },
    { pid: pGL2.id, uid: DEV_2,       role: 'DEVELOPER' },
    { pid: pGL2.id, uid: TESTER_2,    role: 'TESTER' },
    { pid: pAC2.id, uid: DEV_3,       role: 'DEVELOPER' },
    { pid: pAC2.id, uid: IDS.TESTER_1,role: 'TESTER' },
    { pid: pZT1.id, uid: IDS.DEV_1,   role: 'DEVELOPER' },
    { pid: pZT1.id, uid: DEV_4,       role: 'DEVELOPER' },
    { pid: pZT1.id, uid: TESTER_2,    role: 'TESTER' },
    { pid: pZT2.id, uid: DEV_2,       role: 'DEVELOPER' },
    { pid: pZT2.id, uid: DEV_4,       role: 'DEVELOPER' },
    { pid: pZT2.id, uid: IDS.TESTER_1,role: 'TESTER' },
  ]

  for (const m of memberships) {
    if (!m.uid) continue
    await prisma.projectMember.upsert({
      where: { projectId_profileId: { projectId: m.pid, profileId: m.uid } },
      update: {},
      create: { projectId: m.pid, profileId: m.uid, role: m.role },
    })
  }
  console.log('  ✓ Project members assigned\n')

  // --- Step 7: Milestones ---
  console.log('🏁 Creating milestones...')
  const milestones = [
    { id: '30000000-0000-0000-0000-000000000001', projectId: pTV1.id, name: 'Discovery & UX Research', status: 'COMPLETED', progress: 100, clientVisible: true, sortOrder: 1, dueDate: new Date('2026-06-30') },
    { id: '30000000-0000-0000-0000-000000000002', projectId: pTV1.id, name: 'UI Design & Prototype', status: 'APPROVED', progress: 100, clientVisible: true, sortOrder: 2, dueDate: new Date('2026-07-31') },
    { id: '30000000-0000-0000-0000-000000000003', projectId: pTV1.id, name: 'Frontend Development', status: 'IN_PROGRESS', progress: 60, clientVisible: true, sortOrder: 3, dueDate: new Date('2026-08-31') },
    { id: '30000000-0000-0000-0000-000000000004', projectId: pTV1.id, name: 'Backend APIs & Integration', status: 'PLANNED', progress: 0, clientVisible: true, sortOrder: 4, dueDate: new Date('2026-09-15') },
    { id: '30000000-0000-0000-0000-000000000005', projectId: pGL1.id, name: 'Store Setup & Theme', status: 'COMPLETED', progress: 100, clientVisible: true, sortOrder: 1, dueDate: new Date('2026-07-31') },
    { id: '30000000-0000-0000-0000-000000000006', projectId: pGL1.id, name: 'Product Catalog Import', status: 'IN_PROGRESS', progress: 50, clientVisible: true, sortOrder: 2, dueDate: new Date('2026-08-31') },
    { id: '30000000-0000-0000-0000-000000000007', projectId: pZT1.id, name: 'Requirements & Architecture', status: 'APPROVED', progress: 100, clientVisible: true, sortOrder: 1, dueDate: new Date('2026-06-30') },
    { id: '30000000-0000-0000-0000-000000000008', projectId: pZT1.id, name: 'Core Inventory Module', status: 'IN_PROGRESS', progress: 70, clientVisible: true, sortOrder: 2, dueDate: new Date('2026-09-30') },
    { id: '30000000-0000-0000-0000-000000000009', projectId: pZT1.id, name: 'Analytics Dashboard', status: 'PLANNED', progress: 0, clientVisible: true, sortOrder: 3, dueDate: new Date('2026-11-30') },
  ]

  for (const ms of milestones) {
    await prisma.milestone.upsert({
      where: { id: ms.id },
      update: {},
      create: { id: ms.id, projectId: ms.projectId, name: ms.name, status: ms.status as any, progress: ms.progress, clientVisible: ms.clientVisible, sortOrder: ms.sortOrder, dueDate: ms.dueDate },
    })
  }
  console.log('  ✓ Milestones created\n')

  // --- Step 8: Tasks ---
  console.log('✅ Creating tasks...')
  const tasks = [
    { id: '40000000-0000-0000-0000-000000000001', title: 'Homepage hero section', desc: 'Implement full-bleed hero with animated gradient', projectId: pTV1.id, milestoneId: '30000000-0000-0000-0000-000000000003', status: 'COMPLETED', priority: 'HIGH', developerId: IDS.DEV_1, testerId: IDS.TESTER_1, dueDate: new Date('2026-08-10'), clientVisible: false },
    { id: '40000000-0000-0000-0000-000000000002', title: 'Services section with cards', desc: 'Responsive service cards with icons', projectId: pTV1.id, milestoneId: '30000000-0000-0000-0000-000000000003', status: 'READY_FOR_TESTING', priority: 'HIGH', developerId: IDS.DEV_1, testerId: IDS.TESTER_1, dueDate: new Date('2026-08-17'), clientVisible: false },
    { id: '40000000-0000-0000-0000-000000000003', title: 'Contact form validation', desc: 'Multi-step contact form with reCAPTCHA', projectId: pTV1.id, milestoneId: '30000000-0000-0000-0000-000000000003', status: 'IN_PROGRESS', priority: 'MEDIUM', developerId: DEV_2 || IDS.DEV_1, testerId: IDS.TESTER_1, dueDate: new Date('2026-08-22'), clientVisible: false },
    { id: '40000000-0000-0000-0000-000000000004', title: 'SEO meta tags & sitemap', desc: 'Add structured data, OG tags, sitemap.xml', projectId: pTV1.id, milestoneId: '30000000-0000-0000-0000-000000000004', status: 'TODO', priority: 'MEDIUM', developerId: DEV_2 || IDS.DEV_1, testerId: IDS.TESTER_1, dueDate: new Date('2026-09-05'), clientVisible: false },
    { id: '40000000-0000-0000-0000-000000000005', title: 'Cross-browser QA audit', desc: 'Test Chrome, Safari, Firefox mobile & desktop', projectId: pTV1.id, milestoneId: '30000000-0000-0000-0000-000000000003', status: 'IN_TESTING', priority: 'HIGH', developerId: IDS.DEV_1, testerId: IDS.TESTER_1, dueDate: new Date('2026-08-20'), clientVisible: false },
    { id: '40000000-0000-0000-0000-000000000006', title: 'Accessibility compliance', desc: 'Ensure WCAG 2.1 AA compliance', projectId: pTV1.id, milestoneId: '30000000-0000-0000-0000-000000000003', status: 'CHANGES_REQUIRED', priority: 'MEDIUM', developerId: DEV_2 || IDS.DEV_1, testerId: IDS.TESTER_1, dueDate: new Date('2026-08-25'), clientVisible: false },
    { id: '40000000-0000-0000-0000-000000000007', title: 'Import 250+ catalog items', desc: 'Bulk import products with images & variants', projectId: pGL1.id, milestoneId: '30000000-0000-0000-0000-000000000006', status: 'IN_PROGRESS', priority: 'URGENT', developerId: DEV_4 || IDS.DEV_1, testerId: IDS.TESTER_1, dueDate: new Date('2026-08-25'), clientVisible: false },
    { id: '40000000-0000-0000-0000-000000000008', title: 'Multi-outlet inventory sync', desc: 'Real-time stock sync across 15 outlets', projectId: pZT1.id, milestoneId: '30000000-0000-0000-0000-000000000008', status: 'IN_PROGRESS', priority: 'URGENT', developerId: IDS.DEV_1, testerId: TESTER_2 || IDS.TESTER_1, dueDate: new Date('2026-09-01'), clientVisible: false },
    { id: '40000000-0000-0000-0000-000000000009', title: 'Low stock notification module', desc: 'Email/SMS alerts when stock falls below threshold', projectId: pZT1.id, milestoneId: '30000000-0000-0000-0000-000000000008', status: 'READY_FOR_TESTING', priority: 'HIGH', developerId: DEV_4 || IDS.DEV_1, testerId: TESTER_2 || IDS.TESTER_1, dueDate: new Date('2026-09-10'), clientVisible: false },
  ]

  for (const t of tasks) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        title: t.title,
        description: t.desc,
        projectId: t.projectId,
        milestoneId: t.milestoneId || null,
        status: t.status as any,
        priority: t.priority as any,
        assigneeId: t.developerId || null,
        developerId: t.developerId || null,
        testerId: t.testerId || null,
        dueDate: t.dueDate || null,
        clientVisible: t.clientVisible ?? false,
        createdById: IDS.ADMIN,
      },
    })
  }
  console.log(`  ✓ ${tasks.length} tasks created\n`)

  // --- Step 9: Invoices ---
  console.log('🧾 Creating invoices...')
  const invoices = [
    { no: 'INV-2026-001', clientId: clTechvision.id, projectId: pTV1.id, subtotal: 75000, tax: 13500, total: 88500, status: 'PAID', issued: new Date('2026-06-01'), due: new Date('2026-06-15'), paid: new Date('2026-06-12'), notes: 'Phase 1: Discovery & UX Design', items: [{ description: 'UX Research', qty: 1, rate: 30000, amount: 30000 }, { description: 'UI Design (10 screens)', qty: 10, rate: 4500, amount: 45000 }] },
    { no: 'INV-2026-002', clientId: clTechvision.id, projectId: pTV1.id, subtotal: 90000, tax: 16200, total: 106200, status: 'PENDING', issued: new Date('2026-08-01'), due: new Date('2026-08-15'), paid: null, notes: 'Phase 2: Frontend Development', items: [{ description: 'Frontend Dev (React)', qty: 1, rate: 65000, amount: 65000 }, { description: 'API Integration', qty: 1, rate: 25000, amount: 25000 }] },
    { no: 'INV-2026-003', clientId: clGreenleaf.id, projectId: pGL1.id, subtotal: 48000, tax: 8640, total: 56640, status: 'PAID', issued: new Date('2026-07-15'), due: new Date('2026-07-30'), paid: new Date('2026-07-28'), notes: 'E-commerce Setup Phase 1', items: [{ description: 'Shopify Setup', qty: 1, rate: 20000, amount: 20000 }, { description: 'Theme Customization', qty: 1, rate: 28000, amount: 28000 }] },
    { no: 'INV-2026-004', clientId: clZenitech.id, projectId: pZT1.id, subtotal: 120000, tax: 21600, total: 141600, status: 'PAID', issued: new Date('2026-05-20'), due: new Date('2026-06-05'), paid: new Date('2026-06-02'), notes: 'Inventory System - Phase 1 Advance', items: [{ description: 'System Architecture & Setup', qty: 1, rate: 50000, amount: 50000 }, { description: 'Core Module Development', qty: 1, rate: 70000, amount: 70000 }] },
  ]

  for (const inv of invoices) {
    await prisma.invoice.upsert({
      where: { invoiceNo: inv.no },
      update: {},
      create: {
        invoiceNo: inv.no,
        clientId: inv.clientId,
        projectId: inv.projectId || null,
        subtotal: inv.subtotal,
        taxAmount: inv.tax,
        taxRate: 18,
        amount: inv.total,
        currency: 'INR',
        status: inv.status as any,
        issuedDate: inv.issued,
        dueDate: inv.due,
        paidDate: inv.paid || null,
        notes: inv.notes,
        lineItems: inv.items as any,
        createdById: IDS.ADMIN,
      },
    })
  }
  console.log('  ✓ 4 invoices created\n')

  // --- Step 10: Documents ---
  console.log('📄 Creating documents...')
  const docs = [
    { id: '50000000-0000-0000-0000-000000000001', name: 'TechVision Project Proposal.pdf', fileUrl: 'https://placeholder-storage.tvita.dev/techvision-proposal.pdf', fileType: 'application/pdf', fileSize: 248000, clientId: clTechvision.id, projectId: pTV1.id, uploadedById: IDS.LEAD_1, visibility: 'CLIENT_VISIBLE' },
    { id: '50000000-0000-0000-0000-000000000002', name: 'UI Mockup v3 - Homepage.fig', fileUrl: 'https://placeholder-storage.tvita.dev/homepage-v3.fig', fileType: 'application/octet-stream', fileSize: 1240000, clientId: clTechvision.id, projectId: pTV1.id, uploadedById: IDS.LEAD_1, visibility: 'CLIENT_VISIBLE' },
    { id: '50000000-0000-0000-0000-000000000003', name: 'Technical Architecture Diagram.md', fileUrl: 'https://placeholder-storage.tvita.dev/arch-diagram.md', fileType: 'text/markdown', fileSize: 12000, clientId: clTechvision.id, projectId: pTV1.id, uploadedById: IDS.LEAD_1, visibility: 'INTERNAL' },
    { id: '50000000-0000-0000-0000-000000000004', name: 'Greenleaf NDA.pdf', fileUrl: 'https://placeholder-storage.tvita.dev/greenleaf-nda.pdf', fileType: 'application/pdf', fileSize: 150000, clientId: clGreenleaf.id, projectId: null, uploadedById: IDS.ADMIN, visibility: 'CLIENT_VISIBLE' },
    { id: '50000000-0000-0000-0000-000000000005', name: 'E-commerce Product Import Template.xlsx', fileUrl: 'https://placeholder-storage.tvita.dev/product-template.xlsx', fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fileSize: 520000, clientId: clGreenleaf.id, projectId: pGL1.id, uploadedById: IDS.LEAD_1, visibility: 'CLIENT_VISIBLE' },
    { id: '50000000-0000-0000-0000-000000000006', name: 'Aerocraft Brand Guidelines v2.pdf', fileUrl: 'https://placeholder-storage.tvita.dev/aerocraft-brand.pdf', fileType: 'application/pdf', fileSize: 4200000, clientId: clAerocraft.id, projectId: pAC1.id, uploadedById: IDS.LEAD_1, visibility: 'CLIENT_VISIBLE' },
    { id: '50000000-0000-0000-0000-000000000007', name: 'Zenitech System Requirements.docx', fileUrl: 'https://placeholder-storage.tvita.dev/zenitech-specs.docx', fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileSize: 380000, clientId: clZenitech.id, projectId: pZT1.id, uploadedById: IDS.LEAD_1, visibility: 'CLIENT_VISIBLE' },
    { id: '50000000-0000-0000-0000-000000000008', name: 'DB Schema & ERD (Internal).pdf', fileUrl: 'https://placeholder-storage.tvita.dev/internal-erd.pdf', fileType: 'application/pdf', fileSize: 890000, clientId: clZenitech.id, projectId: pZT1.id, uploadedById: IDS.LEAD_1, visibility: 'INTERNAL' },
  ]

  for (const d of docs) {
    await prisma.document.upsert({
      where: { id: d.id },
      update: {},
      create: d as any,
    })
  }
  console.log('  ✓ 8 documents created\n')

  // --- Step 11: Project Updates ---
  console.log('📢 Creating project updates...')
  const updates = [
    { id: '60000000-0000-0000-0000-000000000001', projectId: pTV1.id, title: 'UI Design Phase Approved', content: 'All 12 screens in the UI design phase have been reviewed and approved by the client.', authorId: IDS.LEAD_1, clientVisible: true },
    { id: '60000000-0000-0000-0000-000000000002', projectId: pTV1.id, title: 'Week 8 Progress Update', content: 'Frontend development is progressing well. Homepage and services sections are complete.', authorId: IDS.LEAD_1, clientVisible: true },
    { id: '60000000-0000-0000-0000-000000000003', projectId: pGL1.id, title: 'Store Setup Complete', content: 'Shopify store is live in staging. Theme customization has been finalized.', authorId: IDS.LEAD_1, clientVisible: true },
    { id: '60000000-0000-0000-0000-000000000004', projectId: pZT1.id, title: 'Architecture Review Completed', content: 'The system architecture has been approved. Database schema is finalized.', authorId: IDS.LEAD_1, clientVisible: true },
  ]

  for (const u of updates) {
    await prisma.projectUpdate.upsert({
      where: { id: u.id },
      update: {},
      create: u,
    })
  }
  console.log('  ✓ Project updates created\n')

  console.log('\n✅ Rich Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('\n❌ Rich Seed failed:', e)
    process.exit(1)
  })
  .finally(() => pool.end())
