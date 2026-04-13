// ─── AI Setup Monitor Types ────────────────────────────────────────────────────

export type TimeframeKey = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'

export type MarketDataSource = 'binance' | 'alphavantage'

export interface TradingSetup {
  id: string
  name: string
  description: string
  rules?: string
  symbols: string[]
  timeframe: TimeframeKey
  active: boolean
  referenceImageBase64?: string
  created_at: string
}

export interface Candle {
  time: number      // unix ms
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface ScanResult {
  id: string
  setup_id: string
  setup_name: string
  symbol: string
  timeframe: TimeframeKey
  detected: boolean
  confidence: number     // 0–100
  analysis: string
  key_levels?: string
  current_price: number
  scanned_at: string
}

export interface MonitorStats {
  totalScans: number
  setupsDetected: number
  lastScanAt: string | null
}
