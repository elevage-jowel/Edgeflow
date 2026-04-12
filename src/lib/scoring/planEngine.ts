import {
  Trade,
  SetupPlan,
  TradeVerification,
  TradeScoreClass,
  CriterionResult,
  CriterionValidator,
  UserPoints,
  UserLevel,
  Badge,
  BadgeId,
} from '@/lib/types'

// ─── CRITERION EVALUATION ─────────────────────────────────────────────────────

function evaluateCriterion(validator: CriterionValidator, trade: Trade): boolean {
  switch (validator.type) {
    case 'has_notes':
      return !!trade.notes && trade.notes.trim().length > 5
    case 'has_screenshot':
      return Array.isArray(trade.screenshotUrls) && trade.screenshotUrls.length > 0
    case 'has_strategy':
      return !!trade.strategy && trade.strategy.trim().length > 0
    case 'has_playbook':
      return !!trade.playbookId
    case 'has_sl':
      return typeof trade.stopLoss === 'number' && trade.stopLoss > 0
    case 'has_tp':
      return typeof trade.takeProfit === 'number' && trade.takeProfit > 0
    case 'has_emotion':
      return !!trade.emotionBefore
    case 'has_market_condition':
      return !!trade.marketCondition && trade.marketCondition.trim().length > 0
    case 'no_rule_violation':
      return trade.ruleViolated !== true
    case 'has_session':
      return !!trade.session && trade.session.trim().length > 0
    case 'min_rr': {
      const minVal = validator.value ?? 2
      const rr = trade.riskRewardRatio
      if (typeof rr === 'number') return rr >= minVal
      // fallback: compute from SL/TP/entry
      if (trade.stopLoss && trade.takeProfit && trade.entryPrice) {
        const risk = Math.abs(trade.entryPrice - trade.stopLoss)
        const reward = Math.abs(trade.takeProfit - trade.entryPrice)
        if (risk > 0) return reward / risk >= minVal
      }
      return false
    }
    case 'min_confidence': {
      const minConf = validator.value ?? 7
      return typeof trade.confidenceScore === 'number' && trade.confidenceScore >= minConf
    }
    case 'has_setup_rating':
      return typeof trade.setupRating === 'number' && trade.setupRating > 0
    case 'always_true':
      return true
    default:
      return false
  }
}

// ─── VERIFY TRADE ─────────────────────────────────────────────────────────────

export function verifyTrade(
  trade: Trade,
  plan: SetupPlan,
  tradeType: 'live' | 'backtest',
  currentStreak: number
): TradeVerification {
  const criteriaResults: CriterionResult[] = plan.criteria.map(c => {
    const passed = evaluateCriterion(c.validator, trade)
    return {
      criterionId: c.id,
      label: c.label,
      weight: c.weight,
      passed,
      pointsEarned: passed ? c.weight : 0,
    }
  })

  const score = criteriaResults.reduce((sum, r) => sum + r.pointsEarned, 0)
  const scoreClass = classifyScore(score)

  // Base points
  let pointsAwarded = 0
  if (score >= 80) pointsAwarded = 100
  else if (score >= 60) pointsAwarded = 50

  // Bonus points
  let bonusPoints = 0
  if (trade.notes && trade.notes.trim().length > 5) bonusPoints += 20
  if (trade.screenshotUrls && trade.screenshotUrls.length > 0) bonusPoints += 10
  // Streak bonus: if this trade would be the 5th consecutive in-plan
  const newStreak = scoreClass === 'in_plan' ? currentStreak + 1 : 0
  if (newStreak > 0 && newStreak % 5 === 0) bonusPoints += 30

  const totalPoints = pointsAwarded + bonusPoints
  const summary = generateSummary(score, scoreClass, criteriaResults, plan.name)

  return {
    id: trade.id,
    tradeId: trade.id,
    userId: trade.userId,
    tradeType,
    planName: plan.name,
    score,
    scoreClass,
    criteria: criteriaResults,
    pointsAwarded,
    bonusPoints,
    totalPoints,
    summary,
    streakAtTime: newStreak,
    createdAt: new Date().toISOString(),
  }
}

// ─── CLASSIFY SCORE ───────────────────────────────────────────────────────────

export function classifyScore(score: number): TradeScoreClass {
  if (score >= 80) return 'in_plan'
  if (score >= 60) return 'partial'
  return 'out_of_plan'
}

// ─── GENERATE SUMMARY ─────────────────────────────────────────────────────────

