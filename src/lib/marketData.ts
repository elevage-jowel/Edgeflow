import type { Candle, TimeframeKey } from '../types/monitor'

// ─── Timeframe Mappings ────────────────────────────────────────────────────────

const BINANCE_INTERVAL_MAP: Record<TimeframeKey, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
}

const ALPHAVANTAGE_INTERVAL_MAP: Record<TimeframeKey, string> = {
  '1m': '1min',
  '5m': '5min',
  '15m': '15min',
  '30m': '30min',
  '1h': '60min',
  '4h': '60min',  // AV doesn't have 4h, we'll use 1h
  '1d': 'daily',
}

// Crypto symbol detection (Binance pairs)
export function isCryptoSymbol(symbol: string): boolean {
  const upper = symbol.toUpperCase()
  const cryptoSuffixes = ['USDT', 'USDC', 'BUSD', 'BTC', 'ETH', 'BNB', 'USD']
  return cryptoSuffixes.some(suffix => upper.endsWith(suffix)) &&
    upper.length >= 6
}

// Normalise symbol for Binance (BTCUSDT, ETHUSDT, etc.)
function normaliseBinanceSymbol(symbol: string): string {
  const s = symbol.toUpperCase().replace('/', '').replace('-', '')
  // Handle common shorthand: BTC → BTCUSDT
  if (!s.endsWith('USDT') && !s.endsWith('USDC') && !s.endsWith('BUSD') && !s.endsWith('BTC') && !s.endsWith('ETH')) {
    return s + 'USDT'
  }
  return s
}

// ─── Binance (Crypto, free, no key needed) ────────────────────────────────────

export async function fetchBinanceCandles(
  symbol: string,
  timeframe: TimeframeKey,
  limit = 50
): Promise<Candle[]> {
  const binanceSymbol = normaliseBinanceSymbol(symbol)
  const interval = BINANCE_INTERVAL_MAP[timeframe]
  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`

  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Binance error: ${err.msg ?? res.statusText}`)
  }

  const raw: [number, string, string, string, string, string][] = await res.json()
  return raw.map(k => ({
    time: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }))
}

// ─── Alpha Vantage (Stocks/Forex) ─────────────────────────────────────────────

export async function fetchAlphaVantageCandles(
  symbol: string,
  timeframe: TimeframeKey,
  apiKey: string,
  limit = 50
): Promise<Candle[]> {
  const interval = ALPHAVANTAGE_INTERVAL_MAP[timeframe]
  const isDaily = timeframe === '1d' || timeframe === '4h'

  let url: string
  if (isDaily && timeframe === '1d') {
    url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${apiKey}`
  } else {
    url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&outputsize=compact&apikey=${apiKey}`
  }

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`)

  const json = await res.json()

  if (json['Note']) throw new Error('Alpha Vantage API rate limit reached. Try again in a minute.')
  if (json['Error Message']) throw new Error(`Alpha Vantage: ${json['Error Message']}`)

  const key = timeframe === '1d'
    ? 'Time Series (Daily)'
    : `Time Series (${interval})`

  const series: Record<string, { '1. open': string; '2. high': string; '3. low': string; '4. close': string; '5. volume': string }> = json[key]
  if (!series) throw new Error('No data returned from Alpha Vantage')

  const candles: Candle[] = Object.entries(series)
    .slice(0, limit)
    .map(([dateStr, v]) => ({
      time: new Date(dateStr).getTime(),
      open: parseFloat(v['1. open']),
      high: parseFloat(v['2. high']),
      low: parseFloat(v['3. low']),
      close: parseFloat(v['4. close']),
      volume: parseFloat(v['5. volume']),
    }))
    .reverse()

  return candles
}

// ─── Unified fetcher ──────────────────────────────────────────────────────────

export async function fetchCandles(
  symbol: string,
  timeframe: TimeframeKey,
  alphaVantageKey?: string
): Promise<Candle[]> {
  if (isCryptoSymbol(symbol)) {
    return fetchBinanceCandles(symbol, timeframe)
  }

  if (!alphaVantageKey) {
    throw new Error(
      `"${symbol}" looks like a stock/forex symbol. Add an Alpha Vantage API key in Settings to fetch non-crypto data.`
    )
  }

  return fetchAlphaVantageCandles(symbol, timeframe, alphaVantageKey)
}

// ─── Format candles as text for AI prompt ─────────────────────────────────────

export function formatCandlesForPrompt(candles: Candle[], maxCandles = 30): string {
  const recent = candles.slice(-maxCandles)
  const lines = recent.map(c => {
    const date = new Date(c.time).toISOString().replace('T', ' ').slice(0, 16)
    const body = Math.abs(c.close - c.open)
    const range = c.high - c.low
    const direction = c.close >= c.open ? 'BULL' : 'BEAR'
    return `${date} | O:${c.open.toFixed(4)} H:${c.high.toFixed(4)} L:${c.low.toFixed(4)} C:${c.close.toFixed(4)} V:${Math.round(c.volume)} [${direction} body:${body.toFixed(4)} range:${range.toFixed(4)}]`
  })
  return lines.join('\n')
}
