// Pure SVG circular progress ring — no dependencies
// r=45 → circumference = 2π×45 ≈ 283

interface CircularProgressProps {
  percent: number         // 0–100
  size?: number           // px, default 120
  strokeWidth?: number    // default 10
  color?: string          // CSS color, default accent-primary var
  trackColor?: string     // background ring color
  label?: string          // text below percent (e.g. "Complete")
  className?: string
}

export default function CircularProgress({
  percent,
  size = 120,
  strokeWidth = 10,
  color = '#6366f1',
  trackColor = 'rgba(99,102,241,0.12)',
  label = 'Complete',
  className = '',
}: CircularProgressProps) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const clampedPct = Math.min(100, Math.max(0, percent))
  const offset = circumference * (1 - clampedPct / 100)

  return (
    <div
      className={className}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
        aria-label={`${clampedPct}% complete`}
      >
        {/* Track ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)' }}
        />
        {/* Center text — counter-rotate since parent is rotated */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            transform: 'rotate(90deg)',
            transformOrigin: 'center',
            fontSize: size * 0.22,
            fontWeight: 700,
            fill: color,
            fontFamily: 'var(--font-family, system-ui)',
          }}
        >
          {clampedPct}%
        </text>
      </svg>
      {label && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
          {label}
        </span>
      )}
    </div>
  )
}
