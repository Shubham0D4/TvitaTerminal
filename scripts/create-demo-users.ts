import 'dotenv/config'
import { prisma } from '../lib/prisma'
import type { TeamRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

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
    teamRole: 'MEMBER' as TeamRole,
    name: 'Amit Patel (Team Member)',
  },
  {
    email: 'tester@tvita.dev',
    password: DEFAULT_PASSWORD,
    role: 'TEAM_MEMBER',
    teamRole: 'MEMBER' as TeamRole,
    name: 'Neha Gupta (Team Member)',
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
  console.log('🔑 Provisioning local demo users with password:', DEFAULT_PASSWORD)

  for (const user of USERS) {
    const existing = await prisma.profile.findUnique({
      where: { email: user.email },
    })

    const userId = existing?.id || crypto.randomUUID()
    const passwordHash = bcrypt.hashSync(user.password, 10)

    // Sync profile in public.profiles table
    await prisma.profile.upsert({
      where: { email: user.email },
      update: {
        id: userId,
        role: user.role as any,
        teamRole: user.teamRole,
        name: user.name,
        isActive: true,
        passwordHash,
      },
      create: {
        id: userId,
        email: user.email,
        role: user.role as any,
        teamRole: user.teamRole,
        name: user.name,
        isActive: true,
        passwordHash,
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
