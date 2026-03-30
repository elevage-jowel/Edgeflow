'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { formatCurrency, formatShortDate } from '@/lib/utils/formatters'

interface EquityCurveChartProps {
  data: { date: string; value: number; pnl: number }[]
  height?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div className="bg-surface-700 border border-surface-500 rounded-xl px-3 py-2.5 shadow-card">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-sm font-bold font-mono ${val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {formatCurrency(val)}
      </div>
      {payload[1] && (
        <div className={`text-xs font-mono mt-0.5 ${payload[1].value >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {payload[1].value >= 0 ? '+' : ''}{formatCurrency(payload[1].value)} trade
        </div>
      )}
    </div>
  )
}

export function EquityCurveChart({ data, height = 220 }: EquityCurveChartProps) {
  const isPositive = (data[data.length - 1]?.value ?? 0) >= 0
  const color = isPositive ? '#22c55e' : '#ef4444'
  const gradId = `ecGrad_${isPositive ? 'green' : 'red'}`

  const formatted = data.map(d => ({
    ...d,
    date: formatShortDate(d.date),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#252a3a" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="#252a3a" strokeDasharray="4 4" />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 4, fill: color, stroke: '#0d0e14', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
