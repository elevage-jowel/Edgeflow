'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface WinRateDonutProps {
  wins: number
  losses: number
  breakevens: number
  height?: number
}

const COLORS = { win: '#22c55e', loss: '#ef4444', be: '#64748b' }

export function WinRateDonut({ wins, losses, breakevens, height = 180 }: WinRateDonutProps) {
  const data = [
    { name: 'Wins', value: wins, color: COLORS.win },
    { name: 'Losses', value: losses, color: COLORS.loss },
    ...(breakevens > 0 ? [{ name: 'Breakeven', value: breakevens, color: COLORS.be }] : []),
  ].filter(d => d.value > 0)

  const total = wins + losses + breakevens
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0'

  return (
    <div className="relative flex items-center justify-center">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius="55%" outerRadius="75%" paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0]
              return (
                <div className="bg-surface-700 border border-surface-500 rounded-xl px-3 py-2 shadow-card">
                  <div className="text-xs text-slate-500">{p.name}</div>
                  <div className="text-sm font-bold text-white">{p.value} trades</div>
                </div>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-2xl font-bold text-white font-mono">{winRate}%</div>
        <div className="text-xs text-slate-500">win rate</div>
      </div>
    </div>
  )
}
