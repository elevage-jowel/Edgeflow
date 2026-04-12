// ─── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'trader'

export interface Profile {
  id: string
  email: string
  username: string
  role: UserRole
  avatar_url?: string
  created_at: string
}

// ─── Trade ────────────────────────────────────────────────────────────────────
export type TradeType = 'buy' | 'sell'
export type TradeStatus = 'win' | 'loss' | 'breakeven'
export type SetupQuality = 'A+' | 'A' | 'B'
export type EmotionalState =
  | 'confident'
  | 'fearful'
  | 'greedy'
  | 'neutral'
  | 'anxious'
  | 'focused'
  | 'fomo'
  | 'disciplined'

export interface Trade {
  id: string
  user_id: string
  symbol: string
  type: TradeType
  entry_price: number
  exit_price: number
  quantity: number
  stop_loss?: number
  take_profit?: number
  pnl: number
  pnl_percent?: number
  r_multiple?: number
  risk_reward?: number
  status: TradeStatus
  setup_quality?: SetupQuality
  strategy?: string
  timeframe?: string
  emotion_before?: EmotionalState
  emotion_after?: EmotionalState
  notes?: string
  screenshot_url?: string
  entry_date: string
  exit_date: string
  created_at: string
  backtest_session_id?: string
}

export interface TradeFormData {
  symbol: string
  type: TradeType
  entry_price: string
  exit_price: string
  quantity: string
  stop_loss: string
  take_profit: string
  strategy: string
  timeframe: string
  setup_quality: SetupQuality | ''
  emotion_before: EmotionalState | ''
  emotion_after: EmotionalState | ''
  notes: string
  screenshot_url: string
  entry_date: string
  exit_date: string
}

// ─── Backtest ─────────────────────────────────────────────────────────────────
export type BacktestStatus = 'running' | 'completed' | 'paused'

export interface BacktestSession {
  id: string
  user_id: string
  name: string
  strategy: string
  description?: string
  symbol: string
  timeframe: string
  start_date: string
  end_date: string
  initial_balance: number
  status: BacktestStatus
  total_trades: number
  win_rate: number
  profit_factor: number
  total_pnl: number
  max_drawdown: number
  created_at: string
  updated_at: string
}

// ─── Journal ──────────────────────────────────────────────────────────────────
export type MoodLevel = 1 | 2 | 3 | 4 | 5

export interface JournalEntry {
  id: string
  user_id: string
  date: string
  title?: string
  content: string
  mood: MoodLevel
  goals?: string
  lessons?: string
  created_at: string
  updated_at: string
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'CAD' | 'AUD'
export type AppLanguage = 'fr' | 'en'
export type AppTheme = 'dark' | 'light'

export interface UserSettings {
  id: string
  user_id: string
  currency: Currency
  initial_balance: number
  current_balance: number
  language: AppLanguage
  theme: AppTheme
  risk_per_trade: number
  default_risk_reward: number
  notifications_enabled: boolean
  discord_webhook?: string
  notion_api_key?: string
  notion_database_id?: string
  created_at: string
  updated_at: string
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export interface TradingStats {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  breakevenTrades: number
  winRate: number
  totalPnL: number
  grossProfit: number
  grossLoss: number
  profitFactor: number
  avgWin: number
  avgLoss: number
  riskRewardRatio: number
  expectancy: number
  maxWinStreak: number
  maxLossStreak: number
  currentStreak: number
  currentStreakType: 'win' | 'loss' | 'none'
  maxDrawdown: number
  sharpeRatio: number
  avgRMultiple: number
}

export interface SetupStats {
  quality: SetupQuality
  totalTrades: number
  wins: number
  losses: number
  winRate: number
  totalPnL: number
  avgRMultiple: number
  profitFactor: number
}

// ─── Sync ─────────────────────────────────────────────────────────────────────
export type SyncStatus = 'synced' | 'syncing' | 'local' | 'error' | 'offline'

// ─── Calendar ─────────────────────────────────────────────────────────────────
export interface DailyPnL {
  date: string
  pnl: number
  trades: number
}
