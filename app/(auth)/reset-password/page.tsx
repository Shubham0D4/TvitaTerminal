'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    async function initSession() {
      try {
        // 1. Check if user already has an active session
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setVerifying(false)
          return
        }

        // 2. Check if PKCE code parameter is present in URL
        const code = searchParams.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error('[reset-password] Code exchange error:', error)
            setSessionError('The link is invalid or has expired. Please request a new link.')
          }
          setVerifying(false)
          return
        }

        // 3. Check hash parameters (implicit flow fallback)
        if (window.location.hash.includes('access_token')) {
          // Supabase JS auto-parses token in hash
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
              setVerifying(false)
            }
          })
          setTimeout(() => {
            setVerifying(false)
            subscription.unsubscribe()
          }, 1500)
          return
        }

        setVerifying(false)
      } catch (err) {
        console.error('[reset-password] Error initializing session:', err)
        setVerifying(false)
      }
    }

    initSession()
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Auth session missing or link expired. Please request a new invite/reset link.')
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Password set successfully! Redirecting to login...')
        setTimeout(() => {
          router.push('/login?message=Password%20updated%20successfully.%20Please%20log%20in.')
        }, 1500)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="auth-logo" style={{ justifyContent: 'center' }}>
            <div className="auth-logo__mark">T</div>
            <span className="auth-logo__name">Tvita</span>
          </div>
          <p className="auth-subtitle" style={{ marginTop: '16px' }}>Verifying security token...</p>
        </div>
      </div>
    )
  }

  if (sessionError) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h1 className="auth-title">Link Expired or Invalid</h1>
          <p className="auth-subtitle">{sessionError}</p>
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link href="/forgot-password" className="btn btn--primary">
              Request password reset
            </Link>
            <Link href="/login" className="btn btn--secondary">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo__mark">T</div>
          <span className="auth-logo__name">Tvita</span>
        </div>

        <h1 className="auth-title">Set your password</h1>
        <p className="auth-subtitle">Create a password for your account to sign in</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="password">New password <span>*</span></label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm">Confirm password <span>*</span></label>
            <input
              id="confirm"
              type="password"
              className="form-input"
              placeholder="Repeat new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          {password && confirm && password !== confirm && (
            <p className="form-error">Passwords do not match</p>
          )}

          <button
            type="submit"
            className={`btn btn--primary btn--lg w-full${loading ? ' btn--loading' : ''}`}
            disabled={loading}
          >
            {loading ? '' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="auth-page"><div className="auth-card">Loading...</div></div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
