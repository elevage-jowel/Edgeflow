export type AssetClass = 'stocks' | 'options' | 'futures' | 'forex' | 'crypto' | 'indices' | 'commodities'
export type TradeDirection = 'long' | 'short'
export type TradeStatus = 'open' | 'closed' | 'partial'
export type TradeOutcome = 'win' | 'loss' | 'breakeven'
export type AccountType = 'challenge' | 'funded' | 'personal'
export type TradeSource = 'manual' | 'signal' | 'copied' | 'imported'

export interface Trade {
  id: string
  userId: string
  symbol: string
  assetClass: AssetClass
  direction: TradeDirection
  status: TradeStatus
  outcome?: TradeOutcome

  entryDate: string
  exitDate?: string
  entryPrice: number
  exitPrice?: number
  quantity: number
  commission: number

  grossPnl?: number
  netPnl?: number
  rMultiple?: number
  returnPct?: number
  riskAmount?: number
  riskPercent?: number
  tradeDuration?: number  // minutes

  stopLoss?: number
  takeProfit?: number
  initialRisk?: number
  riskRewardRatio?: number   // expected R:R from SL/TP

  // Account & Prop Firm
  propFirm?: string
  accountType?: AccountType
  accountName?: string
  tradeSource?: TradeSource

  // Market Context
  session?: string
  marketCondition?: string
  preTradeNote?: string

  // Trade Management
  breakEvenMoved?: boolean
  partialsTaken?: boolean
  spread?: number
  slippage?: number
  lots?: number              // forex lot size

  // Psychology
  emotionBefore?: string
  emotionAfter?: string
  confidenceScore?: number   // 1-10
  ruleViolated?: boolean
  mistakeTags?: string[]

  playbookId?: string
  strategy?: string
  tags: string[]
  notes: string
  screenshotUrls: string[]
  setupRating?: number
  executionRating?: number
  emotionRating?: number     // kept for backward compat

  createdAt: string
  updatedAt: string
}

export type GoalType = 'monthly_pnl' | 'win_rate' | 'max_drawdown' | 'trade_count' | 'risk_reward' | 'daily_loss_limit' | 'screenshot_rate'
export type GoalPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface Goal {
  id: string
  userId: string
  title: string
  description?: string
  type: GoalType
  period: GoalPeriod
  targetValue: number
  currentValue: number
  unit: string
  startDate: string
  endDate: string
  isActive: boolean
  isCompleted: boolean
  notes: string
  createdAt: string
  updatedAt: string
}

export interface PlaybookChecklist {
  id: string
  label: string
  checked: boolean
}

export interface Playbook {
  id: string
  userId: string
  name: string
  description?: string
  marketCondition?: string
  entryCriteria?: string
  invalidationCriteria?: string
  managementRules?: string
  exitCriteria?: string
  screenshotUrl?: string
  checklist: PlaybookChecklist[]
  tags: string[]
  isActive: boolean
  tradeCount?: number
  winRate?: number
  avgRMultiple?: number
  createdAt: string
  updatedAt: string
}

export type ReviewType = 'daily' | 'weekly' | 'monthly'
export type EmotionalState = 'excellent' | 'good' | 'neutral' | 'stressed' | 'anxious' | 'fear' | 'greed'

export interface DailyHabit {
  id: string
  label: string
  completed: boolean
}

export interface Review {
  id: string
  userId: string
  type: ReviewType
  date: string
  emotionalState?: EmotionalState
  disciplineScore?: number
  notes?: string
  wins?: string
  losses?: string
  improvements?: string
  habits: DailyHabit[]
  tradeCount?: number
  dayPnl?: number
  createdAt: string
  updatedAt: string
}

export interface BacktestTrade {
  id: string
  symbol: string
  direction: TradeDirection
  entryDate: string
  exitDate: string
  entryPrice: number
  exitPrice: number
  quantity: number
  pnl: number
  rMultiple: number
  notes?: string
}

export interface Backtest {
  id: string
  userId: string
  name: string
  strategy: string
  description?: string
  startDate: string
  endDate: string
  initialCapital: number
  trades: BacktestTrade[]
  totalPnl?: number
  winRate?: number
  profitFactor?: number
  maxDrawdown?: number
  sharpeRatio?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  uid: string
  email: string
  displayName?: string
  photoURL?: string
  currency: string
  timezone: string
  riskUnit: 'dollar' | 'percent' | 'r'
  accountSize?: number
  seeded?: boolean
  points?: UserPoints
  createdAt: string
  updatedAt: string
}

// ─── SETUP PLANS & SCORING ───────────────────────────────────────────────────

export type CriterionValidatorType =
  | 'has_notes'
  | 'has_screenshot'
  | 'has_strategy'
  | 'has_playbook'
  | 'has_sl'
  | 'has_tp'
  | 'has_emotion'
  | 'has_market_condition'
  | 'no_rule_violation'
  | 'has_session'
  | 'min_rr'
  | 'min_confidence'
  | 'has_setup_rating'
  | 'always_true'

