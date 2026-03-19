'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts'
import { Card, CardTitle } from '@/components/ui/Card'
import type { DailyPnl } from '@/types'

interface Props {
  data: DailyPnl[]
}

export function WinLossChart({ data }: Props) {
  if (data.length === 0)
    return (
      <Card>
        <CardTitle>Daily P&L</CardTitle>
        <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data</div>
      </Card>
    )

  const shown = data.slice(-60)

  return (
    <Card>
      <CardTitle>Daily P&L (last {shown.length} days)</CardTitle>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={shown} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            formatter={(v) => [`$${Number(v).toFixed(2)}`, 'P&L']}
          />
          <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
            {shown.map((entry, i) => (
              <Cell key={i} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
