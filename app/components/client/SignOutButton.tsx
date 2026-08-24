'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import toast from 'react-hot-toast'

import { signOut } from '@/lib/auth/client'

/**
 * Sign-out control for the client portal.
 *
 * Lives on the Profile page since the header no longer carries an account
 * menu — without it there would be no way to sign out.
 */
export default function SignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await signOut()
      // refresh() clears cached RSC payloads so no stale session data lingers.
      router.push('/login')
      router.refresh()
    } catch {
      toast.error('Could not sign out. Please try again.')
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      className="client-signout"
      onClick={handleSignOut}
      disabled={loading}
    >
      <LogOut size={16} strokeWidth={2} />
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
