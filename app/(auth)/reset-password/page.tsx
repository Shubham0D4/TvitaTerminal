'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, Eye, EyeOff, LoaderCircle, TriangleAlert } from 'lucide-react'
import toast from 'react-hot-toast'

import { getSession } from '@/lib/auth/client'
import { validateNewPasswordField, validatePasswordConfirmField } from '@/lib/validation'

const MIN_PASSWORD_LENGTH = 8
const REDIRECT_DELAY_MS = 1500

function ResetPasswordForm() {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)

  // Errors surface only after a field has been left, so typing isn't nagged at.
  const [touched, setTouched] = useState({ password: false, confirm: false })

  useEffect(() => {
    async function initSession() {
      try {
        const { data: session } = await getSession()
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

  const passwordError = validateNewPasswordField(password)
  const confirmError = validatePasswordConfirmField(password, confirm)
  const showPasswordError = touched.password && passwordError !== null
  const showConfirmError = touched.confirm && confirmError !== null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    setTouched({ password: true, confirm: true })
    if (passwordError || confirmError) return

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
        toast.success('Password set successfully! Redirecting to sign in...')
        setTimeout(() => {
          router.push('/login?message=Password%20updated%20successfully.%20Please%20log%20in.')
        }, REDIRECT_DELAY_MS)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="auth-flat">
        <div className="auth-flat__main">
          <div className="auth-flat__shell">
            <div className="auth-flat__icon">
              <Image src="/favicon.webp" alt="" width={64} height={64} priority />
            </div>
            <h1 className="auth-flat__title">Verifying your link</h1>
            <p className="auth-flat__subtitle auth-flat__subtitle--tight">
              <LoaderCircle size={16} strokeWidth={2} className="auth-flat__spinner" />
              Checking your security token
            </p>
          </div>
        </div>

        <footer className="auth-flat__footer">
          © {new Date().getFullYear()} Tvita. All rights reserved.
        </footer>
      </div>
    )
  }

  if (sessionError) {
    return (
      <div className="auth-flat">
        <Link href="/login" className="auth-flat__back-circle" aria-label="Back to sign in">
          <ChevronLeft size={20} strokeWidth={2} />
        </Link>

        <div className="auth-flat__main">
          <div className="auth-flat__shell">
            <div className="auth-flat__icon">
              <span className="auth-flat__icon-badge auth-flat__icon-badge--danger">
                <TriangleAlert size={28} strokeWidth={1.75} />
              </span>
            </div>

            <h1 className="auth-flat__title">Link expired or invalid</h1>
            <p className="auth-flat__subtitle">{sessionError}</p>

            <Link href="/forgot-password" className="btn btn--primary btn--lg w-full auth-flat__submit">
              Request a new link
            </Link>
          </div>
        </div>

        <footer className="auth-flat__footer">
          © {new Date().getFullYear()} Tvita. All rights reserved.
        </footer>
      </div>
    )
  }

  return (
    <div className="auth-flat">
      <Link href="/login" className="auth-flat__back-circle" aria-label="Back to sign in">
        <ChevronLeft size={20} strokeWidth={2} />
      </Link>

      <div className="auth-flat__main">
        <div className="auth-flat__shell">
          <div className="auth-flat__icon">
            <Image src="/favicon.webp" alt="" width={64} height={64} priority />
          </div>

          <h1 className="auth-flat__title">Set your password</h1>
          <p className="auth-flat__subtitle">Create a password to finish setting up your account</p>

          <form onSubmit={handleSubmit} className="auth-flat__form">
            <div className="form-group">
              <div className="auth-flat__label-row">
                <label className="form-label" htmlFor="password">
                  New password <span>*</span>
                </label>
              </div>
              <div className="auth-flat__field">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  aria-invalid={showPasswordError}
                  aria-describedby={showPasswordError ? 'password-error' : undefined}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  autoFocus
                />
                <button
                  type="button"
                  className="auth-flat__reveal"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} strokeWidth={1.75} /> : <Eye size={20} strokeWidth={1.75} />}
                </button>
              </div>
              {showPasswordError && (
                <p className="form-error" id="password-error">
                  {passwordError}
                </p>
              )}
            </div>

            <div className="form-group">
              <div className="auth-flat__label-row">
                <label className="form-label" htmlFor="confirm">
                  Confirm password <span>*</span>
                </label>
              </div>
              <div className="auth-flat__field">
                <input
                  id="confirm"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, confirm: true }))}
                  aria-invalid={showConfirmError}
                  aria-describedby={showConfirmError ? 'confirm-error' : undefined}
                  required
                  autoComplete="new-password"
                />
              </div>
              {showConfirmError && (
                <p className="form-error" id="confirm-error">
                  {confirmError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className={`btn btn--primary btn--lg w-full auth-flat__submit${loading ? ' btn--loading' : ''}`}
              disabled={loading || showPasswordError || showConfirmError}
            >
              {loading ? '' : 'Set password'}
            </button>
          </form>
        </div>
      </div>

      <footer className="auth-flat__footer">
        © {new Date().getFullYear()} Tvita. All rights reserved.
      </footer>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="auth-flat" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
