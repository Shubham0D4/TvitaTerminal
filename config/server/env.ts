import { z } from 'zod'

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  THIRD_PARTY_API_KEY: z.string().optional(),
  GMAIL_WEBHOOK_SECRET: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('tvita-documents'),
})

let serverEnv: z.infer<typeof serverEnvSchema>

if (typeof window === 'undefined') {
  const result = serverEnvSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GMAIL_USER: process.env.GMAIL_USER,
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    THIRD_PARTY_API_KEY: process.env.THIRD_PARTY_API_KEY,
    GMAIL_WEBHOOK_SECRET: process.env.GMAIL_WEBHOOK_SECRET,
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET,
  })

  if (!result.success) {
    console.error('❌ Invalid server environment configuration:', result.error.format())
    throw new Error('Invalid server environment configuration')
  }
  serverEnv = result.data
} else {
  // Return dummy proxy in client environment to prevent compilation crashes
  // while ensuring server keys are never exposed.
  serverEnv = new Proxy({} as any, {
    get() {
      throw new Error('Attempted to access server environment variables on the client side.')
    },
  })
}

export { serverEnv }
