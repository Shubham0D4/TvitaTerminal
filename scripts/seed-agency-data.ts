/**
 * scripts/seed-agency-data.ts
 * Idempotent demo seed for Admin UI: people, clients, projects, invoices,
 * payments, subscriptions, and quotes.
 *
 * Run with:
 *   npm run seed:agency
 *
 * Demo passwords (where accounts are created): Pass1234
 * Existing admin / Northwind client accounts are left as-is.
 */

import { PrismaClient, type Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const BCRYPT_ROUNDS = 10
const CREDENTIAL_PROVIDER_ID = 'credential'
const CREDENTIAL_ISSUER = `local:${CREDENTIAL_PROVIDER_ID}`
const DEMO_PASSWORD = 'Pass1234'

const PLAN_STARTER_ID = '00000000-0000-0000-0000-000000000001'
const PLAN_GROWTH_ID = '00000000-0000-0000-0000-000000000002'
const PLAN_AGENCY_ID = '00000000-0000-0000-0000-000000000003'

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

const daysFromNow = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

type PersonSeed = {
  email: string
  name: string
  role: 'ADMIN' | 'TEAM_MEMBER'
  teamRole?: 'TEAM_LEAD' | 'MEMBER' | null
  phone?: string
  salary?: number
  isActive?: boolean
  invited?: boolean
}

const PEOPLE: PersonSeed[] = [
  { email: 'priya.mehta@tvita.in', name: 'Priya Mehta', role: 'ADMIN', phone: '+91 98100 11001', salary: 145000 },
  { email: 'arjun.rao@tvita.in', name: 'Arjun Rao', role: 'TEAM_MEMBER', teamRole: 'TEAM_LEAD', phone: '+91 98100 11002', salary: 95000 },
  { email: 'sara.khan@tvita.in', name: 'Sara Khan', role: 'TEAM_MEMBER', teamRole: 'MEMBER', phone: '+91 98100 11003', salary: 78000 },
  { email: 'dev.patel@tvita.in', name: 'Dev Patel', role: 'TEAM_MEMBER', teamRole: 'MEMBER', phone: '+91 98100 11004', salary: 82000 },
  { email: 'meera.nair@tvita.in', name: 'Meera Nair', role: 'TEAM_MEMBER', teamRole: 'TEAM_LEAD', phone: '+91 98100 11005', salary: 98000 },
  { email: 'kabir.singh@tvita.in', name: 'Kabir Singh', role: 'TEAM_MEMBER', teamRole: 'MEMBER', phone: '+91 98100 11006', salary: 72000 },
  { email: 'nina.das@tvita.in', name: 'Nina Das', role: 'TEAM_MEMBER', teamRole: 'MEMBER', phone: '+91 98100 11007', salary: 70000 },
  { email: 'vikram.joshi@tvita.in', name: 'Vikram Joshi', role: 'TEAM_MEMBER', teamRole: 'MEMBER', phone: '+91 98100 11008', salary: 76000 },
  { email: 'aisha.fernandes@tvita.in', name: 'Aisha Fernandes', role: 'TEAM_MEMBER', teamRole: 'MEMBER', phone: '+91 98100 11009', salary: 74000 },
  { email: 'rohan.gupta@tvita.in', name: 'Rohan Gupta', role: 'TEAM_MEMBER', teamRole: 'MEMBER', isActive: false, salary: 68000 },
  { email: 'invite.designer@tvita.in', name: 'Pending Designer', role: 'TEAM_MEMBER', teamRole: 'MEMBER', invited: true },
  { email: 'invite.pm@tvita.in', name: 'Pending PM', role: 'TEAM_MEMBER', teamRole: 'TEAM_LEAD', invited: true },
]

type ClientSeed = {
  slug: string
  displayName: string
  legalName: string
  contact: string
  email: string
  phone: string
  city: string
  state: string
  country: string
  industry: string
  gstin?: string
  planId: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'VIP'
}

const CLIENTS: ClientSeed[] = [
  {
    slug: 'northwind',
    displayName: 'Northwind Retail',
    legalName: 'Northwind Retail Private Limited',
    contact: 'Ananya Iyer',
    email: 'client@tvita.in',
    phone: '+91 98200 41122',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'IN',
    industry: 'Retail',
    gstin: '27AABCU9603R1ZM',
    planId: PLAN_GROWTH_ID,
    priority: 'HIGH',
  },
  {
    slug: 'elita',
    displayName: 'Elita Mobility',
    legalName: 'Elita Mobility Technologies Pvt Ltd',
    contact: 'Rohan Desai',
    email: 'rohan@elitamobility.com',
    phone: '+91 98765 10021',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'IN',
    industry: 'Automotive',
    gstin: '27AAACE1234F1Z5',
    planId: PLAN_AGENCY_ID,
    priority: 'VIP',
  },
  {
    slug: 'lumen',
    displayName: 'Lumen Health',
    legalName: 'Lumen Health Systems LLP',
    contact: 'Dr. Kavita Shah',
    email: 'kavita@lumenhealth.in',
    phone: '+91 98765 10022',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'IN',
    industry: 'Healthcare',
    gstin: '29AABCL5678G1Z2',
    planId: PLAN_GROWTH_ID,
    priority: 'HIGH',
  },
  {
    slug: 'orbit',
    displayName: 'Orbit Fintech',
    legalName: 'Orbit Financial Technologies Ltd',
    contact: 'Sameer Kapoor',
    email: 'sameer@orbitfin.tech',
    phone: '+91 98765 10023',
    city: 'Gurugram',
    state: 'Haryana',
    country: 'IN',
    industry: 'Fintech',
    gstin: '06AABCO9012H1Z9',
    planId: PLAN_AGENCY_ID,
    priority: 'HIGH',
  },
  {
    slug: 'haven',
    displayName: 'Haven Homes',
    legalName: 'Haven Homes Realty Pvt Ltd',
    contact: 'Neha Bhatia',
    email: 'neha@havenhomes.in',
    phone: '+91 98765 10024',
    city: 'Delhi',
    state: 'Delhi',
    country: 'IN',
    industry: 'Real Estate',
    gstin: '07AABCH3456I1Z1',
    planId: PLAN_STARTER_ID,
    priority: 'MEDIUM',
  },
  {
    slug: 'pixel',
    displayName: 'Pixel & Co',
    legalName: 'Pixel and Company Creative Studio',
    contact: 'Jules Martin',
    email: 'jules@pixelandco.com',
    phone: '+1 415 555 0188',
    city: 'San Francisco',
    state: 'CA',
    country: 'US',
    industry: 'Creative',
    planId: PLAN_GROWTH_ID,
    priority: 'MEDIUM',
  },
  {
    slug: 'greenleaf',
    displayName: 'Greenleaf Organics',
    legalName: 'Greenleaf Organics Private Limited',
    contact: 'Aditi Verma',
    email: 'aditi@greenleaf.org',
    phone: '+91 98765 10025',
    city: 'Jaipur',
    state: 'Rajasthan',
    country: 'IN',
    industry: 'FMCG',
    gstin: '08AABCG7890J1Z4',
    planId: PLAN_STARTER_ID,
    priority: 'LOW',
  },
  {
    slug: 'nova',
    displayName: 'Nova Schools',
    legalName: 'Nova Education Trust',
    contact: 'Principal Ravi Menon',
    email: 'ravi@novaschools.edu',
    phone: '+91 98765 10026',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'IN',
    industry: 'Education',
    gstin: '33AABCN2345K1Z8',
    planId: PLAN_GROWTH_ID,
    priority: 'MEDIUM',
  },
  {
    slug: 'atlas',
    displayName: 'Atlas Logistics',
    legalName: 'Atlas Freight & Logistics Pvt Ltd',
    contact: 'Imran Qureshi',
    email: 'imran@atlaslogistics.in',
    phone: '+91 98765 10027',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'IN',
    industry: 'Logistics',
    gstin: '36AABCA6789L1Z3',
    planId: PLAN_AGENCY_ID,
    priority: 'HIGH',
  },
  {
    slug: 'bloom',
    displayName: 'Bloom Beauty',
    legalName: 'Bloom Beauty Brands Pvt Ltd',
    contact: 'Sana Ali',
    email: 'sana@bloombeauty.in',
    phone: '+91 98765 10028',
    city: 'Ahmedabad',
    state: 'Gujarat',
    country: 'IN',
    industry: 'Consumer',
    gstin: '24AABCB0123M1Z6',
    planId: PLAN_STARTER_ID,
    priority: 'MEDIUM',
  },
]

type ProjectSeed = {
  clientSlug: string
  name: string
  description: string
  status: 'PLANNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'CLIENT_REVIEW' | 'COMPLETED' | 'CANCELLED'
  progress: number
  leadEmail?: string
  milestones: { name: string; status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLIENT_REVIEW'; progress: number }[]
}

const PROJECTS: ProjectSeed[] = [
  {
    clientSlug: 'northwind',
    name: 'Elita EV Storefront',
    description: 'Storefront and configurator for the Elita electric range.',
    status: 'IN_PROGRESS',
    progress: 64,
    leadEmail: 'arjun.rao@tvita.in',
    milestones: [
      { name: 'Discovery', status: 'COMPLETED', progress: 100 },
      { name: 'Design System', status: 'COMPLETED', progress: 100 },
      { name: 'Backend', status: 'IN_PROGRESS', progress: 55 },
      { name: 'Launch', status: 'PLANNED', progress: 0 },
    ],
  },
  {
    clientSlug: 'northwind',
    name: 'Loyalty App',
    description: 'Cross-platform rewards for in-store and online.',
    status: 'CLIENT_REVIEW',
    progress: 82,
    leadEmail: 'meera.nair@tvita.in',
    milestones: [
      { name: 'Prototype', status: 'COMPLETED', progress: 100 },
      { name: 'Beta', status: 'IN_PROGRESS', progress: 70 },
    ],
  },
  {
    clientSlug: 'elita',
    name: 'Configurator 2.0',
    description: '3D vehicle configurator with dealer integrations.',
    status: 'IN_PROGRESS',
    progress: 41,
    leadEmail: 'arjun.rao@tvita.in',
    milestones: [
      { name: 'Architecture', status: 'COMPLETED', progress: 100 },
      { name: '3D Pipeline', status: 'IN_PROGRESS', progress: 35 },
      { name: 'Dealer API', status: 'PLANNED', progress: 0 },
    ],
  },
  {
    clientSlug: 'elita',
    name: 'Dealer Portal',
    description: 'B2B portal for dealership inventory and leads.',
    status: 'PLANNED',
    progress: 8,
    leadEmail: 'meera.nair@tvita.in',
    milestones: [{ name: 'Kickoff', status: 'PLANNED', progress: 0 }],
  },
  {
    clientSlug: 'lumen',
    name: 'Patient Portal',
    description: 'Secure patient records and appointment booking.',
    status: 'IN_PROGRESS',
    progress: 55,
    leadEmail: 'sara.khan@tvita.in',
    milestones: [
      { name: 'Compliance Review', status: 'COMPLETED', progress: 100 },
      { name: 'Core Flows', status: 'IN_PROGRESS', progress: 50 },
    ],
  },
  {
    clientSlug: 'lumen',
    name: 'Clinic Ops Dashboard',
    description: 'Operations dashboard for multi-clinic schedules.',
    status: 'ON_HOLD',
    progress: 22,
    leadEmail: 'dev.patel@tvita.in',
    milestones: [{ name: 'Discovery', status: 'COMPLETED', progress: 100 }],
  },
  {
    clientSlug: 'orbit',
    name: 'KYC Onboarding',
    description: 'Video KYC and document verification flows.',
    status: 'IN_PROGRESS',
    progress: 70,
    leadEmail: 'arjun.rao@tvita.in',
    milestones: [
      { name: 'Vendor Integration', status: 'COMPLETED', progress: 100 },
      { name: 'UX Polish', status: 'IN_PROGRESS', progress: 60 },
    ],
  },
  {
    clientSlug: 'orbit',
    name: 'Risk Console',
    description: 'Internal risk scoring console for underwriters.',
    status: 'CLIENT_REVIEW',
    progress: 88,
    leadEmail: 'meera.nair@tvita.in',
    milestones: [
      { name: 'MVP', status: 'COMPLETED', progress: 100 },
      { name: 'UAT', status: 'CLIENT_REVIEW', progress: 80 },
    ],
  },
  {
    clientSlug: 'haven',
    name: 'Listing Site Redesign',
    description: 'Marketing site and property listing experience.',
    status: 'IN_PROGRESS',
    progress: 48,
    leadEmail: 'sara.khan@tvita.in',
    milestones: [
      { name: 'IA & Wireframes', status: 'COMPLETED', progress: 100 },
      { name: 'Build', status: 'IN_PROGRESS', progress: 40 },
    ],
  },
  {
    clientSlug: 'pixel',
    name: 'Agency Portfolio',
    description: 'Case-study heavy portfolio with CMS.',
    status: 'COMPLETED',
    progress: 100,
    leadEmail: 'nina.das@tvita.in',
    milestones: [{ name: 'Launch', status: 'COMPLETED', progress: 100 }],
  },
  {
    clientSlug: 'greenleaf',
    name: 'D2C Store',
    description: 'Shopify-headless D2C storefront.',
    status: 'IN_PROGRESS',
    progress: 33,
    leadEmail: 'kabir.singh@tvita.in',
    milestones: [
      { name: 'Brand Tokens', status: 'COMPLETED', progress: 100 },
      { name: 'Catalog', status: 'IN_PROGRESS', progress: 30 },
    ],
  },
  {
    clientSlug: 'nova',
    name: 'Admissions Portal',
    description: 'Parent-facing admissions and fee workflows.',
    status: 'PLANNED',
    progress: 5,
    leadEmail: 'vikram.joshi@tvita.in',
    milestones: [{ name: 'Requirements', status: 'PLANNED', progress: 0 }],
  },
  {
    clientSlug: 'atlas',
    name: 'Fleet Tracking',
    description: 'Real-time fleet map and ETA notifications.',
    status: 'IN_PROGRESS',
    progress: 59,
    leadEmail: 'dev.patel@tvita.in',
    milestones: [
      { name: 'Telemetry Ingest', status: 'COMPLETED', progress: 100 },
      { name: 'Map UI', status: 'IN_PROGRESS', progress: 45 },
    ],
  },
  {
    clientSlug: 'bloom',
    name: 'Influencer Hub',
    description: 'Campaign briefing and content approval hub.',
    status: 'CANCELLED',
    progress: 15,
    leadEmail: 'aisha.fernandes@tvita.in',
    milestones: [{ name: 'Discovery', status: 'COMPLETED', progress: 100 }],
  },
  {
    clientSlug: 'atlas',
    name: 'Warehouse WMS Lite',
    description: 'Lightweight warehouse ops for regional hubs.',
    status: 'CLIENT_REVIEW',
    progress: 76,
    leadEmail: 'meera.nair@tvita.in',
    milestones: [
      { name: 'MVP', status: 'COMPLETED', progress: 100 },
      { name: 'Pilot', status: 'CLIENT_REVIEW', progress: 70 },
    ],
  },
]

async function ensurePlans(prisma: PrismaClient) {
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
      },
    }),
    prisma.plan.upsert({
      where: { id: PLAN_GROWTH_ID },
      update: {},
      create: {
        id: PLAN_GROWTH_ID,
        name: 'Growth',
        description: 'Ideal for growing businesses.',
        price: 14999,
        currency: 'INR',
        billingCycle: 'MONTHLY',
        isActive: true,
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
      },
    }),
  ])
}

