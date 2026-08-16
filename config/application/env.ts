import { clientEnv } from '../client/env'
import { serverEnv } from '../server/env'

export const env = {
  get NODE_ENV() { return typeof window === 'undefined' ? serverEnv.NODE_ENV : 'production' },
  get APP_URL() { return clientEnv.NEXT_PUBLIC_APP_URL },
  get APP_NAME() { return clientEnv.NEXT_PUBLIC_APP_NAME },
  get DATABASE_URL() { return serverEnv.DATABASE_URL },
  get DIRECT_URL() { return serverEnv.DIRECT_URL || '' },
  get SUPABASE_URL() { return clientEnv.NEXT_PUBLIC_SUPABASE_URL },
  get SUPABASE_ANON_KEY() { return clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY },
  get SUPABASE_SERVICE_ROLE_KEY() { return serverEnv.SUPABASE_SERVICE_ROLE_KEY },
  get SUPABASE_STORAGE_BUCKET() { return serverEnv.SUPABASE_STORAGE_BUCKET },
  get GMAIL_USER() { return serverEnv.GMAIL_USER || '' },
  get GMAIL_APP_PASSWORD() { return serverEnv.GMAIL_APP_PASSWORD || '' },
  get STRIPE_SECRET_KEY() { return serverEnv.STRIPE_SECRET_KEY || '' },
  get STRIPE_WEBHOOK_SECRET() { return serverEnv.STRIPE_WEBHOOK_SECRET || '' },
  get THIRD_PARTY_API_KEY() { return serverEnv.THIRD_PARTY_API_KEY || '' },
  get GMAIL_WEBHOOK_SECRET() { return serverEnv.GMAIL_WEBHOOK_SECRET || '' },
} as const
