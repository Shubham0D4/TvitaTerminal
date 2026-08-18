import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { env } from '@/config/application/env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = env.DATABASE_URL
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  })

  // Prevent unhandled background error events when idle pool connections are reset by PgBouncer / Supabase
  pool.on('error', (err) => {
    console.error('Prisma PG Pool idle connection error:', err?.message || err)
  })

  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma


