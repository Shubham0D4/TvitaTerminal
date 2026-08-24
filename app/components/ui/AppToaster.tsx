'use client'

import { Toaster, ToastBar, toast } from 'react-hot-toast'
import { Check, X, Info } from 'lucide-react'

const TOAST_DURATION_MS = 4000
const ERROR_DURATION_MS = 5000

/**
 * Global toast host.
 *
 * Visual properties are set inline because react-hot-toast applies its own
 * inline defaults to the toast element, which a stylesheet rule would lose to.
 * Layout of the inner parts is handled by the `.toast__*` classes.
 */
export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      // Newest lands at the top of the stack, nearest the corner.
      reverseOrder={false}
      gutter={12}
      containerStyle={{ top: 20, right: 20 }}
      toastOptions={{
        duration: TOAST_DURATION_MS,
        error: { duration: ERROR_DURATION_MS },
        className: 'toast',
        style: {
          maxWidth: '420px',
          padding: '12px 14px',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 10px 30px rgba(10, 10, 10, 0.10), 0 2px 6px rgba(10, 10, 10, 0.05)',
          fontFamily: 'var(--font-display)',
          fontSize: '0.875rem',
          fontWeight: 500,
          lineHeight: 1.45,
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ message }) => (
            <>
              <span
                className={`toast__icon toast__icon--${t.type === 'success' ? 'success' : t.type === 'error' ? 'error' : 'info'}`}
                aria-hidden="true"
              >
                {t.type === 'success' ? (
                  <Check size={13} strokeWidth={3.5} />
                ) : t.type === 'error' ? (
                  <X size={13} strokeWidth={3.5} />
                ) : (
                  <Info size={13} strokeWidth={3} />
                )}
              </span>

              <div className="toast__message">{message}</div>

              {t.type !== 'loading' && (
                <button
                  type="button"
                  className="toast__dismiss"
                  onClick={() => toast.dismiss(t.id)}
                  aria-label="Dismiss notification"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              )}
            </>
          )}
        </ToastBar>
      )}
    </Toaster>
  )
}
