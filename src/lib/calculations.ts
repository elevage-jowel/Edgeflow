import type { Trade, TradeStats, EquityPoint, DailyPnl } from '@/types'
import { formatTradeDate } from './dateUtils'

export function computeEquityCurve(trades: Trade[]): EquityPoint[] {
  const sorted = [...trades].sort(
    (a, b) => new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime()
  )
  let equity = 0
  return sorted.map((t) => {
    equity += t.pnl
    return { date: formatTradeDate(t.exitDate), equity: Math.round(equity * 100) / 100 }
  })
}

export function computeDailyPnl(trades: Trade[]): DailyPnl[] {
  const map = new Map<string, number>()
  for (const t of trades) {
    const day = formatTradeDate(t.exitDate)
    map.set(day, (map.get(day) ?? 0) + t.pnl)
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, pnl]) => ({ date, pnl: Math.round(pnl * 100) / 100 }))
}

export function computeMaxDrawdown(equityCurve: EquityPoint[]): { absolute: number; percent: number } {
  let peak = 0
  let maxDrawdown = 0
  let maxDrawdownPct = 0

  for (const { equity } of equityCurve) {
    if (equity > peak) peak = equity
    const drawdown = peak - equity
    const drawdownPct = peak > 0 ? (drawdown / peak) * 100 : 0
    if (drawdown > maxDrawdown) maxDrawdown = drawdown
    if (drawdownPct > maxDrawdownPct) maxDrawdownPct = drawdownPct
  }

  return {
    absolute: Math.round(maxDrawdown * 100) / 100,
    percent: Math.round(maxDrawdownPct * 100) / 100,
  }
}

export function computeStats(trades: Trade[]): TradeStats {
  const totalTrades = trades.length

  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      profitFactor: 0,
      totalPnl: 0,
      avgWin: 0,
      avgLoss: 0,
      expectancy: 0,
      maxDrawdown: 0,
      maxDrawdownPct: 0,
      grossProfit: 0,
      grossLoss: 0,
      equityCurve: [],
      dailyPnl: [],
    }
  }

  const winners = trades.filter((t) => t.pnl > 0)
  const losers = trades.filter((t) => t.pnl < 0)
  const winningTrades = winners.length
  const losingTrades = losers.length
  const winRate = (winningTrades / totalTrades) * 100
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0)
  const grossProfit = winners.reduce((sum, t) => sum + t.pnl, 0)
  const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0))
  const profitFactor = grossLoss === 0 ? Infinity : grossProfit / grossLoss
  const avgWin = winningTrades > 0 ? grossProfit / winningTrades : 0
  const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : 0
  const lossRate = 1 - winRate / 100
  const expectancy = winRate / 100 * avgWin - lossRate * avgLoss

  const equityCurve = computeEquityCurve(trades)
  const dailyPnl = computeDailyPnl(trades)
  const { absolute: maxDrawdown, percent: maxDrawdownPct } = computeMaxDrawdown(equityCurve)

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: Math.round(winRate * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    totalPnl: Math.round(totalPnl * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    expectancy: Math.round(expectancy * 100) / 100,
    maxDrawdown,
    maxDrawdownPct,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossLoss: Math.round(grossLoss * 100) / 100,
    equityCurve,
    dailyPnl,
  }
}
