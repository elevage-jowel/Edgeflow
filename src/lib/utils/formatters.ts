import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function formatCurrency(value: number, currency = 'USD', compact = false): string {
  if (compact && Math.abs(value) >= 1000) {
    const sign = value < 0 ? '-' : ''
    const abs = Math.abs(value)
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPnl(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${formatCurrency(value)}`
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function formatWinRate(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatR(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}R`
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals)
}

export function formatDate(dateStr: string, fmt = 'MMM d, yyyy'): string {
  try {
    return format(parseISO(dateStr), fmt)
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy HH:mm')
  } catch {
    return dateStr
  }
}

export function formatTimeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true })
  } catch {
    return dateStr
  }
}

export function formatShortDate(dateStr: string): string {
  return formatDate(dateStr, 'MMM d')
}

export function getPnlColor(value: number): string {
  if (value > 0) return 'text-emerald-400'
  if (value < 0) return 'text-red-400'
  return 'text-slate-400'
}

export function getPnlBg(value: number): string {
  if (value > 0) return 'bg-emerald-400/10 text-emerald-400'
  if (value < 0) return 'bg-red-400/10 text-red-400'
  return 'bg-slate-400/10 text-slate-400'
}
