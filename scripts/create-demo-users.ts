import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '../lib/prisma'
import type { TeamRole } from '@prisma/client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const DEFAULT_PASSWORD = 'Password123!'

const USERS = [
  {
    email: 'admin@tvita.dev',
    password: DEFAULT_PASSWORD,
    role: 'ADMIN',
    teamRole: null,
    name: 'Shubham Verma (Admin)',
  },
  {
    email: 'lead@tvita.dev',
    password: DEFAULT_PASSWORD,
    role: 'TEAM_MEMBER',
    teamRole: 'TEAM_LEAD' as TeamRole,
    name: 'Rahul Sharma (Team Lead)',
  },
  {
    email: 'dev@tvita.dev',
    password: DEFAULT_PASSWORD,
    role: 'TEAM_MEMBER',
    teamRole: 'DEVELOPER' as TeamRole,
    name: 'Amit Patel (Developer)',
  },
  {
    email: 'tester@tvita.dev',
    password: DEFAULT_PASSWORD,
    role: 'TEAM_MEMBER',
    teamRole: 'TESTER' as TeamRole,
    name: 'Neha Gupta (QA Tester)',
  },
  {
    email: 'client@tvita.dev',
    password: DEFAULT_PASSWORD,
    role: 'CLIENT',
    teamRole: null,
    name: 'Rajesh Kumar (Client)',
  },
]

async function main() {
  console.log('🔑 Provisioning Supabase Auth demo users with password:', DEFAULT_PASSWORD)

  const { data: existingList } = await supabase.auth.admin.listUsers()

  for (const user of USERS) {
    const existing = existingList?.users.find((u) => u.email === user.email)

    let userId: string

    if (existing) {
      console.log(`  Updating password & metadata for existing auth user: ${user.email}`)
      userId = existing.id
      await supabase.auth.admin.updateUserById(userId, {
        password: user.password,
        user_metadata: { role: user.role, teamRole: user.teamRole, name: user.name },
        email_confirm: true,
      })
    } else {
      console.log(`  Creating new auth user: ${user.email}`)
      const { data: created, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { role: user.role, teamRole: user.teamRole, name: user.name },
      })

      if (error) {
        console.error(`  ❌ Failed to create ${user.email}:`, error.message)
        continue
      }
      userId = created.user.id
    }

    // Sync profile in public.profiles table
    await prisma.profile.upsert({
      where: { email: user.email },
      update: {
        id: userId,
        role: user.role as any,
        teamRole: user.teamRole,
        name: user.name,
        isActive: true,
      },
      create: {
        id: userId,
        email: user.email,
        role: user.role as any,
        teamRole: user.teamRole,
        name: user.name,
        isActive: true,
      },
    })

    console.log(`  ✅ ${user.role} (${user.teamRole || 'N/A'}): ${user.email} (ID: ${userId})`)
  }

  console.log('\n🎉 Demo users provisioned successfully!')
}

main()
  .catch((e) => {
    console.error('Error provisioning demo users:', e)
  })
  .finally(() => prisma.$disconnect())
