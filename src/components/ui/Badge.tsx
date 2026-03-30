import { cn } from '@/lib/utils/cn'

type BadgeVariant = 'win' | 'loss' | 'breakeven' | 'open' | 'long' | 'short' | 'default' | 'brand'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  win: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  loss: 'bg-red-500/15 text-red-400 border border-red-500/20',
  breakeven: 'bg-slate-500/15 text-slate-400 border border-slate-500/20',
  open: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  long: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  short: 'bg-red-500/15 text-red-400 border border-red-500/20',
  default: 'bg-surface-600 text-slate-300 border border-surface-500',
  brand: 'bg-brand-500/15 text-brand-300 border border-brand-500/20',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}
