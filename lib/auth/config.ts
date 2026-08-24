import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { magicLink } from 'better-auth/plugins/magic-link'
import bcrypt from 'bcryptjs'

import { prisma } from '@/lib/prisma'

/**
 * Sentinel callback URL marking a server-initiated magic link that is consumed
 * immediately in-process, so no email should be sent for it.
 */
export const INTERNAL_EXCHANGE_CALLBACK = '/__internal/magic-link-exchange'

/** Matches the cost factor used by the existing seed/reset scripts. */
const BCRYPT_ROUNDS = 10

/** Sessions live for 30 days, mirroring the previous NextAuth `maxAge`. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/**
 * Signed-cookie cache so `proxy.ts` can authorize a request without a database
 * round-trip on every navigation. Short-lived so role changes take effect fast.
 */
const SESSION_COOKIE_CACHE_SECONDS = 5 * 60

/**
 * Better Auth server instance.
 *
 * `Profile` is reused as the user model rather than introducing a parallel
 * `user` table, so every existing foreign key onto `profiles` keeps working.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,

  emailAndPassword: {
    enabled: true,
    // Accounts are provisioned by admins/seed scripts — never self-service.
    disableSignUp: true,
    minPasswordLength: 8,
    /**
     * Existing hashes in `profiles.password_hash` are bcrypt, while Better Auth
     * defaults to scrypt. Overriding both sides keeps every current password
     * valid instead of locking users out behind a forced reset.
     */
    password: {
      hash: (password) => bcrypt.hash(password, BCRYPT_ROUNDS),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },

  user: {
    modelName: 'profile',
    fields: {
      // Better Auth calls this `image`; the schema has always called it `avatarUrl`.
      image: 'avatarUrl',
    },
    additionalFields: {
      // Surfaced on the session for routing/RBAC. `input: false` prevents a
      // client from ever submitting these and escalating its own privileges.
      role: { type: 'string', input: false },
      teamRole: { type: 'string', required: false, input: false },
      isActive: { type: 'boolean', input: false },
    },
  },

  session: {
    modelName: 'session',
    expiresIn: SESSION_MAX_AGE_SECONDS,
    cookieCache: {
      enabled: true,
      maxAge: SESSION_COOKIE_CACHE_SECONDS,
    },
  },

  account: { modelName: 'account' },
  verification: { modelName: 'verification' },

  plugins: [
    /**
     * Backs the invite / passwordless flow. Links minted by the legacy
     * `profiles.magic_link_token` columns are exchanged for a real Better Auth
     * session by `app/api/auth/magic-link/exchange/route.ts`, which suppresses
     * the outbound email via INTERNAL_EXCHANGE_CALLBACK.
     */
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        if (url.includes(INTERNAL_EXCHANGE_CALLBACK)) return
        const { sendEmail } = await import('@/lib/email')
        await sendEmail({
          to: email,
          subject: 'Your Tvita sign-in link',
          html: `<p>Click below to sign in. This link expires shortly.</p>
                 <p><a href="${url}">Sign in to Tvita</a></p>`,
        })
      },
    }),
    // Must stay last so Better Auth can write Set-Cookie from server actions.
    nextCookies(),
  ],
})

export type Auth = typeof auth
