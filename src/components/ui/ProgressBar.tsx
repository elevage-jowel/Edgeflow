import { cn } from '@/lib/utils/cn'

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  color?: 'brand' | 'emerald' | 'amber' | 'red'
  size?: 'sm' | 'md'
  showLabel?: boolean
}

const colors = {
  brand: 'bg-brand-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
}

export function ProgressBar({ value, max = 100, className, color = 'brand', size = 'md', showLabel }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 bg-surface-600 rounded-full overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2')}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', colors[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <span className="text-xs text-slate-400 font-mono w-10 text-right">{pct.toFixed(0)}%</span>}
    </div>
  )
}
