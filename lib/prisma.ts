import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { env } from '@/lib/config/env'

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

const baseClient = globalForPrisma.prisma ?? createPrismaClient()

// TEMPORARY INSTRUMENTATION — logs one line per query so per-request counts
// can be measured. Removed once the audit is done.
const instrumented = baseClient.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const started = Date.now()
        const result = await query(args)
        try {
          const fs = await import('fs')
          fs.appendFileSync(
            '/tmp/qlog.txt',
            `${Date.now()}\t${model}.${operation}\t${Date.now() - started}ms\n`,
          )
        } catch {}
        return result
      },
    },
  },
}) as unknown as PrismaClient

export const prisma = instrumented

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = baseClient
}


