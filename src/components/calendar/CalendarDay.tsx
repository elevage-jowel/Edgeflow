import { formatCurrency } from '@/lib/utils'

interface Props {
  day: number
  pnl: number | null
  maxAbsPnl: number
}

export function CalendarDay({ day, pnl, maxAbsPnl }: Props) {
  if (pnl === null) {
    return (
      <div className="aspect-square rounded-lg border border-slate-700/50 bg-slate-800/30 p-1.5">
        <span className="text-xs text-slate-600">{day}</span>
      </div>
    )
  }

  const intensity = maxAbsPnl > 0 ? Math.min(Math.abs(pnl) / maxAbsPnl, 1) : 0
  const isWin = pnl > 0
  const alpha = Math.round(intensity * 100)

  const bg = isWin
    ? `rgba(16, 185, 129, 0.${String(alpha).padStart(2, '0')})`
    : `rgba(244, 63, 94, 0.${String(alpha).padStart(2, '0')})`

  return (
    <div
      className="aspect-square rounded-lg border border-slate-700/50 p-1.5 flex flex-col justify-between"
      style={{ backgroundColor: bg }}
    >
      <span className="text-xs text-slate-400">{day}</span>
      <span className={`text-xs font-semibold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
        {formatCurrency(pnl)}
      </span>
    </div>
  )
}