export function generateSummary(
  score: number,
  scoreClass: TradeScoreClass,
  criteria: CriterionResult[],
  planName: string
): string {
  const missed = criteria.filter(c => !c.passed)
  const passed = criteria.filter(c => c.passed)

  if (scoreClass === 'in_plan') {
    if (missed.length === 0) return `Setup parfait — plan ${planName} respecté à 100%`
    return `Plan ${planName} respecté à ${score}% — écart mineur : ${missed[0].label.toLowerCase()}`
  }
  if (scoreClass === 'partial') {
    if (missed.length === 1) {
      return `Setup partiel à ${score}% — critère manquant : ${missed[0].label.toLowerCase()}`
    }
    return `Setup partiel à ${score}% — manquants : ${missed.slice(0, 2).map(c => c.label.toLowerCase()).join(', ')}`
  }
  // out_of_plan
  if (passed.length === 0) {
    return `Setup hors plan (${score}%) — aucun critère validé`
  }
  return `Setup hors plan à ${score}% — seulement validé : ${passed.map(c => c.label.toLowerCase()).join(', ')}`
}

// ─── FIND MATCHING PLAN ───────────────────────────────────────────────────────

export function findMatchingPlan(
  trade: Trade,
  plans: SetupPlan[]
): SetupPlan | null {
  if (!trade.strategy) return null
  // Exact name match (case-insensitive)
  const exact = plans.find(p => p.name.toLowerCase() === trade.strategy!.toLowerCase())
  if (exact) return exact
  // Partial match
  const partial = plans.find(
    p => trade.strategy!.toLowerCase().includes(p.name.toLowerCase()) ||
         p.name.toLowerCase().includes(trade.strategy!.toLowerCase())
  )
  return partial ?? null
}

// ─── UPDATE USER POINTS ───────────────────────────────────────────────────────

export function computeLevel(totalPoints: number): UserLevel {
  if (totalPoints >= 5000) return 'elite'
  if (totalPoints >= 2000) return 'expert'
  if (totalPoints >= 500) return 'confirmed'
  return 'apprentice'
}

export const LEVEL_CONFIG: Record<UserLevel, { label: string; color: string; icon: string; min: number; max: number }> = {
  apprentice: { label: 'Apprenti', color: 'text-slate-400', icon: '📘', min: 0, max: 500 },
  confirmed:  { label: 'Confirmé',  color: 'text-emerald-400', icon: '📗', min: 500, max: 2000 },
  expert:     { label: 'Expert',     color: 'text-brand-400', icon: '📙', min: 2000, max: 5000 },
  elite:      { label: 'Élite',      color: 'text-amber-400', icon: '👑', min: 5000, max: 10000 },
}

export function applyVerificationToPoints(
  current: UserPoints,
  verification: TradeVerification,
  allVerifications: TradeVerification[]
): UserPoints {
  const isLive = verification.tradeType === 'live'
  const newTotal = current.total + verification.totalPoints
  const newLive = isLive ? current.live + verification.totalPoints : current.live
  const newBacktest = !isLive ? current.backtest + verification.totalPoints : current.backtest

  // Streak
  const newStreak = verification.streakAtTime
  const longestStreak = Math.max(current.longestStreak, newStreak)

  // Score history (keep last 30)
  const entry = { tradeId: verification.tradeId, score: verification.score, date: verification.createdAt, type: verification.tradeType }
  const history = [entry, ...current.scoreHistory].slice(0, 50)

  // Rolling averages
  const liveHistory = history.filter(h => h.type === 'live')
  const backtestHistory = history.filter(h => h.type === 'backtest')
  const last7 = history.slice(0, 7)
  const last30 = history.slice(0, 30)

  const avg = (arr: typeof history) => arr.length ? arr.reduce((s, h) => s + h.score, 0) / arr.length : 0

  const avgScore7 = avg(last7)
  const avgScore30 = avg(last30)
  const avgScoreLive = avg(liveHistory.slice(0, 20))
  const avgScoreBacktest = avg(backtestHistory.slice(0, 20))

  const level = computeLevel(newTotal)

  // Badges
  const badges = checkBadges(current.badges, {
    liveVerifications: allVerifications.filter(v => v.tradeType === 'live'),
    backtestVerifications: allVerifications.filter(v => v.tradeType === 'backtest'),
    currentVerification: verification,
    newStreak,
    newTotal,
    level,
  })

  return {
    total: newTotal,
    live: newLive,
    backtest: newBacktest,
    currentStreak: newStreak,
    longestStreak,
    avgScore7,
    avgScore30,
    avgScoreLive,
    avgScoreBacktest,
    level,
    badges,
    scoreHistory: history,
  }
}

// ─── BADGE CHECKING ───────────────────────────────────────────────────────────

