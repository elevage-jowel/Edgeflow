import { Trade, AnalyticsData } from '@/lib/types'
import { format, parseISO, getDay, getHours, startOfWeek, startOfMonth, eachDayOfInterval, subDays } from 'date-fns'

export function calcNetPnl(trade: Trade): number {
  if (!trade.exitPrice || trade.status === 'open') return 0
  const direction = trade.direction === 'long' ? 1 : -1
  const gross = (trade.exitPrice - trade.entryPrice) * trade.quantity * direction
  return gross - (trade.commission || 0)
}

export function calcRMultiple(trade: Trade): number {
  if (!trade.stopLoss || !trade.exitPrice || trade.status === 'open') return 0
  const risk = Math.abs(trade.entryPrice - trade.stopLoss) * trade.quantity
  if (risk === 0) return 0
  return calcNetPnl(trade) / risk
}

export function computeAnalytics(trades: Trade[]): AnalyticsData {
  const closed = trades.filter(t => t.status === 'closed' || t.status === 'partial')
  const open = trades.filter(t => t.status === 'open')
  const wins = closed.filter(t => (t.netPnl ?? 0) > 0)
  const losses = closed.filter(t => (t.netPnl ?? 0) < 0)
  const breakevens = closed.filter(t => (t.netPnl ?? 0) === 0)

  const totalNetPnl = closed.reduce((s, t) => s + (t.netPnl ?? 0), 0)
  const totalGrossPnl = closed.reduce((s, t) => s + (t.grossPnl ?? 0), 0)
  const totalCommissions = trades.reduce((s, t) => s + (t.commission ?? 0), 0)

  const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.netPnl ?? 0), 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.netPnl ?? 0), 0) / losses.length) : 0
  const avgNetPnl = closed.length > 0 ? totalNetPnl / closed.length : 0

  const grossWins = wins.reduce((s, t) => s + (t.netPnl ?? 0), 0)
  const grossLosses = Math.abs(losses.reduce((s, t) => s + (t.netPnl ?? 0), 0))
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : wins.length > 0 ? 999 : 0
  const expectancy = avgWin * (winRate / 100) - avgLoss * (1 - winRate / 100)

  const rMultiples = closed.filter(t => t.rMultiple !== undefined).map(t => t.rMultiple!)
  const avgRMultiple = rMultiples.length > 0 ? rMultiples.reduce((s, r) => s + r, 0) / rMultiples.length : 0

  const maxWin = wins.length > 0 ? Math.max(...wins.map(t => t.netPnl ?? 0)) : 0
  const maxLoss = losses.length > 0 ? Math.min(...losses.map(t => t.netPnl ?? 0)) : 0

  // Equity curve
  const sortedClosed = [...closed].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())
  let equity = 0
  const equityCurve = sortedClosed.map(t => {
    equity += t.netPnl ?? 0
    return { date: t.exitDate ?? t.entryDate, value: equity, pnl: t.netPnl ?? 0 }
  })

  // Max drawdown
  let peak = 0, maxDrawdown = 0
  for (const point of equityCurve) {
    if (point.value > peak) peak = point.value
    const dd = peak - point.value
    if (dd > maxDrawdown) maxDrawdown = dd
  }
  const maxDrawdownPct = peak > 0 ? (maxDrawdown / peak) * 100 : 0
  const recoveryFactor = maxDrawdown > 0 ? totalNetPnl / maxDrawdown : totalNetPnl > 0 ? 999 : 0

  // Streaks
  let currentStreak = 0, longestWinStreak = 0, longestLossStreak = 0
  let tempWin = 0, tempLoss = 0
  for (const t of sortedClosed) {
    const pnl = t.netPnl ?? 0
    if (pnl > 0) {
      tempWin++; tempLoss = 0
      longestWinStreak = Math.max(longestWinStreak, tempWin)
    } else if (pnl < 0) {
      tempLoss++; tempWin = 0
      longestLossStreak = Math.max(longestLossStreak, tempLoss)
    }
  }
  if (sortedClosed.length > 0) {
    const lastPnl = sortedClosed[sortedClosed.length - 1].netPnl ?? 0
    if (lastPnl > 0) currentStreak = tempWin
    else if (lastPnl < 0) currentStreak = -tempLoss
  }

  // Sharpe / Sortino
  const dailyPnlMap = new Map<string, number>()
  for (const t of sortedClosed) {
    const day = format(parseISO(t.exitDate ?? t.entryDate), 'yyyy-MM-dd')
    dailyPnlMap.set(day, (dailyPnlMap.get(day) ?? 0) + (t.netPnl ?? 0))
  }
  const dailyPnlArr = Array.from(dailyPnlMap.values())
  const avgDaily = dailyPnlArr.length > 0 ? dailyPnlArr.reduce((s, v) => s + v, 0) / dailyPnlArr.length : 0
  const variance = dailyPnlArr.length > 1 ? dailyPnlArr.reduce((s, v) => s + Math.pow(v - avgDaily, 2), 0) / (dailyPnlArr.length - 1) : 1
  const stdDev = Math.sqrt(variance)
  const downside = dailyPnlArr.filter(v => v < 0)
  const downVariance = downside.length > 1 ? downside.reduce((s, v) => s + Math.pow(v, 2), 0) / downside.length : 1
  const downStdDev = Math.sqrt(downVariance)
  const sharpeRatio = stdDev > 0 ? (avgDaily / stdDev) * Math.sqrt(252) : 0
  const sortinoRatio = downStdDev > 0 ? (avgDaily / downStdDev) * Math.sqrt(252) : 0

  // Daily PnL grouped
  const dailyPnlGrouped: { date: string; pnl: number; trades: number }[] = []
  const dailyTradesMap = new Map<string, { pnl: number; trades: number }>()
  for (const t of sortedClosed) {
    const day = format(parseISO(t.exitDate ?? t.entryDate), 'yyyy-MM-dd')
    const prev = dailyTradesMap.get(day) ?? { pnl: 0, trades: 0 }
    dailyTradesMap.set(day, { pnl: prev.pnl + (t.netPnl ?? 0), trades: prev.trades + 1 })
  }
  dailyTradesMap.forEach((v, k) => dailyPnlGrouped.push({ date: k, ...v }))
  dailyPnlGrouped.sort((a, b) => a.date.localeCompare(b.date))

  // Weekly PnL
  const weeklyMap = new Map<string, { pnl: number; trades: number }>()
  for (const t of sortedClosed) {
    const week = format(startOfWeek(parseISO(t.exitDate ?? t.entryDate)), 'yyyy-MM-dd')
    const prev = weeklyMap.get(week) ?? { pnl: 0, trades: 0 }
    weeklyMap.set(week, { pnl: prev.pnl + (t.netPnl ?? 0), trades: prev.trades + 1 })
  }
  const weeklyPnl = Array.from(weeklyMap.entries()).map(([w, v]) => ({ week: w, ...v })).sort((a, b) => a.week.localeCompare(b.week))

  // Monthly PnL
  const monthlyMap = new Map<string, { pnl: number; trades: number }>()
  for (const t of sortedClosed) {
    const month = format(startOfMonth(parseISO(t.exitDate ?? t.entryDate)), 'yyyy-MM')
    const prev = monthlyMap.get(month) ?? { pnl: 0, trades: 0 }
    monthlyMap.set(month, { pnl: prev.pnl + (t.netPnl ?? 0), trades: prev.trades + 1 })
  }
  const monthlyPnl = Array.from(monthlyMap.entries()).map(([m, v]) => ({ month: m, ...v })).sort((a, b) => a.month.localeCompare(b.month))

  // By asset class
  const assetMap = new Map<string, { pnl: number; trades: number; wins: number }>()
  for (const t of closed) {
    const prev = assetMap.get(t.assetClass) ?? { pnl: 0, trades: 0, wins: 0 }
    assetMap.set(t.assetClass, { pnl: prev.pnl + (t.netPnl ?? 0), trades: prev.trades + 1, wins: prev.wins + ((t.netPnl ?? 0) > 0 ? 1 : 0) })
  }
  const byAssetClass = Array.from(assetMap.entries()).map(([name, v]) => ({ name, pnl: v.pnl, trades: v.trades, winRate: v.trades > 0 ? (v.wins / v.trades) * 100 : 0 }))

  // By symbol
  const symbolMap = new Map<string, { pnl: number; trades: number; wins: number; rTotal: number; rCount: number }>()
  for (const t of closed) {
    const prev = symbolMap.get(t.symbol) ?? { pnl: 0, trades: 0, wins: 0, rTotal: 0, rCount: 0 }
    symbolMap.set(t.symbol, {
      pnl: prev.pnl + (t.netPnl ?? 0),
      trades: prev.trades + 1,
      wins: prev.wins + ((t.netPnl ?? 0) > 0 ? 1 : 0),
      rTotal: prev.rTotal + (t.rMultiple ?? 0),
      rCount: prev.rCount + (t.rMultiple !== undefined ? 1 : 0),
    })
  }
  const bySymbol = Array.from(symbolMap.entries())
    .map(([symbol, v]) => ({ symbol, pnl: v.pnl, trades: v.trades, winRate: v.trades > 0 ? (v.wins / v.trades) * 100 : 0, avgR: v.rCount > 0 ? v.rTotal / v.rCount : 0 }))
    .sort((a, b) => b.pnl - a.pnl)

  // By day of week
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayMap = new Map<number, { pnl: number; trades: number; wins: number }>()
  for (const t of closed) {
    const dow = getDay(parseISO(t.exitDate ?? t.entryDate))
    const prev = dayMap.get(dow) ?? { pnl: 0, trades: 0, wins: 0 }
    dayMap.set(dow, { pnl: prev.pnl + (t.netPnl ?? 0), trades: prev.trades + 1, wins: prev.wins + ((t.netPnl ?? 0) > 0 ? 1 : 0) })
  }
  const byDayOfWeek = [1, 2, 3, 4, 5].map(d => {
    const v = dayMap.get(d) ?? { pnl: 0, trades: 0, wins: 0 }
    return { day: dayNames[d], pnl: v.pnl, trades: v.trades, winRate: v.trades > 0 ? (v.wins / v.trades) * 100 : 0 }
  })

  // By hour
  const hourMap = new Map<number, { pnl: number; trades: number; wins: number }>()
  for (const t of closed) {
    const h = getHours(parseISO(t.entryDate))
    const prev = hourMap.get(h) ?? { pnl: 0, trades: 0, wins: 0 }
    hourMap.set(h, { pnl: prev.pnl + (t.netPnl ?? 0), trades: prev.trades + 1, wins: prev.wins + ((t.netPnl ?? 0) > 0 ? 1 : 0) })
  }
  const byHour = Array.from(hourMap.entries()).map(([hour, v]) => ({ hour, pnl: v.pnl, trades: v.trades, winRate: v.trades > 0 ? (v.wins / v.trades) * 100 : 0 })).sort((a, b) => a.hour - b.hour)

  // Day × hour heatmap
  const dayHourMap = new Map<string, { pnl: number; trades: number; wins: number }>()
  for (const t of closed) {
    const dow = getDay(parseISO(t.entryDate)) // 0=Sun..6=Sat
    const h = getHours(parseISO(t.entryDate))
    const key = `${dow}:${h}`
    const prev = dayHourMap.get(key) ?? { pnl: 0, trades: 0, wins: 0 }
    dayHourMap.set(key, { pnl: prev.pnl + (t.netPnl ?? 0), trades: prev.trades + 1, wins: prev.wins + ((t.netPnl ?? 0) > 0 ? 1 : 0) })
  }
  const byDayHour = Array.from(dayHourMap.entries()).map(([key, v]) => {
    const [day, hour] = key.split(':').map(Number)
    return { day, hour, pnl: v.pnl, trades: v.trades, winRate: v.trades > 0 ? (v.wins / v.trades) * 100 : 0 }
  })

  // By session
  const sessionMap = new Map<string, { pnl: number; trades: number; wins: number }>()
  for (const t of closed) {
    const sess = t.session ?? 'Unknown'
    const prev = sessionMap.get(sess) ?? { pnl: 0, trades: 0, wins: 0 }
    sessionMap.set(sess, { pnl: prev.pnl + (t.netPnl ?? 0), trades: prev.trades + 1, wins: prev.wins + ((t.netPnl ?? 0) > 0 ? 1 : 0) })
  }
  const bySession = Array.from(sessionMap.entries()).map(([session, v]) => ({ session, pnl: v.pnl, trades: v.trades, winRate: v.trades > 0 ? (v.wins / v.trades) * 100 : 0 }))

  // By setup/strategy
  const setupMap = new Map<string, { pnl: number; trades: number; wins: number; rTotal: number; rCount: number }>()
  for (const t of closed) {
    const setup = t.strategy ?? 'Unknown'
    const prev = setupMap.get(setup) ?? { pnl: 0, trades: 0, wins: 0, rTotal: 0, rCount: 0 }
    setupMap.set(setup, {
      pnl: prev.pnl + (t.netPnl ?? 0),
      trades: prev.trades + 1,
      wins: prev.wins + ((t.netPnl ?? 0) > 0 ? 1 : 0),
      rTotal: prev.rTotal + (t.rMultiple ?? 0),
      rCount: prev.rCount + (t.rMultiple !== undefined ? 1 : 0),
    })
  }
  const bySetup = Array.from(setupMap.entries())
    .map(([setup, v]) => ({ setup, pnl: v.pnl, trades: v.trades, winRate: v.trades > 0 ? (v.wins / v.trades) * 100 : 0, avgR: v.rCount > 0 ? v.rTotal / v.rCount : 0 }))
    .sort((a, b) => b.pnl - a.pnl)

  // By emotion (emotionBefore)
  const emotionMap = new Map<string, { pnl: number; trades: number; wins: number }>()
  for (const t of closed) {
    const emotion = t.emotionBefore ?? 'Unknown'
    const prev = emotionMap.get(emotion) ?? { pnl: 0, trades: 0, wins: 0 }
    emotionMap.set(emotion, {
      pnl: prev.pnl + (t.netPnl ?? 0),
      trades: prev.trades + 1,
      wins: prev.wins + ((t.netPnl ?? 0) > 0 ? 1 : 0),
    })
  }
  const byEmotion = Array.from(emotionMap.entries())
    .map(([emotion, v]) => ({ emotion, pnl: v.pnl, trades: v.trades, winRate: v.trades > 0 ? (v.wins / v.trades) * 100 : 0, avgPnl: v.trades > 0 ? v.pnl / v.trades : 0 }))
    .sort((a, b) => b.pnl - a.pnl)

  // By setup grade (A+, A, B, C, D)
  const gradeOrder = ['A+', 'A', 'B', 'C', 'D']
  const gradeMap = new Map<string, { pnl: number; trades: number; wins: number; rTotal: number; rCount: number }>()
  for (const t of closed) {
    const grade = t.setupGrade ?? 'Unknown'
    const prev = gradeMap.get(grade) ?? { pnl: 0, trades: 0, wins: 0, rTotal: 0, rCount: 0 }
    gradeMap.set(grade, {
      pnl: prev.pnl + (t.netPnl ?? 0),
      trades: prev.trades + 1,
      wins: prev.wins + ((t.netPnl ?? 0) > 0 ? 1 : 0),
      rTotal: prev.rTotal + (t.rMultiple ?? 0),
      rCount: prev.rCount + (t.rMultiple !== undefined ? 1 : 0),
    })
  }
  const byGrade = Array.from(gradeMap.entries())
    .map(([grade, v]) => ({
      grade,
      pnl: v.pnl,
      trades: v.trades,
      winRate: v.trades > 0 ? (v.wins / v.trades) * 100 : 0,
      avgR: v.rCount > 0 ? v.rTotal / v.rCount : 0,
      avgPnl: v.trades > 0 ? v.pnl / v.trades : 0,
    }))
    .sort((a, b) => {
      const ai = gradeOrder.indexOf(a.grade)
      const bi = gradeOrder.indexOf(b.grade)
      if (ai === -1 && bi === -1) return 0
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })

  // Best/worst day
  const bestDay = dailyPnlGrouped.length > 0 ? dailyPnlGrouped.reduce((b, d) => d.pnl > b.pnl ? d : b, dailyPnlGrouped[0]) : null
  const worstDay = dailyPnlGrouped.length > 0 ? dailyPnlGrouped.reduce((w, d) => d.pnl < w.pnl ? d : w, dailyPnlGrouped[0]) : null
  const bestHour = byHour.length > 0 ? byHour.reduce((b, h) => h.pnl > b.pnl ? h : b, byHour[0]).hour : null
  const worstHour = byHour.length > 0 ? byHour.reduce((w, h) => h.pnl < w.pnl ? h : w, byHour[0]).hour : null

  // P&L distributions
  const buildDist = (arr: Trade[], isWin: boolean) => {
    const values = arr.map(t => Math.abs(t.netPnl ?? 0))
    if (values.length === 0) return []
    const max = Math.max(...values)
    const step = max / 5
    const buckets = [0, step, step * 2, step * 3, step * 4, max + 1]
    return buckets.slice(0, -1).map((low, i) => ({
      range: `$${Math.round(low)}-$${Math.round(buckets[i + 1])}`,
      count: values.filter(v => v >= low && v < buckets[i + 1]).length,
    }))
  }

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    openTrades: open.length,
    winCount: wins.length,
    lossCount: losses.length,
    breakevenCount: breakevens.length,
    winRate,
    totalNetPnl,
    totalGrossPnl,
    totalCommissions,
    avgWin,
    avgLoss,
    avgNetPnl,
    profitFactor,
    expectancy,
    avgRMultiple,
    maxWin,
    maxLoss,
    maxDrawdown,
    maxDrawdownPct,
    currentStreak,
    longestWinStreak,
    longestLossStreak,
    sharpeRatio,
    sortinoRatio,
    recoveryFactor,
    equityCurve,
    dailyPnl: dailyPnlGrouped,
    weeklyPnl,
    monthlyPnl,
    byAssetClass,
    bySymbol,
    byDayOfWeek,
    byHour,
    bySession,
    bestDay,
    worstDay,
    bestHour,
    worstHour,
    winDistribution: buildDist(wins, true),
    lossDistribution: buildDist(losses, false),
    bySetup,
    byEmotion,
    byDayHour,
    byGrade,
  }
}
