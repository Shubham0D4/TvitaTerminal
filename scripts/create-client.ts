/**
 * scripts/create-client.ts
 * Provisions one fully-populated test client, including a CLIENT-role login
 * for the client portal and a couple of contacts.
 *
 * Every column on the Client model is filled so admin screens, invoices and
 * PDF templates can be exercised without hitting empty fields.
 *
 * Run with:
 *   npm run client:create
 *   npx tsx --env-file=.env scripts/create-client.ts
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

/** Must match BCRYPT_ROUNDS in lib/auth/config.ts. */
const BCRYPT_ROUNDS = 10
const CREDENTIAL_PROVIDER_ID = 'credential'
const CREDENTIAL_ISSUER = `local:${CREDENTIAL_PROVIDER_ID}`

const CLIENT_EMAIL = 'client@tvita.in'
const CLIENT_PASSWORD = 'Pass1234'
const CLIENT_CONTACT_NAME = 'Ananya Iyer'
const COMPANY_DISPLAY_NAME = 'Northwind Retail'

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!connectionString) {
    console.error('❌ DIRECT_URL / DATABASE_URL is not set.')
    process.exit(1)
  }

  const pool = new pg.Pool({ connectionString })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  try {
    const passwordHash = bcrypt.hashSync(CLIENT_PASSWORD, BCRYPT_ROUNDS)

    // Attribute ownership to an admin when one exists.
    const admin = await prisma.profile.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
    })

    const result = await prisma.$transaction(async (tx) => {
      // ── Portal login for the client ─────────────────────────────────────
      const existingProfile = await tx.profile.findUnique({
        where: { email: CLIENT_EMAIL },
        select: { id: true },
      })
      const profileId = existingProfile?.id ?? crypto.randomUUID()

      const profile = await tx.profile.upsert({
        where: { email: CLIENT_EMAIL },
        update: {
          name: CLIENT_CONTACT_NAME,
          role: 'CLIENT',
          isActive: true,
          emailVerified: true,
          passwordHash,
        },
        create: {
          id: profileId,
          email: CLIENT_EMAIL,
          name: CLIENT_CONTACT_NAME,
          role: 'CLIENT',
          phone: '+91 98200 41122',
          isActive: true,
          emailVerified: true,
          passwordHash,
        },
        select: { id: true },
      })

      // The row Better Auth checks on sign-in.
      await tx.account.upsert({
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

      // ── The client record, every column populated ───────────────────────
      const clientData = {
        // 1. Basic
        clientType: 'ORGANIZATION' as const,
        legalName: 'Northwind Retail Private Limited',
        displayName: COMPANY_DISPLAY_NAME,
        name: COMPANY_DISPLAY_NAME,
        country: 'IN',
        stateProvince: 'Maharashtra',
        city: 'Pune',
        timezone: 'Asia/Kolkata',
        industry: 'Retail & E-commerce',
        website: 'https://northwindretail.example.com',

        // 2. Contact
        contactPerson: CLIENT_CONTACT_NAME,
        designation: 'Head of Digital',
        email: CLIENT_EMAIL,
        phone: '+91 98200 41122',
        whatsapp: '+91 98200 41122',
        preferredComm: 'email',

        // 3. Address
        address: 'Level 4, Amar Tech Park, Balewadi, Pune 411045',
        registeredAddress: 'Unit 12, Northwind House, Baner Road, Pune 411045',
        billingCity: 'Pune',
        billingState: 'Maharashtra',
        billingCountry: 'IN',
        postalCode: '411045',

        // 4. Legal & registration
        entityType: 'Private Limited',
        registrationNo: 'U52100PN2019PTC188221',
        countryOfRegistration: 'IN',
        taxId: 'AAFCN9021K',
        pan: 'AAFCN9021K',
        gstin: '27AAFCN9021K1ZP',
        vatNumber: 'IN27AAFCN9021K',
        authorizedRep: 'Rohit Deshmukh',

        // 5. Billing & tax
        billingName: 'Northwind Retail Private Limited',
        billingEmail: 'accounts@northwindretail.example.com',
        currency: 'INR',
        taxApplicable: true,
        taxRate: 18.0,
        poRequired: true,
        poNumber: 'PO-NW-2026-0184',
        paymentTerms: 'Net 30',

        // 6. Payment
        paymentMethod: 'bank_transfer',
        paymentReference: 'HDFC •••• 4471',
        paymentProvider: 'HDFC Bank',
        paymentInstructions: 'Remit to HDFC Bank, Baner branch. Quote the PO number on every transfer.',
        txnFeeResponsibility: 'client',

        // 7. Internal / admin
        clientSource: 'referral',
        externalPlatformUrl: 'https://northwind.slack.com/archives/C08TVITA',
        clientPriority: 'HIGH' as const,
        accountManagerId: admin?.id ?? null,
        internalTags: ['retainer', 'enterprise', 'q3-renewal'],
        internalNotes: 'Renewal conversation due in September. Finance prefers consolidated monthly invoicing.',
        riskLevel: 'LOW' as const,

        // 8. System / status
        status: 'ACTIVE' as const,
        onboardingStatus: 'COMPLETED' as const,
        verificationStatus: 'VERIFIED' as const,
        profileId: profile.id,
        createdById: admin?.id ?? null,
        updatedById: admin?.id ?? null,
      }

      const existingClient = await tx.client.findFirst({
        where: { profileId: profile.id },
        select: { id: true },
      })

      const client = existingClient
        ? await tx.client.update({ where: { id: existingClient.id }, data: clientData })
        : await tx.client.create({ data: clientData })

      // ── Contacts ────────────────────────────────────────────────────────
      await tx.clientContact.deleteMany({ where: { clientId: client.id } })
      await tx.clientContact.createMany({
        data: [
          {
            clientId: client.id,
            name: CLIENT_CONTACT_NAME,
            role: 'Primary',
            designation: 'Head of Digital',
            email: CLIENT_EMAIL,
            phone: '+91 98200 41122',
            isDecisionMaker: true,
          },
          {
            clientId: client.id,
            name: 'Rohit Deshmukh',
            role: 'Finance',
            designation: 'Finance Controller',
            email: 'accounts@northwindretail.example.com',
            phone: '+91 98200 41133',
            isDecisionMaker: false,
          },
          {
            clientId: client.id,
            name: 'Priya Nair',
            role: 'Technical',
            designation: 'IT Manager',
            email: 'it@northwindretail.example.com',
            phone: '+91 98200 41144',
            isDecisionMaker: false,
          },
        ],
      })

      return { client, profileId: profile.id }
    })

    const contactCount = await prisma.clientContact.count({
      where: { clientId: result.client.id },
    })

    console.log('\n✅ Test client ready\n')
    console.log(`   Company   : ${result.client.legalName}`)
    console.log(`   Status    : ${result.client.status} / ${result.client.onboardingStatus} / ${result.client.verificationStatus}`)
    console.log(`   GSTIN     : ${result.client.gstin}   Terms: ${result.client.paymentTerms}`)
    console.log(`   Contacts  : ${contactCount}`)
    console.log(`   Client id : ${result.client.id}\n`)
    console.log('   Portal login')
    console.log(`   Email     : ${CLIENT_EMAIL}`)
    console.log(`   Password  : ${CLIENT_PASSWORD}\n`)
  } catch (error) {
    console.error('❌ Failed to create client:', error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()
