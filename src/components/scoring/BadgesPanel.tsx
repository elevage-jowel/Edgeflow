'use client'
import { Badge } from '@/lib/types'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/formatters'

interface BadgesPanelProps {
  badges: Badge[]
  className?: string
}

const CATEGORY_LABELS = {
  live: 'Live Trading',
  backtest: 'Backtesting',
  rank: 'Ranks',
}

export function BadgesPanel({ badges, className }: BadgesPanelProps) {
  const grouped = (['rank', 'live', 'backtest'] as const).map(cat => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    badges: badges.filter(b => b.category === cat),
  }))

  return (
    <div className={cn('space-y-6', className)}>
      {grouped.map(({ category, label, badges }) => (
        <div key={category}>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{label}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {badges.map(b => (
              <div
                key={b.id}
                className={cn(
                  'relative flex flex-col items-center text-center p-4 rounded-xl border transition-all',
                  b.unlocked
                    ? 'bg-surface-700/60 border-surface-500/60 shadow-md'
                    : 'bg-surface-800/40 border-surface-600/30 opacity-40 grayscale'
                )}
              >
                {b.unlocked && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                )}
                <div className="text-3xl mb-2">{b.icon}</div>
                <div className={cn('text-xs font-bold mb-1', b.unlocked ? 'text-white' : 'text-slate-500')}>
                  {b.name}
                </div>
                <div className="text-[10px] text-slate-500 leading-relaxed">{b.description}</div>
                {b.unlocked && b.earnedAt && (
                  <div className="mt-2 text-[10px] text-emerald-400/70">
                    Earned {formatDate(b.earnedAt, 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
