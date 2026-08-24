'use client'

import { useEffect, useState, Suspense } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'

function VerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')
  const next = searchParams.get('next') || '/'

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(() => {
    return (!token || !email) ? 'error' : 'loading'
  })
  const [errorMsg, setErrorMsg] = useState(() => {
    return (!token || !email) ? 'Invalid verification link. Token or email is missing.' : ''
  })

  useEffect(() => {
    if (!token || !email) return

    let isMounted = true

    const doSignIn = async () => {
      try {
        const res = await fetch('/api/auth/magic-link/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, token }),
        })

        if (!isMounted) return

        if (!res.ok) {
          setStatus('error')
          setErrorMsg('This link is invalid or has expired. Please request a new one.')
          toast.error('Verification failed')
        } else {
          setStatus('success')
          toast.success('Successfully authenticated!')
          router.push(next)
        }
      } catch (err) {
        if (!isMounted) return
        setStatus('error')
        setErrorMsg('An unexpected error occurred. Please try again.')
      }
    }

    doSignIn()

    return () => {
      isMounted = false
    }
  }, [token, email, next, router])

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-6)' }}>
        {/* Logo */}
        <div className="auth-logo" style={{ justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
          <Image src="/logo.webp" alt="Tvita" width={40} height={40} priority />
          <span className="auth-logo__name">Tvita</span>
        </div>

        {status === 'loading' && (
          <div>
            <h1 className="auth-title">Verifying your link...</h1>
            <p className="auth-subtitle">Please wait while we log you in securely.</p>
            <div style={{
              margin: 'var(--space-6) auto 0',
              width: '40px',
              height: '40px',
              border: '3px solid var(--border-light)',
              borderTopColor: 'var(--accent-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        )}

        {status === 'success' && (
          <div>
            <h1 className="auth-title">Verified!</h1>
            <p className="auth-subtitle">Redirecting you to your destination...</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <h1 className="auth-title" style={{ color: 'var(--status-failed, #ef4444)' }}>Verification Failed</h1>
            <p className="auth-subtitle" style={{ marginBottom: 'var(--space-6)' }}>{errorMsg}</p>
            <a href="/login" className="btn btn--primary w-full">
              Back to Login
            </a>
          </div>
        )}

        <style jsx global>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="auth-page"><div className="auth-card">Loading...</div></div>}>
      <VerifyForm />
    </Suspense>
  )
}
