'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/client'
import toast from 'react-hot-toast'

export default function ChangePasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        toast.error(error.message || 'Failed to update password.')
        setLoading(false)
        return
      }

      toast.success('Password updated successfully!')
      setPassword('')
      setConfirmPassword('')
      setLoading(false)
    } catch {
      toast.error('Something went wrong updating your password.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="form-group">
        <label className="form-label" htmlFor="new-password">New Password <span>*</span></label>
        <input
          id="new-password"
          type="password"
          className="form-input"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="confirm-password">Confirm New Password <span>*</span></label>
        <input
          id="confirm-password"
          type="password"
          className="form-input"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
        <button
          type="submit"
          className={`btn btn--primary${loading ? ' btn--loading' : ''}`}
          disabled={loading}
        >
          {loading ? '' : 'Update Password'}
        </button>
      </div>
    </form>
  )
}
