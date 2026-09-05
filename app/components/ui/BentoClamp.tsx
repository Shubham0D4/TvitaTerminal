'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'

/**
 * Clamped panel body. "Show more" expands height in-flow so neighbors
 * shift down — no overlay, no overlap.
 */
export default function BentoClamp({
  children,
  maxHeight = 220,
  moreHref,
  moreLabel = 'Show more',
  lessLabel = 'Show less',
}: {
  children: ReactNode
  maxHeight?: number
  moreHref?: string
  moreLabel?: string
  lessLabel?: string
}) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return

    const measure = () => {
      if (open) {
        setOverflows(true)
        return
      }
      setOverflows(el.scrollHeight > maxHeight + 4)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [maxHeight, children, open])

  return (
    <div
      className={`bento-clamp${open ? ' is-open' : ''}${overflows ? ' has-overflow' : ''}`}
      style={{ ['--bento-clamp-max' as string]: `${maxHeight}px` }}
    >
      <div ref={bodyRef} className="bento-clamp__body">
        {children}
      </div>

      {(overflows || open) && (
        <div className="bento-clamp__footer">
          {moreHref && !open ? (
            <Link href={moreHref} className="bento-clamp__more">
              {moreLabel}
            </Link>
          ) : (
            <button
              type="button"
              className="bento-clamp__more"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? lessLabel : moreLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