async function upsertPerson(
  prisma: PrismaClient,
  person: PersonSeed,
  passwordHash: string
) {
  const existing = await prisma.profile.findUnique({
    where: { email: person.email },
    select: { id: true },
  })
  const id = existing?.id ?? crypto.randomUUID()
  const invited = Boolean(person.invited)

  const profile = await prisma.profile.upsert({
    where: { email: person.email },
    update: {
      name: person.name,
      role: person.role,
      teamRole: person.teamRole ?? null,
      phone: person.phone ?? null,
      salary: person.salary ?? null,
      isActive: person.isActive ?? true,
      emailVerified: !invited,
      passwordHash: invited ? null : passwordHash,
      invitedAt: invited ? daysAgo(3) : null,
    },
    create: {
      id,
      email: person.email,
      name: person.name,
      role: person.role,
      teamRole: person.teamRole ?? null,
      phone: person.phone ?? null,
      salary: person.salary ?? null,
      isActive: person.isActive ?? true,
      emailVerified: !invited,
      passwordHash: invited ? null : passwordHash,
      invitedAt: invited ? daysAgo(3) : null,
    },
    select: { id: true, email: true },
  })

  if (!invited) {
    await prisma.account.upsert({
      where: {
        issuer_accountId: { issuer: CREDENTIAL_ISSUER, accountId: profile.id },
      },
      update: { password: passwordHash },
      create: {
        accountId: profile.id,
        providerId: CREDENTIAL_PROVIDER_ID,
        issuer: CREDENTIAL_ISSUER,
        userId: profile.id,
        password: passwordHash,
      },
    })
  }

  return profile
}

