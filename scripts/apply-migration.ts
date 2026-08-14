import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import pg from 'pg'

async function applyMigration() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!connectionString) {
    console.error('No connection string found.')
    process.exit(1)
  }

  const pool = new pg.Pool({ connectionString })
  const sql = fs.readFileSync(path.join(process.cwd(), 'prisma/migrations_init.sql'), 'utf-8')

  console.log('🚀 Executing DDL migrations on database...')
  try {
    await pool.query(sql)
    console.log('✅ Database schema created successfully!')
  } catch (err) {
    console.error('❌ Migration Error:', err)
  } finally {
    await pool.end()
  }
}

applyMigration()
