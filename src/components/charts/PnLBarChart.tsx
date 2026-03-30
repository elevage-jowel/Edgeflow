'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { formatCurrency } from '@/lib/utils/formatters'

interface PnLBarChartProps {
  data: { date: string; pnl: number; trades: number }[]
  height?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-700 border border-surface-500 rounded-xl px-3 py-2.5 shadow-card">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-sm font-bold font-mono ${payload[0].value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {payload[0].value >= 0 ? '+' : ''}{formatCurrency(payload[0].value)}
      </div>
      <div className="text-xs text-slate-500">{payload[0].payload.trades} trades</div>
    </div>
  )
}

export function PnLBarChart({ data, height = 180 }: PnLBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#252a3a" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => `$${Math.abs(v / 1000).toFixed(0)}k`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <ReferenceLine y={0} stroke="#252a3a" />
        <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
