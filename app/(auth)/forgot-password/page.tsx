'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, MailCheck } from 'lucide-react'
import toast from 'react-hot-toast'

import { validateEmailField } from '@/lib/validation'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [touched, setTouched] = useState(false)

  const emailError = validateEmailField(email)
  const showEmailError = touched && emailError !== null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (emailError) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        setSent(true)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-flat">
      <Link href="/login" className="auth-flat__back-circle" aria-label="Back to sign in">
        <ChevronLeft size={20} strokeWidth={2} />
      </Link>

      <div className="auth-flat__main">
        <div className="auth-flat__shell">
          <div className="auth-flat__icon">
            {sent ? (
              <span className="auth-flat__icon-badge">
                <MailCheck size={28} strokeWidth={1.75} />
              </span>
            ) : (
              <Image src="/favicon.webp" alt="" width={64} height={64} priority />
            )}
          </div>

          <h1 className="auth-flat__title">{sent ? 'Check your email' : 'Reset password'}</h1>
          <p className="auth-flat__subtitle" key={String(sent)}>
            {sent ? (
              <>
                We sent a reset link to <strong>{email}</strong>
              </>
            ) : (
              "Enter your email and we'll send you a reset link"
            )}
          </p>

          {!sent && (
            <form onSubmit={handleSubmit} className="auth-flat__form">
              <div className="form-group">
                <div className="auth-flat__label-row">
                  <label className="form-label" htmlFor="email">
                    Email address <span>*</span>
                  </label>
                </div>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  aria-invalid={showEmailError}
                  aria-describedby={showEmailError ? 'email-error' : undefined}
                  required
                  autoComplete="email"
                  autoFocus
                />
                {showEmailError && (
                  <p className="form-error" id="email-error">
                    {emailError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className={`btn btn--primary btn--lg w-full auth-flat__submit${loading ? ' btn--loading' : ''}`}
                disabled={loading || showEmailError}
              >
                {loading ? '' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>
      </div>

      <footer className="auth-flat__footer">
        © {new Date().getFullYear()} Tvita. All rights reserved.
      </footer>
    </div>
  )
}
