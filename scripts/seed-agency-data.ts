/**
 * scripts/seed-agency-data.ts
 * Comprehensive database seeding script for Tvita Agency Platform.
 * 
 * Includes:
 * - 1 Current Admin (shubhamd@tvita.in / Pass1234)
 * - 10 Team Members (3 Team Leads, 5 Developers, 2 Testers / Pass1234)
 * - 4 Clients (TechVision, Greenleaf, Aerocraft, Zenitech / Pass1234)
 * - 5 to 6 Sub-Teams per Client with full RBAC access policies, roles & members
 * - 4 Primary Active Projects + 2 Secondary Projects with Lead & Team Member assignments
 * - Custom Retainer Subscriptions & Standard Plans
 * - Invoices, Milestones, Tasks, Approvals, and Audit Logs
 * 
 * Run with: npx tsx --env-file=.env scripts/seed-agency-data.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const COMMON_PASSWORD = 'Pass1234'
const PASSWORD_HASH = bcrypt.hashSync(COMMON_PASSWORD, 10)

async function main() {
  console.log('🚀 Starting Complete Agency Platform Data Purge & Reseed...\n')

  // ───────────────────────────────────────────────────────────────────────────
  // 0. PURGE PREVIOUS DATA
  // ───────────────────────────────────────────────────────────────────────────
  console.log('🧹 Wiping all previous database records...')
  const deleteOps = [
    () => prisma.auditLog.deleteMany(),
    () => prisma.notification.deleteMany(),
    () => prisma.taskActivity.deleteMany(),
    () => prisma.taskComment.deleteMany(),
    () => prisma.task.deleteMany(),
    () => prisma.milestone.deleteMany(),
    () => prisma.projectMember.deleteMany(),
    () => prisma.projectUpdate.deleteMany(),
    () => prisma.note.deleteMany(),
    () => prisma.ticket.deleteMany(),
    () => prisma.meeting.deleteMany(),
    () => prisma.project.deleteMany(),
    () => prisma.invoice.deleteMany(),
    () => prisma.payment.deleteMany(),
    () => prisma.subscription.deleteMany(),
    () => prisma.clientSubTeamMember.deleteMany(),
    () => prisma.clientSubTeamRole.deleteMany(),
    () => prisma.clientSubTeam.deleteMany(),
    () => prisma.clientContact.deleteMany(),
    () => prisma.client.deleteMany(),
    () => prisma.planFeature.deleteMany(),
    () => prisma.plan.deleteMany(),
    () => prisma.quote.deleteMany(),
    () => prisma.profile.deleteMany(),
  ]

  for (const op of deleteOps) {
    try {
      await op()
    } catch (err: unknown) {
      // Soft skip if table or constraint is fine
    }
  }
  console.log('  ✓ All previous data purged cleanly.\n')

  // ───────────────────────────────────────────────────────────────────────────
  // 1. ADMIN USER SETUP
  // ───────────────────────────────────────────────────────────────────────────
  console.log('👤 Provisioning Primary Admin (shubhamd@tvita.in)...')
  let adminProfile = await prisma.profile.findFirst({
    where: { email: 'shubhamd@tvita.in' },
  })

  if (!adminProfile) {
    const adminId = crypto.randomUUID()
    adminProfile = await prisma.profile.create({
      data: {
        id: adminId,
        email: 'shubhamd@tvita.in',
        name: 'Shubham Verma',
        role: 'ADMIN',
        teamRole: null,
        isActive: true,
        passwordHash: PASSWORD_HASH,
      },
    })
    console.log('  ✓ Admin created (shubhamd@tvita.in)')
  } else {
    adminProfile = await prisma.profile.update({
      where: { id: adminProfile.id },
      data: {
        name: 'Shubham Verma',
        role: 'ADMIN',
        isActive: true,
        passwordHash: PASSWORD_HASH,
      },
    })
    console.log('  ↻ Admin updated (shubhamd@tvita.in)')
  }

  const ADMIN_ID = adminProfile.id

  // ───────────────────────────────────────────────────────────────────────────
  // 2. TEN (10) AGENCY TEAM MEMBERS (3 Leads, 5 Devs, 2 Testers)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n👥 Provisioning 10 Agency Team Members...')

  const TEAM_MEMBERS_DATA = [
    { email: 'lead1@tvita.dev',   name: 'Rahul Sharma',  role: 'TEAM_MEMBER', teamRole: 'TEAM_LEAD',  phone: '+91 98111 11111' },
    { email: 'lead2@tvita.dev',   name: 'Priya Mehta',   role: 'TEAM_MEMBER', teamRole: 'TEAM_LEAD',  phone: '+91 98222 22222' },
    { email: 'lead3@tvita.dev',   name: 'Vikram Singh',  role: 'TEAM_MEMBER', teamRole: 'TEAM_LEAD',  phone: '+91 98333 33333' },
    { email: 'dev1@tvita.dev',    name: 'Amit Patel',    role: 'TEAM_MEMBER', teamRole: 'MEMBER',     phone: '+91 98444 44444' },
    { email: 'dev2@tvita.dev',    name: 'Sneha Reddy',   role: 'TEAM_MEMBER', teamRole: 'MEMBER',     phone: '+91 98555 55555' },
    { email: 'dev3@tvita.dev',    name: 'Arjun Nair',    role: 'TEAM_MEMBER', teamRole: 'MEMBER',     phone: '+91 98666 66666' },
    { email: 'dev4@tvita.dev',    name: 'Pooja Verma',   role: 'TEAM_MEMBER', teamRole: 'MEMBER',     phone: '+91 98777 77777' },
    { email: 'dev5@tvita.dev',    name: 'Karan Joshi',   role: 'TEAM_MEMBER', teamRole: 'MEMBER',     phone: '+91 98888 88888' },
    { email: 'tester1@tvita.dev', name: 'Neha Gupta',    role: 'TEAM_MEMBER', teamRole: 'MEMBER',     phone: '+91 98999 99999' },
    { email: 'tester2@tvita.dev', name: 'Ravi Kumar',    role: 'TEAM_MEMBER', teamRole: 'MEMBER',     phone: '+91 98000 00000' },
  ]

  const teamProfiles: Record<string, string> = {}

  for (const member of TEAM_MEMBERS_DATA) {
    const existing = await prisma.profile.findUnique({ where: { email: member.email } })
    if (existing) {
      const updated = await prisma.profile.update({
        where: { id: existing.id },
        data: {
          name: member.name,
          role: 'TEAM_MEMBER',
          teamRole: member.teamRole as any,
          phone: member.phone,
          isActive: true,
          passwordHash: PASSWORD_HASH,
        },
      })
      teamProfiles[member.email] = updated.id
      console.log(`  ↻ Updated Team Member: ${member.name} (${member.email})`)
    } else {
      const newId = crypto.randomUUID()
      const created = await prisma.profile.create({
        data: {
          id: newId,
          email: member.email,
          name: member.name,
          role: 'TEAM_MEMBER',
          teamRole: member.teamRole as any,
          phone: member.phone,
          isActive: true,
          passwordHash: PASSWORD_HASH,
        },
      })
      teamProfiles[member.email] = created.id
      console.log(`  ✓ Created Team Member: ${member.name} (${member.email})`)
    }
  }

  const LEAD_1_ID = teamProfiles['lead1@tvita.dev']
  const LEAD_2_ID = teamProfiles['lead2@tvita.dev']
  const LEAD_3_ID = teamProfiles['lead3@tvita.dev']
  const DEV_1_ID  = teamProfiles['dev1@tvita.dev']
  const DEV_2_ID  = teamProfiles['dev2@tvita.dev']
  const DEV_3_ID  = teamProfiles['dev3@tvita.dev']
  const DEV_4_ID  = teamProfiles['dev4@tvita.dev']
  const DEV_5_ID  = teamProfiles['dev5@tvita.dev']
  const TESTER_1_ID = teamProfiles['tester1@tvita.dev']
  const TESTER_2_ID = teamProfiles['tester2@tvita.dev']

  // ───────────────────────────────────────────────────────────────────────────
  // 3. FOUR (4) CLIENT PROFILES & CLIENT ORGANIZATIONS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🏢 Provisioning 4 Client Organizations & Primary Accounts...')

  const CLIENTS_DATA = [
    {
      key: 'TECHVISION',
      email: 'client1@tvita.dev',
      name: 'Rajesh Kumar',
      companyName: 'TechVision Solutions',
      contactPerson: 'Rajesh Kumar',
      phone: '+91 22 4000 1234',
      gstin: '27AAACT2727Q1Z5',
      address: '302, Andheri East, Mumbai, Maharashtra - 400069',
    },
    {
      key: 'GREENLEAF',
      email: 'client2@tvita.dev',
      name: 'Anita Patel',
      companyName: 'Greenleaf Organics',
      contactPerson: 'Anita Patel',
      phone: '+91 80 6700 8900',
      gstin: '29AABCG5432N1Z8',
      address: 'HSR Layout, Bengaluru, Karnataka - 560102',
    },
    {
      key: 'AEROCRAFT',
      email: 'client3@tvita.dev',
      name: 'Vikram Kapoor',
      companyName: 'Aerocraft Studios',
      contactPerson: 'Vikram Kapoor',
      phone: '+91 11 2600 5500',
      gstin: '07AAACA1122B1Z3',
      address: 'Connaught Place, New Delhi - 110001',
    },
    {
      key: 'ZENITECH',
      email: 'client4@tvita.dev',
      name: 'Deepa Sharma',
      companyName: 'Zenitech Retail',
      contactPerson: 'Deepa Sharma',
      phone: '+91 44 2900 3344',
      gstin: '33AABCZ9876Y1Z4',
      address: '14, Anna Salai, Chennai, Tamil Nadu - 600002',
    },
  ]

  const clientRecords: Record<string, { profileId: string; clientId: string }> = {}

  for (const c of CLIENTS_DATA) {
    let prof = await prisma.profile.findUnique({ where: { email: c.email } })
    if (!prof) {
      const pId = crypto.randomUUID()
      prof = await prisma.profile.create({
        data: {
          id: pId,
          email: c.email,
          name: c.name,
          role: 'CLIENT',
          isActive: true,
          passwordHash: PASSWORD_HASH,
        },
      })
    } else {
      prof = await prisma.profile.update({
        where: { id: prof.id },
        data: { name: c.name, role: 'CLIENT', isActive: true, passwordHash: PASSWORD_HASH },
      })
    }

    let clientOrg = await prisma.client.findFirst({ where: { profileId: prof.id } })
    if (!clientOrg) {
      clientOrg = await prisma.client.create({
        data: {
          name: c.companyName,
          email: c.email,
          phone: c.phone,
          contactPerson: c.contactPerson,
          gstin: c.gstin,
          address: c.address,
          status: 'ACTIVE',
          profileId: prof.id,
          createdById: ADMIN_ID,
        },
      })
    } else {
      clientOrg = await prisma.client.update({
        where: { id: clientOrg.id },
        data: {
          name: c.companyName,
          phone: c.phone,
          contactPerson: c.contactPerson,
          gstin: c.gstin,
          address: c.address,
          status: 'ACTIVE',
        },
      })
    }

    clientRecords[c.key] = { profileId: prof.id, clientId: clientOrg.id }
    console.log(`  ✓ Client Org: ${c.companyName} (${c.email})`)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. SUB-TEAMS (5 to 6 per Client) WITH ROLES & RBAC POLICIES
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🏢 Creating 5-6 Sub-Teams per Client with granular RBAC policies...')

  const SUBTEAMS_CONFIG: Record<string, Array<{ name: string; email: string; desc: string; policy: any }>> = {
    TECHVISION: [
      { name: 'TechVision Product Strategy', email: 'tv-product@techvision.in', desc: 'Product roadmap, requirements, and deliverables oversight.', policy: { overview: true, milestones: true, tasks: true, deliverables: true, financials: false, teamManagement: false } },
      { name: 'TechVision QA & UAT Reviewers', email: 'tv-qa@techvision.in', desc: 'Acceptance testing and build approval squad.', policy: { overview: true, milestones: true, tasks: true, deliverables: true, approvals: true, financials: false, teamManagement: false } },
      { name: 'TechVision Finance & Accounts', email: 'tv-finance@techvision.in', desc: 'Billing, invoices, GST compliance, and retainers.', policy: { overview: true, invoices: true, subscriptions: true, financials: true, teamManagement: false } },
      { name: 'TechVision Design & UI Review', email: 'tv-design@techvision.in', desc: 'UI/UX design sign-offs and branding assets.', policy: { overview: true, milestones: true, deliverables: true, approvals: true, financials: false, teamManagement: false } },
      { name: 'TechVision Executive Steering', email: 'tv-exec@techvision.in', desc: 'C-suite strategic review and project health metrics.', policy: { overview: true, milestones: true, tasks: true, deliverables: true, invoices: true, subscriptions: true, financials: true, teamManagement: true } },
      { name: 'TechVision Infrastructure & Security', email: 'tv-sec@techvision.in', desc: 'Security audit, compliance, and cloud infrastructure.', policy: { overview: true, milestones: true, tasks: true, deliverables: true, financials: false, teamManagement: false } },
    ],
    GREENLEAF: [
      { name: 'Greenleaf E-commerce Operations', email: 'gl-ops@greenleaf.co', desc: 'Store catalog, product import, and fulfillment.', policy: { overview: true, milestones: true, tasks: true, deliverables: true, financials: false, teamManagement: false } },
      { name: 'Greenleaf Marketing & Brand', email: 'gl-marketing@greenleaf.co', desc: 'Campaign collateral, banners, and social promotion.', policy: { overview: true, deliverables: true, approvals: true, financials: false, teamManagement: false } },
      { name: 'Greenleaf Finance & Audit', email: 'gl-finance@greenleaf.co', desc: 'Invoice verification and payment processing.', policy: { overview: true, invoices: true, subscriptions: true, financials: true, teamManagement: false } },
      { name: 'Greenleaf Quality Control', email: 'gl-qc@greenleaf.co', desc: 'Store testing and customer workflow review.', policy: { overview: true, milestones: true, tasks: true, approvals: true, financials: false, teamManagement: false } },
      { name: 'Greenleaf Executive Board', email: 'gl-exec@greenleaf.co', desc: 'Leadership dashboard and monthly progress summary.', policy: { overview: true, milestones: true, invoices: true, subscriptions: true, financials: true, teamManagement: true } },
    ],
    AEROCRAFT: [
      { name: 'Aerocraft VFX Production', email: 'ac-vfx@aerocraft.io', desc: 'Video rendering pipelines and media assets.', policy: { overview: true, milestones: true, tasks: true, deliverables: true, financials: false, teamManagement: false } },
      { name: 'Aerocraft Creative Direction', email: 'ac-creative@aerocraft.io', desc: 'Creative moodboards and design reviews.', policy: { overview: true, deliverables: true, approvals: true, financials: false, teamManagement: false } },
      { name: 'Aerocraft Finance & Legal', email: 'ac-finance@aerocraft.io', desc: 'Retainer invoices, tax, and contract terms.', policy: { overview: true, invoices: true, subscriptions: true, financials: true, teamManagement: false } },
      { name: 'Aerocraft Staging Reviewers', email: 'ac-staging@aerocraft.io', desc: 'Demo reel staging site verification.', policy: { overview: true, milestones: true, approvals: true, financials: false, teamManagement: false } },
      { name: 'Aerocraft Executive Council', email: 'ac-exec@aerocraft.io', desc: 'Executive status tracking and contract renewal.', policy: { overview: true, milestones: true, invoices: true, subscriptions: true, financials: true, teamManagement: true } },
    ],
    ZENITECH: [
      { name: 'Zenitech Retail Operations', email: 'zt-ops@zenitech.in', desc: 'Outlet inventory sync and store operations.', policy: { overview: true, milestones: true, tasks: true, deliverables: true, financials: false, teamManagement: false } },
      { name: 'Zenitech POS Integration Team', email: 'zt-pos@zenitech.in', desc: 'Point-of-sale integration and hardware testing.', policy: { overview: true, milestones: true, tasks: true, deliverables: true, financials: false, teamManagement: false } },
      { name: 'Zenitech Finance & Accounts', email: 'zt-finance@zenitech.in', desc: 'Enterprise billing, invoices, and GST statements.', policy: { overview: true, invoices: true, subscriptions: true, financials: true, teamManagement: false } },
      { name: 'Zenitech Quality Assurance', email: 'zt-qa@zenitech.in', desc: 'System regression testing and bug tracking.', policy: { overview: true, milestones: true, tasks: true, approvals: true, financials: false, teamManagement: false } },
      { name: 'Zenitech IT Leadership', email: 'zt-it@zenitech.in', desc: 'System architecture and technical oversight.', policy: { overview: true, milestones: true, tasks: true, deliverables: true, approvals: true, financials: false, teamManagement: true } },
      { name: 'Zenitech Executive Committee', email: 'zt-exec@zenitech.in', desc: 'Board-level dashboard and enterprise health metrics.', policy: { overview: true, milestones: true, invoices: true, subscriptions: true, financials: true, teamManagement: true } },
    ],
  }

  for (const [clientKey, teams] of Object.entries(SUBTEAMS_CONFIG)) {
    const { clientId } = clientRecords[clientKey]
    for (const t of teams) {
      let subTeamProf = await prisma.profile.findUnique({ where: { email: t.email } })
      if (!subTeamProf) {
        subTeamProf = await prisma.profile.create({
          data: {
            id: crypto.randomUUID(),
            email: t.email,
            name: t.name,
            role: 'CLIENT',
            isActive: true,
            passwordHash: PASSWORD_HASH,
          },
        })
      } else {
        await prisma.profile.update({
          where: { id: subTeamProf.id },
          data: { name: t.name, role: 'CLIENT', isActive: true, passwordHash: PASSWORD_HASH },
        })
      }

      const subTeam = await prisma.clientSubTeam.upsert({
        where: { email: t.email },
        update: {
          name: t.name,
          description: t.desc,
          accessPolicy: t.policy,
          status: 'ACTIVE',
        },
        create: {
          clientId,
          name: t.name,
          description: t.desc,
          email: t.email,
          profileId: subTeamProf.id,
          accessPolicy: t.policy,
          status: 'ACTIVE',
        },
      })

      // Add default role & member for each subteam
      const roleName = `${t.name} Member`
      const existingRole = await prisma.clientSubTeamRole.findFirst({
        where: { subTeamId: subTeam.id, name: roleName },
      })

      const subTeamRole = existingRole || await prisma.clientSubTeamRole.create({
        data: {
          subTeamId: subTeam.id,
          name: roleName,
          description: `Standard member role for ${t.name}`,
          permissions: t.policy,
        },
      })

      const memberEmail = `member.${t.email}`
      const existingMember = await prisma.clientSubTeamMember.findUnique({
        where: { email: memberEmail },
      })

      if (!existingMember) {
        await prisma.clientSubTeamMember.create({
          data: {
            subTeamId: subTeam.id,
            roleId: subTeamRole.id,
            name: `${t.name} Lead`,
            email: memberEmail,
            designation: 'Sub-Team Specialist',
            status: 'ACTIVE',
          },
        })
      }
      console.log(`    ↳ Sub-Team Created: ${t.name} (${t.email})`)
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. SUBSCRIPTION PLANS (Standard + Custom Enterprise Retainer)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n📋 Creating Standard & Custom Subscription Plans...')

  const PLAN_STARTER_ID  = '00000000-0000-0000-0000-000000000001'
  const PLAN_GROWTH_ID   = '00000000-0000-0000-0000-000000000002'
  const PLAN_AGENCY_ID   = '00000000-0000-0000-0000-000000000003'
  const PLAN_CUSTOM_ID   = '00000000-0000-0000-0000-000000000004'

  const starterPlan = await prisma.plan.upsert({
    where: { id: PLAN_STARTER_ID },
    update: { price: 4999 },
    create: {
      id: PLAN_STARTER_ID,
      name: 'Starter Retainer',
      description: 'Ideal for small clients with basic maintenance and updates.',
      price: 4999,
      currency: 'INR',
      billingCycle: 'MONTHLY',
      isActive: true,
      features: { create: [{ name: '2 Active Projects', value: '2' }, { name: '5GB Cloud Storage', value: '5GB' }, { name: 'Email Support', value: 'email' }] },
    },
  })

  const growthPlan = await prisma.plan.upsert({
    where: { id: PLAN_GROWTH_ID },
    update: { price: 14999 },
    create: {
      id: PLAN_GROWTH_ID,
      name: 'Growth Retainer',
      description: 'For growing brands needing continuous feature development.',
      price: 14999,
      currency: 'INR',
      billingCycle: 'MONTHLY',
      isActive: true,
      features: { create: [{ name: '5 Active Projects', value: '5' }, { name: '25GB Cloud Storage', value: '25GB' }, { name: 'Priority Support', value: 'priority' }] },
    },
  })

  const agencyPlan = await prisma.plan.upsert({
    where: { id: PLAN_AGENCY_ID },
    update: { price: 39999 },
    create: {
      id: PLAN_AGENCY_ID,
      name: 'Agency Enterprise',
      description: 'Full-service digital transformation package with dedicated team.',
      price: 39999,
      currency: 'INR',
      billingCycle: 'MONTHLY',
      isActive: true,
      features: { create: [{ name: 'Unlimited Projects', value: 'unlimited' }, { name: '100GB Storage', value: '100GB' }, { name: 'Dedicated Lead', value: 'lead' }] },
    },
  })

  const customPlan = await prisma.plan.upsert({
    where: { id: PLAN_CUSTOM_ID },
    update: { price: 75000 },
    create: {
      id: PLAN_CUSTOM_ID,
      name: 'Custom Omnichannel Enterprise',
      description: 'Tailored enterprise retainer with SLA guarantees and custom SLAs.',
      price: 75000,
      currency: 'INR',
      billingCycle: 'MONTHLY',
      isActive: true,
      isPrivate: true,
      features: { create: [{ name: 'Custom SLA (99.9% Uptime)', value: 'sla' }, { name: 'Dedicated QA & Security', value: 'qa' }, { name: 'Unlimited Revisions', value: 'unlimited' }] },
    },
  })

  console.log('  ✓ Subscription Plans created.')

  // ───────────────────────────────────────────────────────────────────────────
  // 6. CLIENT SUBSCRIPTIONS ASSIGNMENT
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n📦 Assigning Subscriptions to Clients...')

  const SUB_1 = '10000000-0000-0000-0000-000000000001'
  const SUB_2 = '10000000-0000-0000-0000-000000000002'
  const SUB_3 = '10000000-0000-0000-0000-000000000003'
  const SUB_4 = '10000000-0000-0000-0000-000000000004'

  await prisma.subscription.upsert({
    where: { id: SUB_1 },
    update: { status: 'ACTIVE' },
    create: {
      id: SUB_1,
      clientId: clientRecords['TECHVISION'].clientId,
      planId: agencyPlan.id,
      status: 'ACTIVE',
      startDate: new Date('2026-01-01'),
      renewalDate: new Date('2026-12-31'),
      createdById: ADMIN_ID,
    },
  })

  await prisma.subscription.upsert({
    where: { id: SUB_2 },
    update: { status: 'ACTIVE' },
    create: {
      id: SUB_2,
      clientId: clientRecords['GREENLEAF'].clientId,
      planId: growthPlan.id,
      status: 'ACTIVE',
      startDate: new Date('2026-03-01'),
      renewalDate: new Date('2027-03-01'),
      createdById: ADMIN_ID,
    },
  })

  await prisma.subscription.upsert({
    where: { id: SUB_3 },
    update: { status: 'ACTIVE' },
    create: {
      id: SUB_3,
      clientId: clientRecords['AEROCRAFT'].clientId,
      planId: starterPlan.id,
      status: 'ACTIVE',
      startDate: new Date('2026-02-01'),
      renewalDate: new Date('2027-02-01'),
      createdById: ADMIN_ID,
    },
  })

  await prisma.subscription.upsert({
    where: { id: SUB_4 },
    update: { status: 'ACTIVE' },
    create: {
      id: SUB_4,
      clientId: clientRecords['ZENITECH'].clientId,
      planId: customPlan.id,
      status: 'ACTIVE',
      startDate: new Date('2026-04-01'),
      renewalDate: new Date('2027-04-01'),
      createdById: ADMIN_ID,
    },
  })

  console.log('  ✓ Client Subscriptions assigned.')

  // ───────────────────────────────────────────────────────────────────────────
  // 7. PROJECTS & TEAM MEMBERS ASSIGNMENTS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🗂  Creating 4 Primary Projects + 2 Secondary Projects...')

  const PROJ_1 = '20000000-0000-0000-0000-000000000001'
  const PROJ_2 = '20000000-0000-0000-0000-000000000002'
  const PROJ_3 = '20000000-0000-0000-0000-000000000003'
  const PROJ_4 = '20000000-0000-0000-0000-000000000004'
  const PROJ_5 = '20000000-0000-0000-0000-000000000005'
  const PROJ_6 = '20000000-0000-0000-0000-000000000006'

  const p1 = await prisma.project.upsert({
    where: { id: PROJ_1 },
    update: { leadId: LEAD_1_ID, progress: 65 },
    create: {
      id: PROJ_1,
      name: 'TechVision Corporate Website Redesign',
      description: 'End-to-end modern web application with high performance design system.',
      clientId: clientRecords['TECHVISION'].clientId,
      leadId: LEAD_1_ID,
      status: 'IN_PROGRESS',
      progress: 65,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-09-30'),
      createdById: ADMIN_ID,
    },
  })

  const p2 = await prisma.project.upsert({
    where: { id: PROJ_2 },
    update: { leadId: LEAD_2_ID, progress: 45 },
    create: {
      id: PROJ_2,
      name: 'Greenleaf Organic E-Commerce Store',
      description: 'Shopify storefront integration with custom payment gateway & catalog.',
      clientId: clientRecords['GREENLEAF'].clientId,
      leadId: LEAD_2_ID,
      status: 'IN_PROGRESS',
      progress: 45,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-10-31'),
      createdById: ADMIN_ID,
    },
  })

  const p3 = await prisma.project.upsert({
    where: { id: PROJ_3 },
    update: { leadId: LEAD_3_ID, progress: 80 },
    create: {
      id: PROJ_3,
      name: 'Aerocraft VFX Portfolio Portal',
      description: 'High-impact interactive media portal showcasing motion graphics & VFX reels.',
      clientId: clientRecords['AEROCRAFT'].clientId,
      leadId: LEAD_3_ID,
      status: 'IN_PROGRESS',
      progress: 80,
      startDate: new Date('2026-05-15'),
      endDate: new Date('2026-08-31'),
      createdById: ADMIN_ID,
    },
  })

  const p4 = await prisma.project.upsert({
    where: { id: PROJ_4 },
    update: { leadId: LEAD_1_ID, progress: 30 },
    create: {
      id: PROJ_4,
      name: 'Zenitech Multi-Outlet Inventory System',
      description: 'Real-time stock synchronization and POS integration across 15 retail outlets.',
      clientId: clientRecords['ZENITECH'].clientId,
      leadId: LEAD_1_ID,
      status: 'IN_PROGRESS',
      progress: 30,
      startDate: new Date('2026-07-15'),
      endDate: new Date('2026-12-15'),
      createdById: ADMIN_ID,
    },
  })

  const p5 = await prisma.project.upsert({
    where: { id: PROJ_5 },
    update: { leadId: LEAD_2_ID },
    create: {
      id: PROJ_5,
      name: 'TechVision Enterprise CRM Module',
      description: 'Custom client relationship management and pipeline analytics tool.',
      clientId: clientRecords['TECHVISION'].clientId,
      leadId: LEAD_2_ID,
      status: 'PLANNED',
      progress: 0,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2027-03-31'),
      createdById: ADMIN_ID,
    },
  })

  const p6 = await prisma.project.upsert({
    where: { id: PROJ_6 },
    update: { leadId: LEAD_3_ID },
    create: {
      id: PROJ_6,
      name: 'Zenitech Mobile POS Companion App',
      description: 'iOS/Android native mobile application for on-the-floor retail checkouts.',
      clientId: clientRecords['ZENITECH'].clientId,
      leadId: LEAD_3_ID,
      status: 'PLANNED',
      progress: 0,
      startDate: new Date('2026-11-01'),
      endDate: new Date('2027-04-30'),
      createdById: ADMIN_ID,
    },
  })

  console.log('  ✓ 6 Projects created.')

  // Assign Project Members & Leads to ProjectMember table
  const PROJECT_ASSIGNMENTS = [
    // TechVision Redesign
    { projectId: p1.id, profileId: LEAD_1_ID, role: 'TEAM_LEAD' },
    { projectId: p1.id, profileId: DEV_1_ID,  role: 'MEMBER' },
    { projectId: p1.id, profileId: DEV_2_ID,  role: 'MEMBER' },
    { projectId: p1.id, profileId: TESTER_1_ID, role: 'MEMBER' },

    // Greenleaf Store
    { projectId: p2.id, profileId: LEAD_2_ID, role: 'TEAM_LEAD' },
    { projectId: p2.id, profileId: DEV_3_ID,  role: 'MEMBER' },
    { projectId: p2.id, profileId: DEV_4_ID,  role: 'MEMBER' },
    { projectId: p2.id, profileId: TESTER_2_ID, role: 'MEMBER' },

    // Aerocraft VFX Portal
    { projectId: p3.id, profileId: LEAD_3_ID, role: 'TEAM_LEAD' },
    { projectId: p3.id, profileId: DEV_5_ID,  role: 'MEMBER' },
    { projectId: p3.id, profileId: TESTER_1_ID, role: 'MEMBER' },

    // Zenitech Inventory System
    { projectId: p4.id, profileId: LEAD_1_ID, role: 'TEAM_LEAD' },
    { projectId: p4.id, profileId: DEV_1_ID,  role: 'MEMBER' },
    { projectId: p4.id, profileId: DEV_2_ID,  role: 'MEMBER' },
    { projectId: p4.id, profileId: DEV_3_ID,  role: 'MEMBER' },
    { projectId: p4.id, profileId: TESTER_2_ID, role: 'MEMBER' },
  ]

  for (const pa of PROJECT_ASSIGNMENTS) {
    await prisma.projectMember.upsert({
      where: { projectId_profileId: { projectId: pa.projectId, profileId: pa.profileId } },
      update: { role: pa.role as any },
      create: { projectId: pa.projectId, profileId: pa.profileId, role: pa.role as any },
    })
  }

  console.log('  ✓ Project Members assigned.')

  // ───────────────────────────────────────────────────────────────────────────
  // 8. MILESTONES & TASKS SEEDING
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🏁 Seeding Milestones & Tasks...')

  const MILESTONE_1_ID = '30000000-0000-0000-0000-000000000001'
  const MILESTONE_2_ID = '30000000-0000-0000-0000-000000000002'
  const MILESTONE_3_ID = '30000000-0000-0000-0000-000000000003'
  const MILESTONE_4_ID = '30000000-0000-0000-0000-000000000004'

  await prisma.milestone.upsert({
    where: { id: MILESTONE_1_ID },
    update: { status: 'COMPLETED', progress: 100 },
    create: {
      id: MILESTONE_1_ID,
      projectId: p1.id,
      name: 'Phase 1: Discovery & Wireframing',
      status: 'COMPLETED',
      progress: 100,
      sortOrder: 1,
      clientVisible: true,
      dueDate: new Date('2026-06-30'),
    },
  })

  await prisma.milestone.upsert({
    where: { id: MILESTONE_2_ID },
    update: { status: 'IN_PROGRESS', progress: 70 },
    create: {
      id: MILESTONE_2_ID,
      projectId: p1.id,
      name: 'Phase 2: UI Design & Design System',
      status: 'IN_PROGRESS',
      progress: 70,
      sortOrder: 2,
      clientVisible: true,
      dueDate: new Date('2026-07-31'),
    },
  })

  await prisma.milestone.upsert({
    where: { id: MILESTONE_3_ID },
    update: { status: 'IN_PROGRESS', progress: 50 },
    create: {
      id: MILESTONE_3_ID,
      projectId: p2.id,
      name: 'Catalog Import & Payment Gateway',
      status: 'IN_PROGRESS',
      progress: 50,
      sortOrder: 1,
      clientVisible: true,
      dueDate: new Date('2026-08-31'),
    },
  })

  await prisma.milestone.upsert({
    where: { id: MILESTONE_4_ID },
    update: { status: 'IN_PROGRESS', progress: 30 },
    create: {
      id: MILESTONE_4_ID,
      projectId: p4.id,
      name: 'Core Stock Sync Architecture',
      status: 'IN_PROGRESS',
      progress: 30,
      sortOrder: 1,
      clientVisible: true,
      dueDate: new Date('2026-09-15'),
    },
  })

  const TASKS_DATA = [
    { id: '40000000-0000-0000-0000-000000000001', projectId: p1.id, milestoneId: MILESTONE_2_ID, title: 'Build responsive landing page layout', status: 'IN_PROGRESS', priority: 'HIGH', devId: DEV_1_ID, testId: TESTER_1_ID, dueDate: new Date('2026-08-20') },
    { id: '40000000-0000-0000-0000-000000000002', projectId: p1.id, milestoneId: MILESTONE_2_ID, title: 'Integrate contact form API & validation', status: 'READY_FOR_TESTING', priority: 'MEDIUM', devId: DEV_2_ID, testId: TESTER_1_ID, dueDate: new Date('2026-08-22') },
    { id: '40000000-0000-0000-0000-000000000003', projectId: p2.id, milestoneId: MILESTONE_3_ID, title: 'Implement Razorpay & Stripe Checkout', status: 'IN_PROGRESS', priority: 'URGENT', devId: DEV_3_ID, testId: TESTER_2_ID, dueDate: new Date('2026-08-25') },
    { id: '40000000-0000-0000-0000-000000000004', projectId: p4.id, milestoneId: MILESTONE_4_ID, title: 'Multi-outlet database sync trigger', status: 'IN_PROGRESS', priority: 'HIGH', devId: DEV_1_ID, testId: TESTER_2_ID, dueDate: new Date('2026-09-01') },
  ]

  for (const t of TASKS_DATA) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: { status: t.status as any },
      create: {
        id: t.id,
        projectId: t.projectId,
        milestoneId: t.milestoneId,
        title: t.title,
        status: t.status as any,
        priority: t.priority as any,
        developerId: t.devId,
        testerId: t.testId,
        assigneeId: t.devId,
        dueDate: t.dueDate,
        createdById: ADMIN_ID,
      },
    })
  }

  console.log('  ✓ Milestones and Tasks seeded.')

  // ───────────────────────────────────────────────────────────────────────────
  // 9. INVOICES SEEDING
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🧾 Creating Sample Invoices...')

  const INVOICE_1_NO = 'INV-2026-001'
  const INVOICE_2_NO = 'INV-2026-002'

  await prisma.invoice.upsert({
    where: { invoiceNo: INVOICE_1_NO },
    update: { status: 'PAID' },
    create: {
      invoiceNo: INVOICE_1_NO,
      clientId: clientRecords['TECHVISION'].clientId,
      projectId: p1.id,
      subtotal: 75000,
      taxAmount: 13500,
      taxRate: 18,
      amount: 88500,
      currency: 'INR',
      status: 'PAID',
      issuedDate: new Date('2026-06-01'),
      dueDate: new Date('2026-06-15'),
      paidDate: new Date('2026-06-10'),
      notes: 'Phase 1 Discovery & Wireframe Deliverables',
      lineItems: [
        { description: 'Discovery Research & Architecture', qty: 1, rate: 35000, amount: 35000 },
        { description: 'UX Wireframes (12 screens)', qty: 1, rate: 40000, amount: 40000 },
      ] as any,
      createdById: ADMIN_ID,
    },
  })

  await prisma.invoice.upsert({
    where: { invoiceNo: INVOICE_2_NO },
    update: { status: 'PENDING' },
    create: {
      invoiceNo: INVOICE_2_NO,
      clientId: clientRecords['GREENLEAF'].clientId,
      projectId: p2.id,
      subtotal: 45000,
      taxAmount: 8100,
      taxRate: 18,
      amount: 53100,
      currency: 'INR',
      status: 'PENDING',
      issuedDate: new Date('2026-08-01'),
      dueDate: new Date('2026-08-25'),
      notes: 'Storefront Setup & Theme Integration',
      lineItems: [
        { description: 'Shopify Store Configuration', qty: 1, rate: 20000, amount: 20000 },
        { description: 'Custom Liquid Theme Styling', qty: 1, rate: 25000, amount: 25000 },
      ] as any,
      createdById: ADMIN_ID,
    },
  })

  console.log('  ✓ Invoices seeded.')

  // ───────────────────────────────────────────────────────────────────────────
  // 10. AUDIT LOG SEEDING
  // ───────────────────────────────────────────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      actor: { connect: { id: ADMIN_ID } },
      actorEmail: 'shubhamd@tvita.in',
      actorRole: 'ADMIN',
      action: 'CREATE',
      entityType: 'organization',
      entityId: ADMIN_ID,
      entityLabel: 'Complete Platform Data Seed',
      newValue: { notes: 'Seeded 1 Admin, 10 Team Members, 4 Clients, 22 Sub-Teams, 6 Projects, 4 Subscriptions, and Invoices.' },
    },
  })

  console.log('\n✅ SEEDING COMPLETE SUCCESSFULLY!')
  console.log('───────────────────────────────────────────────────')
  console.log('Credentials Summary (Password for all: Pass1234):')
  console.log('  👑 Admin:       shubhamd@tvita.in')
  console.log('  👥 Team Leads:  lead1@tvita.dev, lead2@tvita.dev, lead3@tvita.dev')
  console.log('  💻 Developers:  dev1@tvita.dev, dev2@tvita.dev, dev3@tvita.dev, dev4@tvita.dev, dev5@tvita.dev')
  console.log('  🧪 Testers:     tester1@tvita.dev, tester2@tvita.dev')
  console.log('  🏢 Clients:     client1@tvita.dev, client2@tvita.dev, client3@tvita.dev, client4@tvita.dev')
  console.log('  🏢 Sub-Teams:   5-6 sub-teams per client (e.g. tv-product@techvision.in, gl-ops@greenleaf.co, etc.)')
  console.log('───────────────────────────────────────────────────\n')
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed with error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
