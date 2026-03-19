export type Direction = 'LONG' | 'SHORT'
export type ImportSource = 'manual' | 'mt4' | 'mt5'

export interface Tag {
  id: string
  name: string
  color: string
}

export interface Trade {
  id: string
  symbol: string
  direction: Direction
  entryPrice: number
  exitPrice: number
  quantity: number
  entryDate: string
  exitDate: string
  pnl: number
  fees: number
  commission: number
  swap: number
  setupType: string | null
  notes: string | null
  importSource: string | null
  externalId: string | null
  createdAt: string
  updatedAt: string
  tags?: Tag[]
}

export interface TradeCreateInput {
  symbol: string
  direction: Direction
  entryPrice: number
  exitPrice: number
  quantity: number
  entryDate: string
  exitDate: string
  pnl: number
  fees?: number
  commission?: number
  swap?: number
  setupType?: string
  notes?: string
  importSource?: string
  externalId?: string
  tagIds?: string[]
}

export interface ParsedTradeRow {
  symbol: string
  direction: Direction
  entryPrice: number
  exitPrice: number
  quantity: number
  entryDate: Date
  exitDate: Date
  profit: number
  commission: number
  swap: number
  externalId?: string
}

export interface EquityPoint {
  date: string
  equity: number
}

export interface DailyPnl {
  date: string
  pnl: number
}

export interface TradeStats {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  profitFactor: number
  totalPnl: number
  avgWin: number
  avgLoss: number
  expectancy: number
  maxDrawdown: number
  maxDrawdownPct: number
  grossProfit: number
  grossLoss: number
  equityCurve: EquityPoint[]
  dailyPnl: DailyPnl[]
}
