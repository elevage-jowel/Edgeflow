import { Trade } from '@/lib/types'

export interface Insight {
  id: string
  type: 'positive' | 'negative' | 'neutral' | 'warning'
  icon: string
  title: string
  value: string
  description: string
  priority: number
}

const EMOTION_LABELS: Record<string, string> = {
  calm: 'Calm', focused: 'Focused', confident: 'Confident',
  hesitant: 'Hesitant', fearful: 'Fearful', greedy: 'Greedy',
  frustrated: 'Frustrated', tired: 'Tired', fomo: 'FOMO',
  revenge: 'Revenge', overconfident: 'Overconfident', distracted: 'Distracted',
}

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

function pct(wins: number, total: number): number {
  return total > 0 ? (wins / total) * 100 : 0
}

export function generateInsights(trades: Trade[]): Insight[] {
  const closed = trades.filter(t => t.status === 'closed' && t.netPnl !== undefined)
  if (closed.length < 5) return []

  const insights: Insight[] = []

  // 1. Best setup by win rate
  const bySetup = new Map<string, { wins: number; total: number; pnl: number }>()
  closed.forEach(t => {
    if (!t.strategy) return
    const s = bySetup.get(t.strategy) ?? { wins: 0, total: 0, pnl: 0 }
    bySetup.set(t.strategy, { wins: s.wins + ((t.netPnl ?? 0) > 0 ? 1 : 0), total: s.total + 1, pnl: s.pnl + (t.netPnl ?? 0) })
  })
  const setups = Array.from(bySetup.entries()).filter(([, v]) => v.total >= 3)
  if (setups.length > 0) {
    const best = setups.sort((a, b) => pct(b[1].wins, b[1].total) - pct(a[1].wins, a[1].total))[0]
    const wr = pct(best[1].wins, best[1].total)
    insights.push({ id: 'best_setup', type: 'positive', icon: '🎯', title: 'Best Setup', value: best[0], description: `${wr.toFixed(0)}% win rate over ${best[1].total} trades`, priority: 1 })
    const worst = setups.sort((a, b) => pct(a[1].wins, a[1].total) - pct(b[1].wins, b[1].total))[0]
    if (worst[0] !== best[0] && pct(worst[1].wins, worst[1].total) < 40) {
      insights.push({ id: 'worst_setup', type: 'warning', icon: '⚠️', title: 'Weak Setup', value: worst[0], description: `Only ${pct(worst[1].wins, worst[1].total).toFixed(0)}% win rate — consider skipping it`, priority: 2 })
    }
  }

  // 2. Best emotion by avg P&L
  const byEmotion = new Map<string, number[]>()
  closed.forEach(t => {
    if (!t.emotionBefore) return
    const arr = byEmotion.get(t.emotionBefore) ?? []
    arr.push(t.netPnl ?? 0)
    byEmotion.set(t.emotionBefore, arr)
  })
  const emotions = Array.from(byEmotion.entries()).filter(([, v]) => v.length >= 3)
  if (emotions.length > 1) {
    const sorted = emotions.sort((a, b) => avg(b[1]) - avg(a[1]))
    const best = sorted[0]
    const worst = sorted[sorted.length - 1]
    const bestAvg = avg(best[1])
    const worstAvg = avg(worst[1])
    if (bestAvg > 0) {
      insights.push({ id: 'best_emotion', type: 'positive', icon: '😌', title: 'Best Mental State', value: EMOTION_LABELS[best[0]] ?? best[0], description: `Avg P&L of $${bestAvg.toFixed(0)} when trading ${EMOTION_LABELS[best[0]] ?? best[0]}`, priority: 1 })
    }
    if (worstAvg < 0 && worst[0] !== best[0]) {
      insights.push({ id: 'worst_emotion', type: 'negative', icon: '😤', title: 'Harmful State', value: EMOTION_LABELS[worst[0]] ?? worst[0], description: `Avg P&L of $${worstAvg.toFixed(0)} when trading ${EMOTION_LABELS[worst[0]] ?? worst[0]}. Avoid it.`, priority: 1 })
    }
  }

  // 3. Best day of week
  const byDay = new Map<string, number[]>()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  closed.forEach(t => {
    const day = dayNames[new Date(t.entryDate).getDay()]
    const arr = byDay.get(day) ?? []
    arr.push(t.netPnl ?? 0)
    byDay.set(day, arr)
  })
  const days = Array.from(byDay.entries()).filter(([, v]) => v.length >= 3)
  if (days.length >= 3) {
    const bestDay = days.sort((a, b) => avg(b[1]) - avg(a[1]))[0]
    const worstDay = days.sort((a, b) => avg(a[1]) - avg(b[1]))[0]
    insights.push({ id: 'best_day', type: 'positive', icon: '📅', title: 'Best Day', value: bestDay[0], description: `Avg $${avg(bestDay[1]).toFixed(0)} P&L on ${bestDay[0]}s`, priority: 2 })
    if (avg(worstDay[1]) < 0) {
      insights.push({ id: 'worst_day', type: 'negative', icon: '🚫', title: 'Worst Day', value: worstDay[0], description: `Avg $${avg(worstDay[1]).toFixed(0)} P&L on ${worstDay[0]}s — consider not trading`, priority: 2 })
    }
  }

  // 4. Rule violations impact
  const violations = closed.filter(t => t.ruleViolated === true)
  const clean = closed.filter(t => t.ruleViolated !== true)
  if (violations.length >= 3) {
    const violAvg = avg(violations.map(t => t.netPnl ?? 0))
    const cleanAvg = avg(clean.map(t => t.netPnl ?? 0))
    const diff = cleanAvg - violAvg
    if (diff > 0) {
      insights.push({ id: 'rule_violations', type: 'warning', icon: '⚡', title: 'Rule Violations Cost You', value: `$${diff.toFixed(0)}/trade`, description: `Clean trades avg $${cleanAvg.toFixed(0)} vs rule breaks avg $${violAvg.toFixed(0)}`, priority: 1 })
    }
  }

  // 5. Overtrading pattern
  const byDate = new Map<string, number>()
  closed.forEach(t => {
    const d = t.entryDate.slice(0, 10)
    byDate.set(d, (byDate.get(d) ?? 0) + 1)
  })
  const highVolDays = Array.from(byDate.entries()).filter(([, c]) => c >= 5)
  if (highVolDays.length >= 2) {
    insights.push({ id: 'overtrading', type: 'warning', icon: '🔄', title: 'Overtrading Detected', value: `${highVolDays.length} days`, description: `You traded 5+ times in a day on ${highVolDays.length} occasions — risk management alert`, priority: 2 })
  }

  // 6. Screenshot discipline
  const withScreenshot = closed.filter(t => t.screenshotUrls?.length > 0)
  const screenshotRate = pct(withScreenshot.length, closed.length)
  if (closed.length >= 10) {
    if (screenshotRate >= 80) {
      insights.push({ id: 'screenshot_discipline', type: 'positive', icon: '📸', title: 'Great Screenshot Habit', value: `${screenshotRate.toFixed(0)}%`, description: 'You document your trades consistently — keep it up', priority: 3 })
    } else if (screenshotRate < 30) {
      insights.push({ id: 'no_screenshots', type: 'neutral', icon: '📸', title: 'Low Screenshot Rate', value: `${screenshotRate.toFixed(0)}%`, description: 'Add screenshots to track your setups visually', priority: 3 })
    }
  }

  // 7. Best session
  const bySession = new Map<string, number[]>()
  closed.forEach(t => {
    if (!t.session) return
    const arr = bySession.get(t.session) ?? []
    arr.push(t.netPnl ?? 0)
    bySession.set(t.session, arr)
  })
  const sessions = Array.from(bySession.entries()).filter(([, v]) => v.length >= 3)
  if (sessions.length >= 2) {
    const bestSession = sessions.sort((a, b) => avg(b[1]) - avg(a[1]))[0]
    insights.push({ id: 'best_session', type: 'positive', icon: '⏰', title: 'Best Session', value: bestSession[0], description: `Avg $${avg(bestSession[1]).toFixed(0)} P&L during ${bestSession[0]}`, priority: 2 })
  }

  return insights.sort((a, b) => a.priority - b.priority).slice(0, 8)
}