async function upsertClientOrg(
  prisma: PrismaClient,
  seed: ClientSeed,
  adminId: string | null,
  passwordHash: string
) {
  // Prefer existing org by email / display name for Northwind test client.
  let client = await prisma.client.findFirst({
    where: {
      OR: [{ email: seed.email }, { name: seed.displayName }],
    },
  })

  let profileId: string | null = null
  const existingProfile = await prisma.profile.findUnique({
    where: { email: seed.email },
    select: { id: true },
  })

  if (existingProfile) {
    profileId = existingProfile.id
    await prisma.profile.update({
      where: { id: profileId },
      data: {
        name: seed.contact,
        role: 'CLIENT',
        isActive: true,
        emailVerified: true,
        passwordHash,
        phone: seed.phone,
      },
    })
  } else {
    profileId = crypto.randomUUID()
    await prisma.profile.create({
      data: {
        id: profileId,
        email: seed.email,
        name: seed.contact,
        role: 'CLIENT',
        phone: seed.phone,
        isActive: true,
        emailVerified: true,
        passwordHash,
      },
    })
  }

  await prisma.account.upsert({
    where: {
      issuer_accountId: { issuer: CREDENTIAL_ISSUER, accountId: profileId },
    },
    update: { password: passwordHash },
    create: {
      accountId: profileId,
      providerId: CREDENTIAL_PROVIDER_ID,
      issuer: CREDENTIAL_ISSUER,
      userId: profileId,
      password: passwordHash,
    },
  })

  const clientData: Prisma.ClientUncheckedCreateInput = {
    clientType: 'ORGANIZATION',
    legalName: seed.legalName,
    displayName: seed.displayName,
    name: seed.displayName,
    country: seed.country,
    stateProvince: seed.state,
    city: seed.city,
    industry: seed.industry,
    contactPerson: seed.contact,
    email: seed.email,
    phone: seed.phone,
    billingEmail: seed.email,
    billingName: seed.legalName,
    billingCity: seed.city,
    billingState: seed.state,
    billingCountry: seed.country,
    currency: seed.country === 'US' ? 'USD' : 'INR',
    taxApplicable: seed.country === 'IN',
    taxRate: seed.country === 'IN' ? 18 : 0,
    gstin: seed.gstin ?? null,
    paymentTerms: 'Net 30',
    clientPriority: seed.priority,
    status: 'ACTIVE',
    onboardingStatus: 'COMPLETED',
    verificationStatus: 'VERIFIED',
    profileId,
    createdById: adminId,
    updatedById: adminId,
    accountManagerId: adminId,
    internalTags: ['seed', seed.slug],
  }

  if (client) {
    client = await prisma.client.update({
      where: { id: client.id },
      data: {
        legalName: seed.legalName,
        displayName: seed.displayName,
        name: seed.displayName,
        country: seed.country,
        stateProvince: seed.state,
        city: seed.city,
        industry: seed.industry,
        contactPerson: seed.contact,
        email: seed.email,
        phone: seed.phone,
        billingEmail: seed.email,
        billingName: seed.legalName,
        billingCity: seed.city,
        billingState: seed.state,
        billingCountry: seed.country,
        currency: seed.country === 'US' ? 'USD' : 'INR',
        taxApplicable: seed.country === 'IN',
        taxRate: seed.country === 'IN' ? 18 : 0,
        gstin: seed.gstin ?? null,
        clientPriority: seed.priority,
        status: 'ACTIVE',
        onboardingStatus: 'COMPLETED',
        verificationStatus: 'VERIFIED',
        updatedById: adminId,
        accountManagerId: adminId,
        internalTags: ['seed', seed.slug],
        profileId,
      },
    })
  } else {
    client = await prisma.client.create({ data: clientData })
  }

  const existingSub = await prisma.subscription.findFirst({
    where: { clientId: client.id, planId: seed.planId },
  })
  if (!existingSub) {
    await prisma.subscription.create({
      data: {
        clientId: client.id,
        planId: seed.planId,
        status: 'ACTIVE',
        startDate: daysAgo(60),
        renewalDate: daysFromNow(30),
        createdById: adminId,
      },
    })
  }

  return client
}

