'use client'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'

interface HeatmapEntry {
  day: number  // 0=Sun, 1=Mon … 5=Fri, 6=Sat
  hour: number // 0-23
  pnl: number
  trades: number
  winRate: number
}

interface HeatmapChartProps {
  data: HeatmapEntry[]
  mode?: 'pnl' | 'winRate' | 'trades'
}

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
// Show only trading hours (6-22) to avoid a huge empty grid
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 06:00 → 22:00

function cellColor(value: number, max: number, mode: 'pnl' | 'winRate' | 'trades'): string {
  if (mode === 'trades') {
    if (max === 0) return 'bg-surface-700'
    const pct = value / max
    if (pct === 0) return 'bg-surface-700'
    if (pct < 0.25) return 'bg-brand-900/60'
    if (pct < 0.5) return 'bg-brand-700/70'
    if (pct < 0.75) return 'bg-brand-600/80'
    return 'bg-brand-500'
  }
  if (mode === 'winRate') {
    if (value === 0) return 'bg-surface-700'
    if (value >= 70) return 'bg-emerald-500/80'
    if (value >= 55) return 'bg-emerald-700/60'
    if (value >= 45) return 'bg-amber-600/50'
    if (value >= 30) return 'bg-red-700/60'
    return 'bg-red-500/70'
  }
  // pnl
  if (value === 0) return 'bg-surface-700'
  if (max === 0) return 'bg-surface-700'
  const pct = Math.abs(value) / max
  if (value > 0) {
    if (pct < 0.2) return 'bg-emerald-900/50'
    if (pct < 0.5) return 'bg-emerald-700/60'
    if (pct < 0.8) return 'bg-emerald-600/75'
    return 'bg-emerald-500/90'
  } else {
    if (pct < 0.2) return 'bg-red-900/50'
    if (pct < 0.5) return 'bg-red-800/60'
    if (pct < 0.8) return 'bg-red-700/75'
    return 'bg-red-600/90'
  }
}

export function HeatmapChart({ data, mode = 'pnl' }: HeatmapChartProps) {
  // Build lookup map
  const lookup = new Map<string, HeatmapEntry>()
  for (const d of data) lookup.set(`${d.day}:${d.hour}`, d)

  const tradingDays = [1, 2, 3, 4, 5] // Mon-Fri

  const maxAbs = Math.max(...data.map(d => Math.abs(mode === 'pnl' ? d.pnl : mode === 'trades' ? d.trades : d.winRate)), 1)

  const getValue = (e: HeatmapEntry | undefined) => {
    if (!e) return 0
    if (mode === 'pnl') return e.pnl
    if (mode === 'winRate') return e.winRate
    return e.trades
  }

  const formatValue = (e: HeatmapEntry | undefined) => {
    if (!e || e.trades === 0) return null
    if (mode === 'pnl') return formatCurrency(e.pnl)
    if (mode === 'winRate') return `${e.winRate.toFixed(0)}%`
    return `${e.trades}`
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* Hour header */}
        <div className="flex mb-1">
          <div className="w-10 shrink-0" />
          <div className="flex flex-1 gap-0.5">
            {HOURS.map(h => (
              <div key={h} className="flex-1 text-center text-[10px] text-slate-500 font-mono">{h}h</div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {tradingDays.map(day => (
          <div key={day} className="flex items-center gap-0.5 mb-0.5">
            <div className="w-10 shrink-0 text-[11px] text-slate-400 font-medium">{DAY_LABELS[day]}</div>
            {HOURS.map(h => {
              const entry = lookup.get(`${day}:${h}`)
              const val = getValue(entry)
              const color = cellColor(val, maxAbs, mode)
              const label = formatValue(entry)
              return (
                <div
                  key={h}
                  className={cn(
                    'flex-1 h-8 rounded flex items-center justify-center text-[10px] font-mono transition-all cursor-default group relative',
                    color,
                    entry && entry.trades > 0 ? 'text-white/80' : 'text-transparent'
                  )}
                  title={entry && entry.trades > 0 ? `${DAY_LABELS[day]} ${h}h — ${entry.trades} trade${entry.trades > 1 ? 's' : ''}, P&L: ${formatCurrency(entry.pnl)}, WR: ${entry.winRate.toFixed(0)}%` : undefined}
                >
                  {label}
                  {/* Tooltip */}
                  {entry && entry.trades > 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 hidden group-hover:flex flex-col items-center pointer-events-none">
                      <div className="bg-surface-600 border border-surface-400 rounded-lg px-2.5 py-2 text-[11px] whitespace-nowrap shadow-lg">
                        <div className="text-white font-semibold mb-0.5">{DAY_LABELS[day]} {h}h00</div>
                        <div className={cn('font-bold font-mono', entry.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>{formatCurrency(entry.pnl)}</div>
                        <div className="text-slate-400">{entry.trades} trade{entry.trades > 1 ? 's' : ''} · {entry.winRate.toFixed(0)}% WR</div>
                      </div>
                      <div className="w-2 h-2 bg-surface-600 border-r border-b border-surface-400 rotate-45 -mt-1" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center justify-end gap-3 mt-3">
          {mode === 'pnl' && (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-600/90" />
                <span className="text-[10px] text-slate-500">Perte</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-surface-700" />
                <span className="text-[10px] text-slate-500">Vide</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-500/90" />
                <span className="text-[10px] text-slate-500">Gain</span>
              </div>
            </>
          )}
          {mode === 'winRate' && (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-500/70" />
                <span className="text-[10px] text-slate-500">&lt;30%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-600/50" />
                <span className="text-[10px] text-slate-500">45-55%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-500/80" />
                <span className="text-[10px] text-slate-500">&gt;70%</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
