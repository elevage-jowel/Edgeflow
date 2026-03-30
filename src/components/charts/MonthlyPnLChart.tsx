'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatCurrency } from '@/lib/utils/formatters'
import { format, parseISO } from 'date-fns'

interface MonthlyPnLChartProps {
  data: { month: string; pnl: number; trades: number }[]
  height?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-700 border border-surface-500 rounded-xl px-3 py-2.5">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-sm font-bold font-mono ${payload[0].value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {payload[0].value >= 0 ? '+' : ''}{formatCurrency(payload[0].value)}
      </div>
    </div>
  )
}

export function MonthlyPnLChart({ data, height = 200 }: MonthlyPnLChartProps) {
  const formatted = data.map(d => ({
    ...d,
    label: format(parseISO(d.month + '-01'), 'MMM yy'),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={formatted} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#252a3a" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
          {formatted.map((entry, i) => (
            <Cell key={i} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
