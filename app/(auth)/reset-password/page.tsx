'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSession } from 'next-auth/react'
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
    async function initSession() {
      try {
        const session = await getSession()
        if (session?.user) {
          setVerifying(false)
        } else {
          setSessionError('Please request a new reset link. No active session found.')
          setVerifying(false)
        }
      } catch (err) {
        console.error('[reset-password] Error initializing session:', err)
        setSessionError('Verification failed. Please try again.')
        setVerifying(false)
      }
    }

    initSession()
  }, [])

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
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (data.error) {
        toast.error(data.error)
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
            <img src="/logo.png" alt="Tvita Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
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
          <img src="/logo.png" alt="Tvita Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
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
