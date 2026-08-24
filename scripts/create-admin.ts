/**
 * scripts/create-admin.ts
 * Provisions (or updates) a single ADMIN account.
 *
 * Better Auth authenticates against `accounts.password` with the bcrypt hasher
 * configured in lib/auth/config.ts, while parts of the app still read
 * `profiles.password_hash`. Both are written here so sign-in works and the
 * legacy readers stay consistent.
 *
 * Run with:
 *   npx tsx --env-file=.env scripts/create-admin.ts
 *   npx tsx --env-file=.env scripts/create-admin.ts you@example.com 'S3cret!'
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

/** Must match BCRYPT_ROUNDS in lib/auth/config.ts. */
const BCRYPT_ROUNDS = 10

/** Better Auth's provider id for email + password credentials. */
const CREDENTIAL_PROVIDER_ID = 'credential'

/** Better Auth resolves credentials by (issuer, accountId); see createLocalAccountIssuer(). */
const CREDENTIAL_ISSUER = `local:${CREDENTIAL_PROVIDER_ID}`

const DEFAULT_EMAIL = 'admin@tvita.in'
const DEFAULT_PASSWORD = 'Admin@12345'
const DEFAULT_NAME = 'Test Admin'

async function main() {
  const [emailArg, passwordArg, nameArg] = process.argv.slice(2)

  const email = (emailArg || DEFAULT_EMAIL).trim().toLowerCase()
  const password = passwordArg || DEFAULT_PASSWORD
  const name = nameArg || DEFAULT_NAME

  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!connectionString) {
    console.error('❌ DIRECT_URL / DATABASE_URL is not set.')
    process.exit(1)
  }

  const pool = new pg.Pool({ connectionString })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  try {
    const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS)

    const profile = await prisma.$transaction(async (tx) => {
      const existing = await tx.profile.findUnique({
        where: { email },
        select: { id: true },
      })

      const profileId = existing?.id ?? crypto.randomUUID()

      const saved = await tx.profile.upsert({
        where: { email },
        update: {
          name,
          role: 'ADMIN',
          teamRole: null,
          isActive: true,
          emailVerified: true,
          passwordHash,
        },
        create: {
          id: profileId,
          email,
          name,
          role: 'ADMIN',
          isActive: true,
          emailVerified: true,
          passwordHash,
        },
        select: { id: true, email: true, name: true, role: true },
      })

      // The row Better Auth actually checks on sign-in.
      await tx.account.upsert({
        where: {
          issuer_accountId: {
            issuer: CREDENTIAL_ISSUER,
            accountId: saved.id,
          },
        },
        update: { password: passwordHash },
        create: {
          accountId: saved.id,
          providerId: CREDENTIAL_PROVIDER_ID,
          issuer: CREDENTIAL_ISSUER,
          userId: saved.id,
          password: passwordHash,
        },
      })

      return saved
    })

    console.log('\n✅ Admin account ready\n')
    console.log(`   Email    : ${profile.email}`)
    console.log(`   Password : ${password}`)
    console.log(`   Name     : ${profile.name}`)
    console.log(`   Role     : ${profile.role}`)
    console.log(`   Id       : ${profile.id}\n`)
    console.log('   Sign in at /login\n')
  } catch (error) {
    console.error('❌ Failed to create admin:', error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()
