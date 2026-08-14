import 'dotenv/config'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL })

async function main() {
  console.log('🔄 Executing DDL Schema Migration...')

  const client = await pool.connect()

  try {
    // 1. Create TeamRole enum if not exists
    console.log('  Creating TeamRole enum...')
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "TeamRole" AS ENUM ('TEAM_LEAD', 'DEVELOPER', 'TESTER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    // 2. Add team_role to profiles
    console.log('  Adding team_role column to profiles...')
    await client.query(`
      ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "team_role" "TeamRole";
    `)

    // 3. Update TaskStatus enum values
    console.log('  Updating TaskStatus enum variants...')
    const taskStatusVariants = ['READY_FOR_TESTING', 'IN_TESTING', 'CHANGES_REQUIRED']
    for (const variant of taskStatusVariants) {
      await client.query(`
        ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS '${variant}';
      `)
    }

    // 4. Update MilestoneStatus enum values
    console.log('  Updating MilestoneStatus enum variants...')
    const milestoneStatusVariants = ['PLANNED', 'CLIENT_REVIEW', 'APPROVED']
    for (const variant of milestoneStatusVariants) {
      await client.query(`
        ALTER TYPE "MilestoneStatus" ADD VALUE IF NOT EXISTS '${variant}';
      `)
    }

    // 5. Add developer_id and tester_id to tasks
    console.log('  Adding developer_id and tester_id to tasks...')
    await client.query(`
      ALTER TABLE "tasks" 
        ADD COLUMN IF NOT EXISTS "developer_id" UUID REFERENCES "profiles"("id") ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS "tester_id" UUID REFERENCES "profiles"("id") ON DELETE SET NULL;
    `)

    // 6. Add pdf_url to invoices if missing
    console.log('  Adding pdf_url column to invoices...')
    await client.query(`
      ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "pdf_url" TEXT;
    `)

    console.log('✅ DDL Schema Migration completed successfully!')
  } catch (err) {
    console.error('❌ DDL Migration error:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
