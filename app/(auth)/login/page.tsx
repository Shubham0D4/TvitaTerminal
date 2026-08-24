'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { signIn } from '@/lib/auth/client'
import { validateCurrentPasswordField, validateEmailField } from '@/lib/validation'
import toast from 'react-hot-toast'

const DEFAULT_REDIRECT = '/'

/** How long the card swap takes; focus lands once it has settled. */
const STEP_TRANSITION_MS = 260

/** Email is collected first, then the password on a second step. */
type Step = 'email' | 'password'

function LoginForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || DEFAULT_REDIRECT

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Errors surface only after a field has been left, so typing isn't nagged at.
  const [touched, setTouched] = useState({ email: false, password: false })

  const emailInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  const isPasswordStep = step === 'password'

  const emailError = validateEmailField(email)
  const passwordError = validateCurrentPasswordField(password)
  const showEmailError = touched.email && emailError !== null
  const showPasswordError = touched.password && passwordError !== null

  // Focus whichever card is on top, after its transition finishes.
  useEffect(() => {
    const target = isPasswordStep ? passwordInputRef.current : emailInputRef.current
    const timer = window.setTimeout(() => target?.focus(), STEP_TRANSITION_MS)
    return () => window.clearTimeout(timer)
  }, [isPasswordStep])

  const returnToEmailStep = () => {
    setStep('email')
    setPassword('')
    setShowPassword(false)
    setTouched((prev) => ({ ...prev, password: false }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    // Step one only advances the form. Deliberately no server-side check that
    // the address exists — that would let anyone enumerate valid accounts.
    if (step === 'email') {
      setTouched((prev) => ({ ...prev, email: true }))
      if (emailError) return
      setStep('password')
      return
    }

    setTouched((prev) => ({ ...prev, password: true }))
    if (passwordError) return

    setLoading(true)
    try {
      const { error } = await signIn.email({ email: email.trim(), password })

      if (error) {
        toast.error('Invalid email or password')
        setLoading(false)
        return
      }

      toast.success('Welcome back!')
      // Full navigation so the new session cookie is picked up server-side.
      window.location.href = redirect
    } catch {
      toast.error('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-flat">
      <div className="auth-flat__main">
        <div className="auth-flat__shell">
          <div className="auth-flat__icon">
            <Image src="/favicon.webp" alt="" width={64} height={64} priority />
          </div>

          <h1 className="auth-flat__title">Welcome back</h1>
          <p className="auth-flat__subtitle" key={step}>
            {isPasswordStep ? 'Enter your password to continue' : 'Sign in to your account to continue'}
          </p>

          <form onSubmit={handleSubmit} className="auth-flat__form">
            <div className="form-group">
              <div className="auth-flat__label-row">
                <label className="form-label" htmlFor={isPasswordStep ? 'password' : 'email'}>
                  {isPasswordStep ? 'Password' : 'Email address'} <span>*</span>
                </label>
                <a
                  href="/forgot-password"
                  className={`auth-flat__link${isPasswordStep ? '' : ' is-hidden'}`}
                  tabIndex={isPasswordStep ? 0 : -1}
                  aria-hidden={!isPasswordStep}
                >
                  Forgot password?
                </a>
              </div>

              {/*
                Both fields stay mounted so the swap can animate. The inactive
                card tucks behind the active one, peeking along the bottom.
              */}
              <div className={`login-stack${isPasswordStep ? ' is-password' : ''}`}>
                <div className="login-stack__card login-stack__card--password">
                  <input
                    ref={passwordInputRef}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                    aria-invalid={showPasswordError}
                    aria-describedby={showPasswordError ? 'password-error' : undefined}
                    required={isPasswordStep}
                    tabIndex={isPasswordStep ? 0 : -1}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="auth-flat__reveal"
                    onClick={() => setShowPassword((visible) => !visible)}
                    tabIndex={isPasswordStep ? 0 : -1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={20} strokeWidth={1.75} /> : <Eye size={20} strokeWidth={1.75} />}
                  </button>
                </div>

                <div className="login-stack__card login-stack__card--email">
                  <input
                    ref={emailInputRef}
                    id="email"
                    type="email"
                    className="form-input"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                    aria-invalid={showEmailError}
                    aria-describedby={showEmailError ? 'email-error' : undefined}
                    required
                    tabIndex={isPasswordStep ? -1 : 0}
                    autoComplete="email"
                  />
                  {/* Shows the address in the strip left exposed below the
                      password card, where the input's own centred text can't reach. */}
                  <span className="login-stack__peek" aria-hidden="true">
                    {email}
                  </span>

                  {/* Only the sliver below the password card is clickable. */}
                  <button
                    type="button"
                    className="login-stack__return"
                    onClick={returnToEmailStep}
                    tabIndex={isPasswordStep ? 0 : -1}
                    aria-hidden={!isPasswordStep}
                    aria-label={email ? `Change email address, currently ${email}` : 'Change email address'}
                    title="Change email address"
                  />
                </div>
              </div>

              {isPasswordStep
                ? showPasswordError && (
                    <p className="form-error" id="password-error">
                      {passwordError}
                    </p>
                  )
                : showEmailError && (
                    <p className="form-error" id="email-error">
                      {emailError}
                    </p>
                  )}
            </div>

            <button
              type="submit"
              className={`btn btn--primary btn--lg w-full auth-flat__submit${loading ? ' btn--loading' : ''}`}
              disabled={loading}
            >
              {loading ? '' : isPasswordStep ? 'Sign in' : 'Continue'}
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-flat" />}>
      <LoginForm />
    </Suspense>
  )
}
