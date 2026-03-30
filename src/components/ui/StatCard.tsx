import { cn } from '@/lib/utils/cn'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  sub?: string
  trend?: number
  icon?: LucideIcon
  iconColor?: string
  valueColor?: string
  className?: string
  loading?: boolean
}

export function StatCard({ title, value, sub, trend, icon: Icon, iconColor = 'text-brand-400', valueColor, className, loading }: StatCardProps) {
  return (
    <div className={cn(
      'bg-surface-800 border border-surface-500 rounded-2xl p-5 hover:border-surface-400 transition-all',
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-surface-700', iconColor?.includes('emerald') ? 'bg-emerald-500/10' : iconColor?.includes('red') ? 'bg-red-500/10' : 'bg-brand-500/10')}>
            <Icon className={cn('w-4 h-4', iconColor)} />
          </div>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 bg-surface-700 rounded-lg animate-pulse w-24" />
          <div className="h-4 bg-surface-700 rounded w-16 animate-pulse" />
        </div>
      ) : (
        <>
          <div className={cn('text-2xl font-bold tracking-tight font-mono', valueColor ?? 'text-white')}>{value}</div>
          {(sub || trend !== undefined) && (
            <div className="flex items-center gap-1.5 mt-1">
              {trend !== undefined && (
                <span className={cn('text-xs font-medium', trend >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
                </span>
              )}
              {sub && <span className="text-xs text-slate-500">{sub}</span>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
