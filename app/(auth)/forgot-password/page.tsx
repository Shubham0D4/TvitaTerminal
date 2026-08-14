'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
      })

      if (error) {
        toast.error(error.message)
      } else {
        setSent(true)
      }
    } catch {
      toast.error('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo__mark">T</div>
          <span className="auth-logo__name">Tvita</span>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ fontSize: '48px' }}>📧</div>
            <h1 className="auth-title">Check your email</h1>
            <p className="auth-subtitle">
              We sent a password reset link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
            </p>
            <Link href="/login" className="btn btn--secondary" style={{ marginTop: 'var(--space-4)' }}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="auth-title">Reset password</h1>
            <p className="auth-subtitle">Enter your email and we&apos;ll send you a reset link</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email address <span>*</span></label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className={`btn btn--primary btn--lg w-full${loading ? ' btn--loading' : ''}`}
                disabled={loading}
              >
                {loading ? '' : 'Send reset link'}
              </button>
            </form>

            <div className="divider" />

            <div style={{ textAlign: 'center' }}>
              <Link href="/login" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                ← Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