interface BadgeCheckContext {
  liveVerifications: TradeVerification[]
  backtestVerifications: TradeVerification[]
  currentVerification: TradeVerification
  newStreak: number
  newTotal: number
  level: UserLevel
}

function checkBadges(existing: Badge[], ctx: BadgeCheckContext): Badge[] {
  const earned = new Map(existing.filter(b => b.unlocked).map(b => [b.id, b.earnedAt!]))
  const now = new Date().toISOString()

  const tryUnlock = (id: BadgeId, condition: boolean) => {
    if (condition && !earned.has(id)) earned.set(id, now)
  }

  const liveInPlan = ctx.liveVerifications.filter(v => v.scoreClass === 'in_plan')
  const backtestInPlan = ctx.backtestVerifications.filter(v => v.scoreClass === 'in_plan')

  tryUnlock('first_live_setup', ctx.liveVerifications.length >= 1)
  tryUnlock('live_streak_5', ctx.currentVerification.tradeType === 'live' && ctx.newStreak >= 5)
  tryUnlock('live_perfect_100', ctx.currentVerification.tradeType === 'live' && ctx.currentVerification.score === 100)
  tryUnlock('live_50_setups', liveInPlan.length >= 50)
  tryUnlock('first_backtest_session', ctx.backtestVerifications.length >= 1)
  tryUnlock('backtest_perfect_100', ctx.currentVerification.tradeType === 'backtest' && ctx.currentVerification.score === 100)
  tryUnlock('backtest_50_setups', backtestInPlan.length >= 50)
  tryUnlock('apprentice_rank', ctx.level !== 'apprentice' || ctx.newTotal >= 0)
  tryUnlock('confirmed_rank', ctx.level === 'confirmed' || ctx.level === 'expert' || ctx.level === 'elite')
  tryUnlock('expert_rank', ctx.level === 'expert' || ctx.level === 'elite')
  tryUnlock('elite_rank', ctx.level === 'elite')

  return ALL_BADGES.map(b => ({
    ...b,
    unlocked: earned.has(b.id),
    earnedAt: earned.get(b.id),
  }))
}

export const ALL_BADGES: Omit<Badge, 'unlocked' | 'earnedAt'>[] = [
  { id: 'first_live_setup', name: 'First Validated Setup', description: 'Validate your first live trade setup', icon: '🎯', category: 'live' },
  { id: 'live_streak_5', name: '5-Trade Streak', description: '5 consecutive in-plan live trades', icon: '🔥', category: 'live' },
  { id: 'live_perfect_100', name: 'Perfect Execution', description: 'Score 100/100 on a live trade', icon: '💎', category: 'live' },
  { id: 'live_30_days', name: '30 Days of Discipline', description: 'Log validated trades for 30 consecutive days', icon: '📅', category: 'live' },
  { id: 'live_50_setups', name: '50 Setups Validated', description: 'Validate 50 live trade setups in plan', icon: '🏆', category: 'live' },
  { id: 'first_backtest_session', name: 'Backtest Pioneer', description: 'Complete your first backtest session', icon: '🔬', category: 'backtest' },
  { id: 'backtest_streak_10', name: 'Backtest Machine', description: '10 consecutive in-plan backtest trades', icon: '⚡', category: 'backtest' },
  { id: 'backtest_perfect_100', name: 'Flawless Backtest', description: 'Score 100/100 on a backtest trade', icon: '✨', category: 'backtest' },
  { id: 'backtest_50_setups', name: '50 Backtest Setups', description: 'Validate 50 backtest setups in plan', icon: '📊', category: 'backtest' },
  { id: 'apprentice_rank', name: 'Apprentice', description: 'Reach Apprentice rank', icon: '📘', category: 'rank' },
  { id: 'confirmed_rank', name: 'Confirmed Trader', description: 'Reach Confirmed rank (500+ pts)', icon: '📗', category: 'rank' },
  { id: 'expert_rank', name: 'Expert Trader', description: 'Reach Expert rank (2000+ pts)', icon: '📙', category: 'rank' },
  { id: 'elite_rank', name: 'Elite Trader', description: 'Reach Elite rank (5000+ pts)', icon: '👑', category: 'rank' },
]

export function defaultUserPoints(): UserPoints {
  return {
    total: 0,
    live: 0,
    backtest: 0,
    currentStreak: 0,
    longestStreak: 0,
    avgScore7: 0,
    avgScore30: 0,
    avgScoreLive: 0,
    avgScoreBacktest: 0,
    level: 'apprentice',
    badges: ALL_BADGES.map(b => ({ ...b, unlocked: false })),
    scoreHistory: [],
  }
}