async function ensureProject(
  prisma: PrismaClient,
  seed: ProjectSeed,
  clientId: string,
  peopleByEmail: Map<string, string>,
  adminId: string | null
) {
  const existing = await prisma.project.findFirst({
    where: { clientId, name: seed.name },
    select: { id: true },
  })
  if (existing) return existing.id

  const leadId = seed.leadEmail ? peopleByEmail.get(seed.leadEmail) ?? null : null
  const project = await prisma.project.create({
    data: {
      clientId,
      name: seed.name,
      description: seed.description,
      status: seed.status,
      progress: seed.progress,
      startDate: daysAgo(90),
      endDate: daysFromNow(60),
      leadId,
      createdById: adminId,
      milestones: {
        create: seed.milestones.map((m, i) => ({
          name: m.name,
          status: m.status,
          progress: m.progress,
          sortOrder: i,
          clientVisible: m.status === 'COMPLETED',
          createdById: adminId,
        })),
      },
      updates: {
        create: {
          title: 'Progress update',
          content: `Seeded status: ${seed.status.replace(/_/g, ' ').toLowerCase()} at ${seed.progress}%.`,
          authorId: leadId ?? adminId,
          clientVisible: true,
        },
      },
    },
    select: { id: true },
  })

  const memberIds = [leadId, peopleByEmail.get('sara.khan@tvita.in'), peopleByEmail.get('dev.patel@tvita.in')]
    .filter(Boolean) as string[]
  for (const profileId of [...new Set(memberIds)]) {
    await prisma.projectMember.upsert({
      where: { projectId_profileId: { projectId: project.id, profileId } },
      update: {},
      create: { projectId: project.id, profileId, role: 'MEMBER' },
    })
  }

  return project.id
}

