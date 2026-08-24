'use client'

import { createBrowserClient } from '@supabase/ssr'

import { env } from '@/lib/config/env'

// ─── BROWSER ONLY (Client Components) ────────────────────────────────────────

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY
  )
}

