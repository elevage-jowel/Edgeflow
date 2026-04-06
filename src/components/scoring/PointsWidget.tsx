'use client'
import { UserPoints, UserLevel } from '@/lib/types'
import { LEVEL_CONFIG } from '@/lib/scoring/planEngine'
import { cn } from '@/lib/utils/cn'
import { Flame, Zap, TrendingUp } from 'lucide-react'

interface PointsWidgetProps {
  points: UserPoints
  className?: string
}

function LevelBar({ level, total }: { level: UserLevel; total: number }) {
  const cfg = LEVEL_CONFIG[level]
  const progress = Math.min(((total - cfg.min) / (cfg.max - cfg.min)) * 100, 100)

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={cn('text-xs font-bold', cfg.color)}>{cfg.icon} {cfg.label}</span>
        <span className="text-xs text-slate-500">{total.toLocaleString()} pts</span>
      </div>
      <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-brand-600 to-violet-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-slate-600">{cfg.min.toLocaleString()}</span>
        <span className="text-[10px] text-slate-600">{cfg.max >= 10000 ? '∞' : cfg.max.toLocaleString()}</span>
      </div>
    </div>
  )
}

export function PointsWidget({ points, className }: PointsWidgetProps) {
  const recentBadges = points.badges.filter(b => b.unlocked).slice(0, 6)
  const cfg = LEVEL_CONFIG[points.level]

  return (
    <div className={cn('bg-surface-800 rounded-2xl border border-surface-500 overflow-hidden', className)}>
      {/* Gradient top bar */}
      <div className="h-1 bg-gradient-to-r from-brand-600 via-violet-600 to-cyan-500" />

      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Discipline Score</h3>
            <p className="text-xs text-slate-500">Live &amp; Backtest combined</p>
          </div>
          <div className="text-2xl">{cfg.icon}</div>
        </div>

        {/* Level bar */}
        <LevelBar level={points.level} total={points.total} />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-surface-700/50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-brand-400" />
            </div>
            <div className="text-base font-bold text-white tabular-nums">{Math.round(points.avgScore30) || '—'}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Avg Score</div>
          </div>
          <div className="bg-surface-700/50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="w-3 h-3 text-orange-400" />
            </div>
            <div className="text-base font-bold text-white tabular-nums">{points.currentStreak}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Streak</div>
          </div>
          <div className="bg-surface-700/50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-3 h-3 text-amber-400" />
            </div>
            <div className="text-base font-bold text-white tabular-nums">{points.total.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Total Pts</div>
          </div>
        </div>

        {/* Live vs Backtest split */}
        <div className="mt-3 flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-surface-700/40 rounded-lg px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-400">Live</span>
            <span className="ml-auto text-xs font-bold text-white">{points.live.toLocaleString()}</span>
          </div>
          <div className="flex-1 flex items-center gap-2 bg-surface-700/40 rounded-lg px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-brand-500" />
            <span className="text-xs text-slate-400">Backtest</span>
            <span className="ml-auto text-xs font-bold text-white">{points.backtest.toLocaleString()}</span>
          </div>
        </div>

        {/* Badges */}
        {recentBadges.length > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-600">
            <div className="text-xs text-slate-500 mb-2">Recent Badges</div>
            <div className="flex flex-wrap gap-1.5">
              {recentBadges.map(b => (
                <div
                  key={b.id}
                  title={b.name}
                  className="flex items-center gap-1.5 bg-surface-700/60 border border-surface-500/50 px-2 py-1 rounded-full text-xs text-slate-300"
                >
                  <span>{b.icon}</span>
                  <span className="hidden sm:block">{b.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