function invoiceAmounts(subtotal: number, taxRate = 18) {
  const taxAmount = Math.round((subtotal * taxRate) / 100)
  const amount = subtotal + taxAmount
  return { subtotal, taxAmount, taxRate, amount }
}

async function seedBilling(
  prisma: PrismaClient,
  clients: { id: string; slug: string; currency: string }[],
  projectsByClient: Map<string, string[]>,
  adminId: string | null
) {
  let invoiceSeq = 2400

  for (const client of clients) {
    const projectIds = projectsByClient.get(client.slug) ?? []
    const specs: {
      status: 'PAID' | 'PENDING' | 'OVERDUE' | 'DRAFT'
      subtotal: number
      daysIssued: number
      dueOffset: number
    }[] = [
      { status: 'PAID', subtotal: 185000, daysIssued: 75, dueOffset: -45 },
      { status: 'PAID', subtotal: 92000, daysIssued: 40, dueOffset: -10 },
      { status: 'PENDING', subtotal: 145000, daysIssued: 12, dueOffset: 18 },
      { status: 'OVERDUE', subtotal: 68000, daysIssued: 50, dueOffset: -20 },
      { status: 'DRAFT', subtotal: 110000, daysIssued: 2, dueOffset: 28 },
    ]

    for (const spec of specs) {
      invoiceSeq += 1
      const invoiceNo = `TVT-SEED-${invoiceSeq}`
      const existing = await prisma.invoice.findUnique({ where: { invoiceNo } })
      if (existing) continue

      const amts = invoiceAmounts(spec.subtotal, client.currency === 'USD' ? 0 : 18)
      const issuedDate = daysAgo(spec.daysIssued)
      const dueDate = daysFromNow(spec.dueOffset)
      const paid = spec.status === 'PAID'
      const projectId = projectIds[invoiceSeq % Math.max(projectIds.length, 1)] ?? null

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNo,
          clientId: client.id,
          projectId,
          ...amts,
          currency: client.currency,
          status: spec.status,
          issuedDate,
          dueDate,
          paidDate: paid ? daysAgo(Math.max(spec.daysIssued - 5, 1)) : null,
          amountPaid: paid ? amts.amount : 0,
          amountDue: paid ? 0 : amts.amount,
          taxType: client.currency === 'USD' ? 'EXPORT' : 'INTRA_STATE',
          cgstAmount: client.currency === 'INR' ? amts.taxAmount / 2 : 0,
          sgstAmount: client.currency === 'INR' ? amts.taxAmount / 2 : 0,
          igstAmount: 0,
          placeOfSupply: 'Maharashtra',
          notes: 'Seeded invoice for Admin UI preview.',
          lineItems: [
            {
              description: 'Professional services',
              quantity: 1,
              rate: spec.subtotal,
              amount: spec.subtotal,
            },
          ],
          createdById: adminId,
        },
      })

      if (paid) {
        await prisma.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: amts.amount,
            currency: client.currency,
            status: 'SUCCEEDED',
            paidAt: invoice.paidDate ?? new Date(),
            stripePaymentId: `seed_pay_${invoice.id.slice(0, 8)}`,
          },
        })
      }
    }
  }
}

