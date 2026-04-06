'use client'
import { TradeVerification } from '@/lib/types'
import { ScoreGauge } from './ScoreGauge'
import { cn } from '@/lib/utils/cn'
import { CheckCircle2, XCircle, Zap, Star } from 'lucide-react'

interface ScoreCardProps {
  verification: TradeVerification
  compact?: boolean
}

const CLASS_CONFIG = {
  in_plan: {
    label: 'In Plan',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    glow: 'shadow-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: '✅',
  },
  partial: {
    label: 'Partial',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    glow: 'shadow-amber-500/10',
    border: 'border-amber-500/20',
    icon: '⚠️',
  },
  out_of_plan: {
    label: 'Out of Plan',
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    glow: 'shadow-red-500/10',
    border: 'border-red-500/20',
    icon: '❌',
  },
}

export function ScoreCard({ verification, compact = false }: ScoreCardProps) {
  const cfg = CLASS_CONFIG[verification.scoreClass]
  const passed = verification.criteria.filter(c => c.passed)
  const missed = verification.criteria.filter(c => !c.passed)

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 p-3 bg-surface-700/50 rounded-xl border', cfg.border)}>
        <ScoreGauge score={verification.score} size={52} strokeWidth={5} showLabel={false} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', cfg.badge)}>{cfg.icon} {cfg.label}</span>
            <span className="text-xs text-slate-500">{verification.planName}</span>
          </div>
          <p className="text-xs text-slate-400 truncate">{verification.summary}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-bold text-amber-400">+{verification.totalPoints} pts</div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'bg-surface-800 rounded-2xl border shadow-xl overflow-hidden',
      cfg.border, cfg.glow
    )}>
      {/* Header gradient band */}
      <div className="h-1 w-full bg-gradient-to-r from-brand-600 via-violet-600 to-cyan-500" />

      <div className="p-6">
        {/* Top row: gauge + status */}
        <div className="flex items-start gap-5 mb-5">
          <ScoreGauge score={verification.score} size={96} strokeWidth={7} />

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={cn('inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full border', cfg.badge)}>
                {cfg.icon} {cfg.label}
              </span>
              <span className="text-xs text-slate-500 bg-surface-700/60 px-2 py-1 rounded-full">
                {verification.planName} plan
              </span>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-3">{verification.summary}</p>

            {/* Points earned */}
            <div className="flex items-center gap-3 flex-wrap">
              {verification.pointsAwarded > 0 && (
                <div className="flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full">
                  <Star className="w-3 h-3" />
                  <span>{verification.pointsAwarded} base pts</span>
                </div>
              )}
              {verification.bonusPoints > 0 && (
                <div className="flex items-center gap-1.5 text-xs bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2.5 py-1 rounded-full">
                  <Zap className="w-3 h-3" />
                  <span>+{verification.bonusPoints} bonus</span>
                </div>
              )}
              {verification.totalPoints > 0 && (
                <div className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold">
                  <span>= {verification.totalPoints} pts total</span>
                </div>
              )}
              {verification.streakAtTime >= 2 && (
                <div className="flex items-center gap-1.5 text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded-full">
                  🔥 <span>{verification.streakAtTime} streak</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Criteria list */}
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Criteria breakdown
          </div>
          {verification.criteria.map(c => (
            <div
              key={c.criterionId}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg border transition-all',
                c.passed
                  ? 'bg-emerald-500/5 border-emerald-500/15'
                  : 'bg-red-500/5 border-red-500/15'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {c.passed
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  : <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                }
                <span className={cn('text-sm truncate', c.passed ? 'text-slate-200' : 'text-slate-400')}>
                  {c.label}
                </span>
              </div>
              <span className={cn('text-xs font-mono shrink-0 ml-3',
                c.passed ? 'text-emerald-400' : 'text-slate-600'
              )}>
                {c.passed ? `+${c.weight}` : `0/${c.weight}`}
              </span>
            </div>
          ))}
        </div>

        {/* Summary bar */}
        <div className="mt-4 pt-4 border-t border-surface-600">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>{passed.length}/{verification.criteria.length} criteria passed</span>
            <span>{verification.score}/100 pts</span>
          </div>
          <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                verification.score >= 80 ? 'bg-emerald-500' :
                verification.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: `${verification.score}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