export interface CriterionValidator {
  type: CriterionValidatorType
  value?: number  // for min_rr, min_confidence
}

export interface PlanCriterion {
  id: string
  label: string
  description?: string
  weight: number  // total weights in a plan = 100
  validator: CriterionValidator
}

export interface SetupPlan {
  id: string
  userId: string
  name: string           // matches Trade.strategy or Trade.setup name
  description?: string
  criteria: PlanCriterion[]
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export type TradeScoreClass = 'in_plan' | 'partial' | 'out_of_plan'

export interface CriterionResult {
  criterionId: string
  label: string
  weight: number
  passed: boolean
  pointsEarned: number
}

export interface TradeVerification {
  id: string               // same as tradeId
  tradeId: string
  userId: string
  tradeType: 'live' | 'backtest'
  planName: string
  score: number            // 0-100
  scoreClass: TradeScoreClass
  criteria: CriterionResult[]
  pointsAwarded: number
  bonusPoints: number
  totalPoints: number
  summary: string
  streakAtTime: number
  createdAt: string
}

// ─── BADGES ──────────────────────────────────────────────────────────────────

export type BadgeId =
  // Live badges
  | 'first_live_setup'
  | 'live_streak_5'
  | 'live_perfect_100'
  | 'live_30_days'
  | 'live_50_setups'
  // Backtest badges
  | 'first_backtest_session'
  | 'backtest_streak_10'
  | 'backtest_perfect_100'
  | 'backtest_50_setups'
  // Combined
  | 'apprentice_rank'
  | 'confirmed_rank'
  | 'expert_rank'
  | 'elite_rank'

export interface Badge {
  id: BadgeId
  name: string
  description: string
  icon: string         // emoji
  category: 'live' | 'backtest' | 'rank'
  earnedAt?: string    // set when unlocked
  unlocked: boolean
}

// ─── USER POINTS & LEVEL ─────────────────────────────────────────────────────

export type UserLevel = 'apprentice' | 'confirmed' | 'expert' | 'elite'

export interface UserPoints {
  total: number
  live: number
  backtest: number
  currentStreak: number
  longestStreak: number
  avgScore7: number
  avgScore30: number
  avgScoreLive: number
  avgScoreBacktest: number
  level: UserLevel
  badges: Badge[]
  scoreHistory: { tradeId: string; score: number; date: string; type: 'live' | 'backtest' }[]
}

// ─── DATE RANGE ──────────────────────────────────────────────────────────────

export interface DateRange {
  from: Date
  to: Date
}

export interface TradeFilters {
  search?: string
  assetClass?: AssetClass | 'all'
  direction?: TradeDirection | 'all'
  outcome?: TradeOutcome | 'all'
  strategy?: string
  session?: string
  tags?: string[]
  dateFrom?: string
  dateTo?: string
  minPnl?: number
  maxPnl?: number
}

export interface AnalyticsData {
  totalTrades: number
  closedTrades: number
  openTrades: number
  winCount: number
  lossCount: number
  breakevenCount: number
  winRate: number
  totalNetPnl: number
  totalGrossPnl: number
  totalCommissions: number
  avgWin: number
  avgLoss: number
  avgNetPnl: number
  profitFactor: number
  expectancy: number
  avgRMultiple: number
  maxWin: number
  maxLoss: number
  maxDrawdown: number
  maxDrawdownPct: number
  currentStreak: number
  longestWinStreak: number
  longestLossStreak: number
  sharpeRatio: number
  sortinoRatio: number
  recoveryFactor: number
  equityCurve: { date: string; value: number; pnl: number }[]
  dailyPnl: { date: string; pnl: number; trades: number }[]
  weeklyPnl: { week: string; pnl: number; trades: number }[]
  monthlyPnl: { month: string; pnl: number; trades: number }[]
  byAssetClass: { name: string; pnl: number; trades: number; winRate: number }[]
  bySymbol: { symbol: string; pnl: number; trades: number; winRate: number; avgR: number }[]
  byDayOfWeek: { day: string; pnl: number; trades: number; winRate: number }[]
  byHour: { hour: number; pnl: number; trades: number; winRate: number }[]
  bySession: { session: string; pnl: number; trades: number; winRate: number }[]
  bestDay: { date: string; pnl: number } | null
  worstDay: { date: string; pnl: number } | null
  bestHour: number | null
  worstHour: number | null
  winDistribution: { range: string; count: number }[]
  lossDistribution: { range: string; count: number }[]
  bySetup: { setup: string; pnl: number; trades: number; winRate: number; avgR: number }[]
  byEmotion: { emotion: string; pnl: number; trades: number; winRate: number; avgPnl: number }[]
}
