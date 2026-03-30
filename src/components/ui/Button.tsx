import { cn } from '@/lib/utils/cn'
import { LucideIcon } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
  iconRight?: LucideIcon
  loading?: boolean
}

const variants: Record<ButtonVariant, string> = {
  primary: 'gradient-brand text-white font-semibold shadow-glow-purple hover:opacity-90',
  secondary: 'bg-surface-700 border border-surface-500 text-slate-200 hover:bg-surface-600 hover:text-white',
  ghost: 'text-slate-400 hover:text-white hover:bg-surface-700',
  danger: 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300',
  outline: 'border border-brand-500/30 text-brand-300 hover:bg-brand-500/10 hover:border-brand-500/50',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2',
}

export function Button({ variant = 'secondary', size = 'md', icon: Icon, iconRight: IconRight, loading, children, className, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : Icon && (
        <Icon className="w-4 h-4 shrink-0" />
      )}
      {children}
      {IconRight && !loading && <IconRight className="w-4 h-4 shrink-0" />}
    </button>
  )
}
