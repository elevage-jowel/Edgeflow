'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatCurrency } from '@/lib/utils/formatters'

interface EmotionData {
  emotion: string
  pnl: number
  trades: number
  winRate: number
  avgPnl: number
}

interface Props {
  data: EmotionData[]
  height?: number
  mode?: 'pnl' | 'avgPnl' | 'winRate'
}

const EMOTION_ICONS: Record<string, string> = {
  calm: '😌', focused: '🎯', confident: '💪', hesitant: '🤔',
  fearful: '😰', greedy: '🤑', frustrated: '😤', tired: '😴',
  fomo: '😱', revenge: '😡', overconfident: '🦁', distracted: '💭',
  Unknown: '❓',
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as EmotionData
  return (
    <div className="bg-surface-700 border border-surface-500 rounded-xl p-3 shadow-card text-xs space-y-1 min-w-[140px]">
      <div className="flex items-center gap-1.5 font-semibold text-white">
        <span>{EMOTION_ICONS[d.emotion] ?? '❓'}</span>
        <span className="capitalize">{d.emotion}</span>
      </div>
      <div className="text-slate-400">{d.trades} trade{d.trades !== 1 ? 's' : ''}</div>
      <div className={d.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
        Total P&L: {formatCurrency(d.pnl)}
      </div>
      <div className={d.avgPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
        Avg P&L: {formatCurrency(d.avgPnl)}
      </div>
      <div className={d.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}>
        Win Rate: {d.winRate.toFixed(0)}%
      </div>
    </div>
  )
}

export function EmotionPnLChart({ data, height = 220, mode = 'avgPnl' }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-sm" style={{ height }}>
        No emotion data available
      </div>
    )
  }

  const getValue = (d: EmotionData) => {
    if (mode === 'pnl') return d.pnl
    if (mode === 'winRate') return d.winRate
    return d.avgPnl
  }

  const formatY = (v: number) => {
    if (mode === 'winRate') return `${v.toFixed(0)}%`
    return formatCurrency(v, 'USD', true)
  }

  const chartData = data.map(d => ({
    ...d,
    label: (EMOTION_ICONS[d.emotion] ?? '❓') + ' ' + d.emotion.charAt(0).toUpperCase() + d.emotion.slice(1),
    value: getValue(d),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 40 }} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={-35}
          textAnchor="end"
          height={60}
        />
        <YAxis
          tickFormatter={formatY}
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {chartData.map((d, i) => (
            <Cell
              key={i}
              fill={d.value >= 0 ? '#10b981' : '#ef4444'}
              opacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
