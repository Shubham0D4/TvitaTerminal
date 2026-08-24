/**
 * Resolves the application base URL for magic links and email redirects.
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL / APP_URL / BASE_URL environment variable
 * 2. Incoming Request Origin / Host header
 * 3. Fallback to http://localhost:3000
 */
import { env } from '@/lib/config/env'

export function getAppBaseUrl(req?: Request): string {
  const envUrl = env.APP_URL
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '')
  }

  if (req) {
    const origin = req.headers.get('origin')
    if (origin && origin !== 'null') {
      return origin.replace(/\/+$/, '')
    }

    const host = req.headers.get('host')
    if (host) {
      const proto = req.headers.get('x-forwarded-proto') || 'http'
      return `${proto}://${host}`.replace(/\/+$/, '')
    }
  }

  return 'http://localhost:3000'
}
