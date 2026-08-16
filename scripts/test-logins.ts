import 'dotenv/config'
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

async function testLogins() {
  const testAccounts = [
    { email: 'shubhamd@tvita.in', pass: 'Pass1234' },
    { email: 'admin@tvita.dev', pass: 'Password123!' },
    { email: 'lead@tvita.dev', pass: 'Password123!' },
    { email: 'dev@tvita.dev', pass: 'Password123!' },
    { email: 'tester@tvita.dev', pass: 'Password123!' },
    { email: 'client@tvita.dev', pass: 'Password123!' },
  ]

  for (const acc of testAccounts) {
    const profile = await prisma.profile.findUnique({
      where: { email: acc.email },
    })

    if (!profile) {
      console.error('❌ Login failed for:', acc.email, '- Profile NOT FOUND in database!')
      continue
    }

    if (!profile.passwordHash) {
      console.error('❌ Login failed for:', acc.email, '- Password hash not set in database!')
      continue
    }

    const isValid = bcrypt.compareSync(acc.pass, profile.passwordHash)
    if (!isValid) {
      console.error('❌ Login failed for:', acc.email, '- Password mismatch!')
    } else {
      console.log('✅ Login SUCCESS for:', acc.email, 'User ID:', profile.id, `(Role: ${profile.role}, Name: ${profile.name})`)
    }
  }
}

testLogins()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