async function seedQuotes(prisma: PrismaClient, clients: { id: string; slug: string }[]) {
  const quotes = [
    { slug: 'lumen', title: 'Telehealth Module', budget: 320000, status: 'PENDING' },
    { slug: 'haven', title: 'CRM Integration', budget: 150000, status: 'COUNTER_OFFERED', counter: 175000 },
    { slug: 'bloom', title: 'Launch Campaign Site', budget: 90000, status: 'ACCEPTED' },
    { slug: 'greenleaf', title: 'Warehouse App', budget: 210000, status: 'REJECTED' },
    { slug: 'nova', title: 'Parent App Phase 2', budget: 280000, status: 'PENDING' },
  ]

  for (const q of quotes) {
    const client = clients.find((c) => c.slug === q.slug)
    if (!client) continue

    const messages = [
      {
        senderRole: 'CLIENT',
        senderName: 'Client',
        status: 'PENDING',
        text: 'Please share a revised proposal for this scope.',
        timestamp: daysAgo(5).toISOString(),
      },
    ]

    const existing = await prisma.quote.findFirst({
      where: { clientId: client.id, title: q.title },
    })
    if (existing) {
      await prisma.quote.update({
        where: { id: existing.id },
        data: { messages },
      })
      continue
    }

    await prisma.quote.create({
      data: {
        clientId: client.id,
        title: q.title,
        description: `Client-submitted quote request for ${q.title}.`,
        budget: q.budget,
        currency: 'INR',
        status: q.status,
        counterBudget: q.counter ?? null,
        counterMessage: q.counter ? 'We can deliver with expanded QA coverage at this budget.' : null,
        lastCounterBy: q.counter ? 'ADMIN' : null,
        messages,
      },
    })
  }
}

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!connectionString) {
    console.error('❌ DIRECT_URL / DATABASE_URL is not set.')
    process.exit(1)
  }

  const pool = new pg.Pool({ connectionString })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, BCRYPT_ROUNDS)

  try {
    console.log('🌱 Seeding agency demo data…\n')

    await ensurePlans(prisma)
    console.log('  ✓ Plans ready')

    let admin = await prisma.profile.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true, email: true },
    })
    if (!admin) {
      admin = await upsertPerson(
        prisma,
        { email: 'admin@tvita.in', name: 'Test Admin', role: 'ADMIN', salary: 180000 },
        passwordHash
      )
      console.log('  ✓ Created default admin@tvita.in')
    }

    const peopleByEmail = new Map<string, string>()
    peopleByEmail.set(admin.email, admin.id)

    for (const person of PEOPLE) {
      const p = await upsertPerson(prisma, person, passwordHash)
      peopleByEmail.set(p.email, p.id)
    }
    console.log(`  ✓ People upserted (${PEOPLE.length})`)

    const clientRecords: { id: string; slug: string; currency: string }[] = []
    for (const seed of CLIENTS) {
      const client = await upsertClientOrg(prisma, seed, admin.id, passwordHash)
      clientRecords.push({
        id: client.id,
        slug: seed.slug,
        currency: seed.country === 'US' ? 'USD' : 'INR',
      })
    }
    console.log(`  ✓ Clients upserted (${CLIENTS.length})`)

    const projectsByClient = new Map<string, string[]>()
    for (const seed of PROJECTS) {
      const client = clientRecords.find((c) => c.slug === seed.clientSlug)
      if (!client) continue
      const projectId = await ensureProject(prisma, seed, client.id, peopleByEmail, admin.id)
      const list = projectsByClient.get(seed.clientSlug) ?? []
      list.push(projectId)
      projectsByClient.set(seed.clientSlug, list)
    }
    console.log(`  ✓ Projects ensured (${PROJECTS.length})`)

    await seedBilling(prisma, clientRecords, projectsByClient, admin.id)
    console.log('  ✓ Invoices & payments seeded')

    await seedQuotes(prisma, clientRecords)
    console.log('  ✓ Quotes seeded')

    console.log('\n✅ Agency seed complete.')
    console.log(`   Demo password for seeded logins: ${DEMO_PASSWORD}`)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((e) => {
  console.error('❌ Seed error:', e)
  process.exit(1)
})
