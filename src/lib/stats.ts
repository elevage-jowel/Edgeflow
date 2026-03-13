import type { Trade, TradingStats, DailyPnL } from '../types'
import { format, parseISO } from 'date-fns'

export function computeStats(trades: Trade[]): TradingStats {
  const closed = trades.filter(t => !t.backtest_session_id)

  const wins = closed.filter(t => t.status === 'win')
  const losses = closed.filter(t => t.status === 'loss')
  const breakevens = closed.filter(t => t.status === 'breakeven')

  const totalTrades = closed.length
  const winningTrades = wins.length
  const losingTrades = losses.length
  const breakevenTrades = breakevens.length

  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
  const totalPnL = closed.reduce((s, t) => s + t.pnl, 0)

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

  const avgWin = winningTrades > 0 ? grossProfit / winningTrades : 0
  const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : 0
  const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0

  const lossRate = totalTrades > 0 ? (losingTrades / totalTrades) * 100 : 0
  const expectancy =
    ((winRate / 100) * avgWin) - ((lossRate / 100) * avgLoss)

  // Streaks
  const sorted = [...closed].sort(
    (a, b) => new Date(a.exit_date).getTime() - new Date(b.exit_date).getTime()
  )
  let maxWinStreak = 0
  let maxLossStreak = 0
  let curStreak = 0
  let curType: 'win' | 'loss' | 'none' = 'none'

  for (const t of sorted) {
    if (t.status === 'win') {
      if (curType === 'win') {
        curStreak++
      } else {
        curType = 'win'
        curStreak = 1
      }
      if (curStreak > maxWinStreak) maxWinStreak = curStreak
    } else if (t.status === 'loss') {
      if (curType === 'loss') {
        curStreak++
      } else {
        curType = 'loss'
        curStreak = 1
      }
      if (curStreak > maxLossStreak) maxLossStreak = curStreak
    }
  }

  // Max drawdown
  let peak = 0
  let equity = 0
  let maxDrawdown = 0
  for (const t of sorted) {
    equity += t.pnl
    if (equity > peak) peak = equity
    const drawdown = peak - equity
    if (drawdown > maxDrawdown) maxDrawdown = drawdown
  }

  // Average R multiple
  const rTrades = closed.filter(t => t.r_multiple !== undefined)
  const avgRMultiple =
    rTrades.length > 0
      ? rTrades.reduce((s, t) => s + (t.r_multiple ?? 0), 0) / rTrades.length
      : 0

  // Sharpe (simplified: mean / stdev of daily returns)
  const dailyMap = getDailyPnL(closed)
  const dailyValues = dailyMap.map(d => d.pnl)
  const mean = dailyValues.length > 0 ? dailyValues.reduce((s, v) => s + v, 0) / dailyValues.length : 0
  const variance =
    dailyValues.length > 1
      ? dailyValues.reduce((s, v) => s + (v - mean) ** 2, 0) / (dailyValues.length - 1)
      : 0
  const stdev = Math.sqrt(variance)
  const sharpeRatio = stdev > 0 ? (mean / stdev) * Math.sqrt(252) : 0

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    breakevenTrades,
    winRate,
    totalPnL,
    grossProfit,
    grossLoss,
    profitFactor,
    avgWin,
    avgLoss,
    riskRewardRatio,
    expectancy,
    maxWinStreak,
    maxLossStreak,
    currentStreak: curStreak,
    currentStreakType: curType,
    maxDrawdown,
    sharpeRatio,
    avgRMultiple,
  }
}

export function getEquityCurve(
  trades: Trade[],
  initialBalance: number
): { date: string; equity: number; pnl: number }[] {
  const sorted = [...trades]
    .filter(t => !t.backtest_session_id)
    .sort((a, b) => new Date(a.exit_date).getTime() - new Date(b.exit_date).getTime())

  let equity = initialBalance
  const curve: { date: string; equity: number; pnl: number }[] = [
    { date: sorted[0]?.exit_date?.slice(0, 10) ?? format(new Date(), 'yyyy-MM-dd'), equity, pnl: 0 },
  ]

  for (const t of sorted) {
    equity += t.pnl
    curve.push({
      date: t.exit_date.slice(0, 10),
      equity: Math.round(equity * 100) / 100,
      pnl: t.pnl,
    })
  }

  return curve
}

export function getDailyPnL(trades: Trade[]): DailyPnL[] {
  const map = new Map<string, DailyPnL>()

  for (const t of trades) {
    const date = t.exit_date.slice(0, 10)
    const existing = map.get(date)
    if (existing) {
      existing.pnl += t.pnl
      existing.trades++
    } else {
      map.set(date, { date, pnl: t.pnl, trades: 1 })
    }
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export function getPnLDistribution(trades: Trade[]): { range: string; count: number }[] {
  const closed = trades.filter(t => !t.backtest_session_id)
  if (closed.length === 0) return []

  const buckets = new Map<string, number>()
  const labels = [
    '< -500', '-500/-200', '-200/-50', '-50/0',
    '0/50', '50/200', '200/500', '> 500',
  ]
  labels.forEach(l => buckets.set(l, 0))

  for (const t of closed) {
    const p = t.pnl
    let label: string
    if (p < -500) label = '< -500'
    else if (p < -200) label = '-500/-200'
    else if (p < -50) label = '-200/-50'
    else if (p < 0) label = '-50/0'
    else if (p < 50) label = '0/50'
    else if (p < 200) label = '50/200'
    else if (p < 500) label = '200/500'
    else label = '> 500'
    buckets.set(label, (buckets.get(label) ?? 0) + 1)
  }

  return labels.map(l => ({ range: l, count: buckets.get(l) ?? 0 }))
}

export function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function generateId(): string {
  return crypto.randomUUID()
}
