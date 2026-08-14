/**
 * prisma/seed.ts
 * Seeds the database with demo data for development/testing.
 * Run with: npx prisma db seed
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ─── UPDATE THESE TO YOUR ACTUAL SUPABASE AUTH USER IDs ──────────────────────
const ADMIN_USER_ID   = 'aaaaaaaa-0000-0000-0000-000000000001'
const TEAM_USER_ID    = 'bbbbbbbb-0000-0000-0000-000000000002'
const CLIENT_USER_ID  = 'cccccccc-0000-0000-0000-000000000003'

const PLAN_STARTER_ID = '00000000-0000-0000-0000-000000000001'
const PLAN_GROWTH_ID  = '00000000-0000-0000-0000-000000000002'
const PLAN_AGENCY_ID  = '00000000-0000-0000-0000-000000000003'

async function main() {
  console.log('🌱 Seeding database...\n')

  // ─── Plans ────────────────────────────────────────────────────────────────
  console.log('📋 Creating plans...')
  const [starterPlan, growthPlan, agencyPlan] = await Promise.all([
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
  console.log('  ✓ Plans created\n')

  // ─── Profiles ────────────────────────────────────────────────────────────
  console.log('👥 Creating profiles...')
  const adminProfile = await prisma.profile.upsert({
    where: { id: ADMIN_USER_ID },
    update: {},
    create: {
      id: ADMIN_USER_ID,
      email: 'admin@tvita.dev',
      name: 'Shubham Verma',
      role: 'ADMIN',
      isActive: true,
      phone: '+91 98765 43210',
    },
  })

  const teamProfile = await prisma.profile.upsert({
    where: { id: TEAM_USER_ID },
    update: {},
    create: {
      id: TEAM_USER_ID,
      email: 'team@tvita.dev',
      name: 'Priya Sharma',
      role: 'TEAM_MEMBER',
      isActive: true,
      phone: '+91 87654 32109',
    },
  })

  const clientProfile = await prisma.profile.upsert({
    where: { id: CLIENT_USER_ID },
    update: {},
    create: {
      id: CLIENT_USER_ID,
      email: 'client@tvita.dev',
      name: 'Rajesh Kumar',
      role: 'CLIENT',
      isActive: true,
      phone: '+91 76543 21098',
    },
  })
  console.log('  ✓ Profiles created\n')

  // ─── Clients ────────────────────────────────────────────────────────────
  console.log('🏢 Creating clients...')
  const techvision = await prisma.client.upsert({
    where: { profileId: CLIENT_USER_ID },
    update: {},
    create: {
      name: 'TechVision Solutions',
      email: 'contact@techvision.in',
      phone: '+91 22 4000 1234',
      contactPerson: 'Rajesh Kumar',
      gstin: '27AAACT2727Q1Z5',
      address: '302, Andheri East, Mumbai, Maharashtra - 400069',
      status: 'ACTIVE',
      profileId: CLIENT_USER_ID,
    },
  })

  const greenleaf = await prisma.client.upsert({
    where: { id: 'dddddddd-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: 'dddddddd-0000-0000-0000-000000000002',
      name: 'Greenleaf Organics',
      email: 'info@greenleaf.co',
      phone: '+91 80 6700 8900',
      contactPerson: 'Anita Patel',
      gstin: '29AABCG5432N1Z8',
      address: 'HSR Layout, Bengaluru, Karnataka - 560102',
      status: 'ACTIVE',
    },
  })

  const aerocraft = await prisma.client.upsert({
    where: { id: 'eeeeeeee-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: 'eeeeeeee-0000-0000-0000-000000000003',
      name: 'Aerocraft Studios',
      email: 'projects@aerocraft.io',
      phone: '+91 11 2600 5500',
      contactPerson: 'Vikram Nair',
      address: 'Connaught Place, New Delhi - 110001',
      status: 'ACTIVE',
    },
  })
  console.log('  ✓ Clients created\n')

  // ─── Subscriptions ────────────────────────────────────────────────────────
  console.log('📦 Creating subscriptions...')
  await prisma.subscription.upsert({
    where: { id: '11111111-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '11111111-0000-0000-0000-000000000001',
      clientId: techvision.id,
      planId: growthPlan.id,
      status: 'ACTIVE',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2026-09-01'),
    },
  })

  await prisma.subscription.upsert({
    where: { id: '11111111-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '11111111-0000-0000-0000-000000000002',
      clientId: greenleaf.id,
      planId: starterPlan.id,
      status: 'ACTIVE',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2026-09-01'),
    },
  })
  console.log('  ✓ Subscriptions created\n')

  // ─── Projects ────────────────────────────────────────────────────────────
  console.log('🗂  Creating projects...')
  const p1 = await prisma.project.upsert({
    where: { id: '22222222-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '22222222-0000-0000-0000-000000000001',
      name: 'TechVision Website Redesign',
      description: 'Full redesign and development of the corporate website.',
      clientId: techvision.id,
      status: 'IN_PROGRESS',
      progress: 65,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-09-30'),
    },
  })

  const p2 = await prisma.project.upsert({
    where: { id: '22222222-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '22222222-0000-0000-0000-000000000002',
      name: 'Mobile App Development',
      description: 'React Native cross-platform mobile app for field agents.',
      clientId: techvision.id,
      status: 'PLANNED',
      progress: 0,
      startDate: new Date('2026-10-01'),
    },
  })

  const p3 = await prisma.project.upsert({
    where: { id: '22222222-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '22222222-0000-0000-0000-000000000003',
      name: 'E-commerce Platform',
      description: 'Shopify-based e-commerce store for organic product range.',
      clientId: greenleaf.id,
      status: 'IN_PROGRESS',
      progress: 40,
      startDate: new Date('2026-07-15'),
      endDate: new Date('2026-10-15'),
    },
  })

  const p4 = await prisma.project.upsert({
    where: { id: '22222222-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '22222222-0000-0000-0000-000000000004',
      name: 'Brand Identity & Guidelines',
      description: 'Full brand identity package: logo, palette, typography, usage guidelines.',
      clientId: aerocraft.id,
      status: 'COMPLETED',
      progress: 100,
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-06-30'),
    },
  })
  console.log('  ✓ Projects created\n')

  // ─── Project Members ─────────────────────────────────────────────────────
  await prisma.projectMember.upsert({
    where: { projectId_profileId: { projectId: p1.id, profileId: teamProfile.id } },
    update: {},
    create: { projectId: p1.id, profileId: teamProfile.id },
  })
  await prisma.projectMember.upsert({
    where: { projectId_profileId: { projectId: p3.id, profileId: teamProfile.id } },
    update: {},
    create: { projectId: p3.id, profileId: teamProfile.id },
  })

  // ─── Tasks ───────────────────────────────────────────────────────────────
  console.log('✅ Creating tasks...')
  await Promise.all([
    prisma.task.upsert({
      where: { id: '33333333-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '33333333-0000-0000-0000-000000000001',
        title: 'Design homepage mockup',
        description: 'Create Figma mockup for homepage including hero, features, and footer.',
        projectId: p1.id,
        assigneeId: teamProfile.id,
        status: 'COMPLETED',
        priority: 'HIGH',
        dueDate: new Date('2026-07-15'),
      },
    }),
    prisma.task.upsert({
      where: { id: '33333333-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '33333333-0000-0000-0000-000000000002',
        title: 'Implement responsive navigation',
        description: 'Build the top nav with mobile hamburger and route transitions.',
        projectId: p1.id,
        assigneeId: teamProfile.id,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: new Date('2026-08-20'),
      },
    }),
    prisma.task.upsert({
      where: { id: '33333333-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: '33333333-0000-0000-0000-000000000003',
        title: 'SEO meta tags & sitemap',
        description: 'Add all meta tags, og images, sitemap.xml, and robots.txt.',
        projectId: p1.id,
        assigneeId: teamProfile.id,
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: new Date('2026-09-01'),
      },
    }),
    prisma.task.upsert({
      where: { id: '33333333-0000-0000-0000-000000000004' },
      update: {},
      create: {
        id: '33333333-0000-0000-0000-000000000004',
        title: 'Setup product catalog',
        description: 'Import all 200+ products with images, descriptions, and categories.',
        projectId: p3.id,
        assigneeId: teamProfile.id,
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        dueDate: new Date('2026-08-25'),
      },
    }),
  ])
  console.log('  ✓ Tasks created\n')

  // ─── Invoices ────────────────────────────────────────────────────────────
  console.log('🧾 Creating invoices...')
  await prisma.invoice.upsert({
    where: { invoiceNo: 'INV-2026-001' },
    update: {},
    create: {
      invoiceNo: 'INV-2026-001',
      clientId: techvision.id,
      projectId: p1.id,
      amount: 75000,
      subtotal: 75000,
      taxAmount: 13500,
      taxRate: 18,
      currency: 'INR',
      status: 'PAID',
      issuedDate: new Date('2026-06-01'),
      dueDate: new Date('2026-06-15'),
      paidDate: new Date('2026-06-12'),
      notes: 'Phase 1: Discovery & Design - 50% advance',
      lineItems: [
        { description: 'Discovery & Research', qty: 1, rate: 25000, amount: 25000 },
        { description: 'UI/UX Design (8 screens)', qty: 8, rate: 6250, amount: 50000 },
      ],
    },
  })

  await prisma.invoice.upsert({
    where: { invoiceNo: 'INV-2026-002' },
    update: {},
    create: {
      invoiceNo: 'INV-2026-002',
      clientId: techvision.id,
      projectId: p1.id,
      amount: 87500,
      subtotal: 87500,
      taxAmount: 15750,
      taxRate: 18,
      currency: 'INR',
      status: 'PENDING',
      issuedDate: new Date('2026-08-01'),
      dueDate: new Date('2026-08-15'),
      notes: 'Phase 2: Development Milestone 1',
      lineItems: [
        { description: 'Frontend Development', qty: 1, rate: 60000, amount: 60000 },
        { description: 'Backend APIs', qty: 1, rate: 27500, amount: 27500 },
      ],
    },
  })

  await prisma.invoice.upsert({
    where: { invoiceNo: 'INV-2026-003' },
    update: {},
    create: {
      invoiceNo: 'INV-2026-003',
      clientId: greenleaf.id,
      projectId: p3.id,
      amount: 48000,
      subtotal: 48000,
      taxAmount: 8640,
      taxRate: 18,
      currency: 'INR',
      status: 'PAID',
      issuedDate: new Date('2026-07-15'),
      dueDate: new Date('2026-07-30'),
      paidDate: new Date('2026-07-28'),
      notes: 'E-commerce Setup - Phase 1 advance',
      lineItems: [
        { description: 'Shopify Store Setup', qty: 1, rate: 20000, amount: 20000 },
        { description: 'Theme Customization', qty: 1, rate: 28000, amount: 28000 },
      ],
    },
  })
  console.log('  ✓ Invoices created\n')

  // ─── Documents ───────────────────────────────────────────────────────────
  console.log('📄 Creating documents...')
  await prisma.document.upsert({
    where: { id: '44444444-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '44444444-0000-0000-0000-000000000001',
      name: 'TechVision Project Contract.pdf',
      fileUrl: 'https://placeholder-storage.tvita.dev/contracts/techvision-2026.pdf',
      fileType: 'application/pdf',
      fileSize: 248000,
      clientId: techvision.id,
      projectId: p1.id,
      uploadedById: adminProfile.id,
      visibility: 'CLIENT_VISIBLE',
    },
  })

  await prisma.document.upsert({
    where: { id: '44444444-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '44444444-0000-0000-0000-000000000002',
      name: 'Homepage Mockup v2.fig',
      fileUrl: 'https://placeholder-storage.tvita.dev/designs/homepage-v2.fig',
      fileType: 'application/octet-stream',
      fileSize: 1240000,
      clientId: techvision.id,
      projectId: p1.id,
      uploadedById: teamProfile.id,
      visibility: 'CLIENT_VISIBLE',
    },
  })
  console.log('  ✓ Documents created\n')

  // ─── App Settings ─────────────────────────────────────────────────────────
  console.log('⚙️  Creating app settings...')
  const existingSettings = await prisma.appSettings.findFirst()
  if (!existingSettings) {
    await prisma.appSettings.create({
      data: {
        companyName: 'Tvita Digital Agency',
        companyEmail: 'hello@tvita.dev',
        companyPhone: '+91 98765 43210',
        companyAddress: '501, Tech Park, Andheri East, Mumbai - 400069',
        companyGstin: '27AABCT1234A1Z5',
        companyPan: 'AABCT1234A',
        companyState: 'Maharashtra',
        bankName: 'HDFC Bank',
        bankAccount: '50100987654321',
        bankIfsc: 'HDFC0001234',
        bankBranch: 'Andheri West',
        invoicePrefix: 'INV',
        invoiceFooter: 'Thank you for your business. Payment due within 15 days of receipt.',
        currency: 'INR',
        taxRate: 18,
      },
    })
  }
  console.log('  ✓ App settings created\n')

  console.log('✅ Seed completed successfully!\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => pool.end())
