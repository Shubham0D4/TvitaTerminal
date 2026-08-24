'use client'

import { createAuthClient } from 'better-auth/react'

/**
 * Browser-side Better Auth client.
 *
 * `baseURL` is intentionally omitted so the client targets the current origin,
 * which keeps preview deployments working without extra configuration.
 */
export const authClient = createAuthClient()

export const { signIn, signOut, useSession, getSession } = authClient
