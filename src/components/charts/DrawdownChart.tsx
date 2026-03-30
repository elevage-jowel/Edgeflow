'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils/formatters'

interface DrawdownChartProps {
  equityCurve: { date: string; value: number }[]
  height?: number
}

export function DrawdownChart({ equityCurve, height = 200 }: DrawdownChartProps) {
  let peak = 0
  const data = equityCurve.map(d => {
    if (d.value > peak) peak = d.value
    const dd = peak > 0 ? ((d.value - peak) / peak) * 100 : 0
    return { date: d.date.slice(5, 10), drawdown: parseFloat(dd.toFixed(2)) }
  })

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#252a3a" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tickFormatter={v => `${v.toFixed(0)}%`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            return (
              <div className="bg-surface-700 border border-surface-500 rounded-xl px-3 py-2 shadow-card">
                <div className="text-xs text-slate-500">{payload[0].payload.date}</div>
                <div className="text-sm font-bold font-mono text-red-400">{typeof payload[0].value === 'number' ? payload[0].value.toFixed(2) : payload[0].value}%</div>
              </div>
            )
          }}
        />
        <Area type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={1.5} fill="url(#ddGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
