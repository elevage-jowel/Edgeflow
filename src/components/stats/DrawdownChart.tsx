'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Card, CardTitle } from '@/components/ui/Card'
import type { EquityPoint } from '@/types'

interface Props {
  equityCurve: EquityPoint[]
}

export function DrawdownChart({ equityCurve }: Props) {
  if (equityCurve.length === 0)
    return (
      <Card>
        <CardTitle>Drawdown</CardTitle>
        <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data</div>
      </Card>
    )

  let peak = 0
  const data = equityCurve.map(({ date, equity }) => {
    if (equity > peak) peak = equity
    const drawdown = peak > 0 ? ((peak - equity) / peak) * 100 : 0
    return { date, drawdown: Math.round(drawdown * 100) / 100 }
  })

  return (
    <Card>
      <CardTitle>Drawdown (%)</CardTitle>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            reversed
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Drawdown']}
          />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="#f43f5e"
            strokeWidth={2}
            fill="url(#ddGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}
