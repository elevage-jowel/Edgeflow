export type AssetClass = 'stocks' | 'options' | 'futures' | 'forex' | 'crypto'
export type TradeDirection = 'long' | 'short'
export type TradeStatus = 'open' | 'closed' | 'partial'
export type TradeOutcome = 'win' | 'loss' | 'breakeven'

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

  stopLoss?: number
  takeProfit?: number
  initialRisk?: number

  playbookId?: string
  strategy?: string
  session?: string
  tags: string[]
  notes: string
  screenshotUrls: string[]
  setupRating?: number
  executionRating?: number
  emotionRating?: number

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
  createdAt: string
  updatedAt: string
}

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
}
