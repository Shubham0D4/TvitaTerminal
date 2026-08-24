import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import { env } from '@/lib/config/env'

// ─── SERVER ONLY (App Router Server Components + Route Handlers) ─────────────

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — safe to ignore
          }
        },
      },
    }
  )
}

export function createSupabaseAdminClient() {
  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

