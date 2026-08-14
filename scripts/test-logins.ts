import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { createClient } from '@supabase/supabase-js'

async function testLogins() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const testAccounts = [
    { email: 'darekarshubham2005@gmail.com', pass: 'AdminPassword123!' },
    { email: 'admin@tvita.dev', pass: 'AdminPassword123!' },
  ]

  for (const acc of testAccounts) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.pass,
    })
    if (error) {
      console.error('❌ Login failed for:', acc.email, error.message)
    } else {
      console.log('✅ Login SUCCESS for:', acc.email, 'User ID:', data.user.id)
      const profile = await prisma.profile.findUnique({ where: { id: data.user.id } })
      console.log('   Profile in DB:', profile ? `Found (Role: ${profile.role}, Name: ${profile.name})` : 'NOT FOUND!')
    }
  }
}

testLogins()
  .catch(console.error)
  .finally(() => process.exit(0))
