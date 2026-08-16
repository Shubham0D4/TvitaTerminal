import 'dotenv/config'
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const ADMIN_ACCOUNTS = [
  {
    email: 'shubhamd@tvita.in',
    password: 'Pass1234',
    name: 'Shubham Darekar',
  },
]

async function resetDatabase() {
  console.log('🧹 Starting database cleanup...')

  // 1. Clean all data tables in order of foreign key dependency
  console.log('Deleting activity logs, approvals, milestones, tasks, projects...')
  await prisma.clientApproval.deleteMany({})
  await prisma.milestone.deleteMany({})
  await prisma.taskActivity.deleteMany({})
  await prisma.task.deleteMany({})
  await prisma.project.deleteMany({})

  console.log('Deleting invoices, payments, subscriptions, contacts, subteams, clients...')
  await prisma.invoice.deleteMany({})
  await prisma.payment.deleteMany({})
  await prisma.subscription.deleteMany({})
  await prisma.clientContact.deleteMany({})
  await prisma.clientSubTeam.deleteMany({})
  await prisma.client.deleteMany({})

  console.log('Deleting audit logs & notifications...')
  await prisma.auditLog.deleteMany({})
  await prisma.notification.deleteMany({})

  // 2. Clear non-admin Profiles from Prisma DB
  console.log('Cleaning Profiles in Prisma DB...')
  await prisma.profile.deleteMany({
    where: {
      email: {
        notIn: ADMIN_ACCOUNTS.map((a) => a.email),
      },
    },
  })

  // 3. Provision / Sync Admin Accounts
  console.log('Provisioning Admin Accounts in Prisma DB...')

  for (const admin of ADMIN_ACCOUNTS) {
    const passwordHash = bcrypt.hashSync(admin.password, 10)
    const existingProfile = await prisma.profile.findUnique({
      where: { email: admin.email },
    })

    const authUserId = existingProfile?.id || crypto.randomUUID()

    // Upsert into Prisma Profile
    await prisma.profile.upsert({
      where: { email: admin.email },
      update: {
        id: authUserId,
        role: 'ADMIN',
        teamRole: null,
        name: admin.name,
        isActive: true,
        passwordHash,
      },
      create: {
        id: authUserId,
        email: admin.email,
        role: 'ADMIN',
        teamRole: null,
        name: admin.name,
        isActive: true,
        passwordHash,
      },
    })

    console.log(`✓ Admin ready: ${admin.email} / ${admin.password}`)
  }

  // 4. Ensure Default Plans exist
  console.log('Ensuring default Plans exist...')
  await prisma.plan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Starter',
      description: 'Basic plan for small teams.',
      price: 4999,
      currency: 'INR',
      billingCycle: 'MONTHLY',
      isActive: true,
    },
  })

  await prisma.plan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Growth',
      description: 'Ideal for growing businesses.',
      price: 14999,
      currency: 'INR',
      billingCycle: 'MONTHLY',
      isActive: true,
    },
  })

  // 5. Ensure AppSettings exist with SMTP configuration
  console.log('Ensuring AppSettings exist...')
  const existingSettings = await prisma.appSettings.findFirst()
  if (!existingSettings) {
    await prisma.appSettings.create({
      data: {
        companyName: 'Tvita Digital Agency',
        companyEmail: process.env.GMAIL_USER || 'admin@tvita.dev',
        companyPhone: '+91 98765 43210',
        companyAddress: 'Pimpri, Pune, Maharashtra 411018',
        companyGstin: '27ABCDE1234F1Z5',
        currency: 'INR',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: process.env.GMAIL_USER || 'shubhamd@tvita.in',
        smtpPass: process.env.GMAIL_APP_PASSWORD || '',
        smtpSender: `Tvita Platform <${process.env.GMAIL_USER || 'shubhamd@tvita.in'}>`,
      },
    })
  } else {
    await prisma.appSettings.update({
      where: { id: existingSettings.id },
      data: {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: process.env.GMAIL_USER || 'shubhamd@tvita.in',
        smtpPass: process.env.GMAIL_APP_PASSWORD || '',
        smtpSender: `Tvita Platform <${process.env.GMAIL_USER || 'shubhamd@tvita.in'}>`,
      },
    })
  }

  console.log('\n✅ DATABASE RESET COMPLETE!')
  console.log('All dummy data cleared.')
  console.log('Available Admin Credentials:')
  console.log('  1. Email: shubhamd@tvita.in | Password: Pass1234')
}

resetDatabase()
  .catch((err) => {
    console.error('Reset failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
