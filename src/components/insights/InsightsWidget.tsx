'use client'
import { useMemo } from 'react'
import { useTradeStore } from '@/lib/stores/tradeStore'
import { generateInsights, Insight } from '@/lib/scoring/insights'
import { cn } from '@/lib/utils/cn'
import { Lightbulb } from 'lucide-react'

const TYPE_STYLES: Record<Insight['type'], string> = {
  positive: 'border-emerald-500/20 bg-emerald-500/5',
  negative: 'border-red-500/20 bg-red-500/5',
  warning:  'border-amber-500/20 bg-amber-500/5',
  neutral:  'border-surface-500/50 bg-surface-700/30',
}
const TYPE_VALUE: Record<Insight['type'], string> = {
  positive: 'text-emerald-400',
  negative: 'text-red-400',
  warning:  'text-amber-400',
  neutral:  'text-slate-300',
}

export function InsightsWidget() {
  const { trades } = useTradeStore()
  const insights = useMemo(() => generateInsights(trades), [trades])

  if (insights.length === 0) return null

  return (
    <div className="bg-surface-800 rounded-2xl border border-surface-500 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-brand-600 via-violet-600 to-cyan-500" />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Insights</h3>
          <span className="ml-auto text-xs text-slate-500">Basé sur tes trades</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {insights.map(insight => (
            <div key={insight.id} className={cn('rounded-xl border p-3', TYPE_STYLES[insight.type])}>
              <div className="flex items-start gap-2 mb-1.5">
                <span className="text-lg leading-none">{insight.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-500 font-medium">{insight.title}</div>
                  <div className={cn('text-sm font-bold truncate', TYPE_VALUE[insight.type])}>{insight.value}</div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{insight.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
