'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatCurrency } from '@/lib/utils/formatters'

interface DayOfWeekChartProps {
  data: { day: string; pnl: number; trades: number; winRate: number }[]
  height?: number
}

export function DayOfWeekChart({ data, height = 200 }: DayOfWeekChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#252a3a" vertical={false} />
        <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={d => d.slice(0, 3)} />
        <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload
            return (
              <div className="bg-surface-700 border border-surface-500 rounded-xl px-3 py-2.5">
                <div className="text-xs text-slate-500 mb-1">{d.day}</div>
                <div className={`text-sm font-bold font-mono ${d.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {d.pnl >= 0 ? '+' : ''}{formatCurrency(d.pnl)}
                </div>
                <div className="text-xs text-slate-500">{d.trades} trades · {d.winRate.toFixed(0)}% win</div>
              </div>
            )
          }}
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
        />
        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
