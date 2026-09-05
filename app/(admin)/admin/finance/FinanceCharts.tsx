'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const ACCENT = '#0b57d0'
const SUCCESS = '#1e6b50'
const WARNING = '#ea580c'
const MUTED = '#94a3b8'
const PIE_COLORS = [SUCCESS, ACCENT, WARNING, '#64748b', '#e5484d']

type TrendPoint = { month: string; collected: number; invoiced: number }
type StatusPoint = { name: string; value: number; amount: number }
type ClientPoint = { name: string; amount: number }
type AgingPoint = { bucket: string; amount: number; count: number }

function formatINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`
  return `₹${n.toLocaleString('en-IN')}`
}

const tooltipStyle = {
  background: '#fff',
  border: '1px solid rgba(0,45,114,0.12)',
  borderRadius: 12,
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(16,28,107,0.08)',
}

export function RevenueTrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return <ChartEmpty label="No monthly invoice activity yet" />
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="finCollected" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SUCCESS} stopOpacity={0.25} />
            <stop offset="100%" stopColor={SUCCESS} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="finInvoiced" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.2} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,45,114,0.08)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatINR} tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={56} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => formatINR(Number(value ?? 0))}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="invoiced"
          name="Invoiced"
          stroke={ACCENT}
          fill="url(#finInvoiced)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="collected"
          name="Collected"
          stroke={SUCCESS}
          fill="url(#finCollected)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function StatusBreakdownChart({ data }: { data: StatusPoint[] }) {
  const filtered = data.filter((d) => d.value > 0)
  if (filtered.length === 0) return <ChartEmpty label="No invoices to categorize" />

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={58}
          outerRadius={90}
          paddingAngle={3}
        >
          {filtered.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name, item) => {
            const amount = (item?.payload as StatusPoint | undefined)?.amount ?? 0
            return [`${value} inv · ${formatINR(amount)}`, String(name)]
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function TopClientsChart({ data }: { data: ClientPoint[] }) {
  if (data.length === 0) return <ChartEmpty label="No client revenue yet" />

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,45,114,0.08)" horizontal={false} />
        <XAxis type="number" tickFormatter={formatINR} tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          tick={{ fontSize: 11, fill: '#334155' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatINR(Number(value ?? 0))} />
        <Bar dataKey="amount" name="Collected" fill={ACCENT} radius={[0, 8, 8, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function AgingChart({ data }: { data: AgingPoint[] }) {
  if (data.every((d) => d.amount === 0)) return <ChartEmpty label="No outstanding receivables" />

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,45,114,0.08)" vertical={false} />
        <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatINR} tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={56} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, _name, item) => {
            const count = (item?.payload as AgingPoint | undefined)?.count ?? 0
            return [`${formatINR(Number(value ?? 0))} · ${count} inv`, 'Outstanding']
          }}
        />
        <Bar dataKey="amount" fill={WARNING} radius={[8, 8, 0, 0]} barSize={36} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="fin__chart-empty">
      <p>{label}</p>
    </div>
  )
}
