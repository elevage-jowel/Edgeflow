import Papa from 'papaparse'
import { parseMT4Date } from './dateUtils'
import type { ParsedTradeRow, Direction } from '@/types'

type RawRow = Record<string, string>

function detectFormat(headers: string[]): 'mt4' | 'mt5' | null {
  const lower = headers.map((h) => h.toLowerCase().trim())
  if (lower.includes('ticket') || lower.includes('open time')) return 'mt4'
  if (lower.includes('deal') || lower.includes('direction')) return 'mt5'
  return null
}

function parseMT4Row(row: RawRow): ParsedTradeRow | null {
  const type = (row['Type'] || row['type'] || '').toLowerCase().trim()
  if (!['buy', 'sell'].includes(type)) return null

  const direction: Direction = type === 'buy' ? 'LONG' : 'SHORT'
  const symbol = (row['Symbol'] || row['Item'] || row['symbol'] || '').trim()
  const externalId = (row['Ticket'] || row['#'] || row['ticket'] || '').trim()
  const quantity = parseFloat(row['Size'] || row['Volume'] || row['volume'] || '0')
  const entryPrice = parseFloat(row['Open Price'] || row['Price'] || row['open price'] || '0')
  const exitPrice = parseFloat(row['Close Price'] || row['close price'] || '0')
  const profit = parseFloat(row['Profit'] || row['profit'] || '0')
  const commission = parseFloat(row['Commission'] || row['commission'] || '0')
  const swap = parseFloat(row['Swap'] || row['swap'] || '0')

  const openTimeStr = row['Open Time'] || row['open time'] || ''
  const closeTimeStr = row['Close Time'] || row['close time'] || ''

  if (!symbol || !openTimeStr || !closeTimeStr) return null

  let entryDate: Date
  let exitDate: Date
  try {
    entryDate = parseMT4Date(openTimeStr)
    exitDate = parseMT4Date(closeTimeStr)
  } catch {
    return null
  }

  return {
    symbol,
    direction,
    entryPrice,
    exitPrice,
    quantity,
    entryDate,
    exitDate,
    profit,
    commission,
    swap,
    externalId: externalId || undefined,
  }
}

interface MT5Deal {
  deal: string
  time: Date
  symbol: string
  type: string
  direction: string
  volume: number
  price: number
  commission: number
  swap: number
  profit: number
  comment: string
  positionId: string
}

function parseMT5Row(row: RawRow): MT5Deal | null {
  const dir = (row['Direction'] || row['direction'] || '').toLowerCase().trim()
  if (dir !== 'out') return null

  const type = (row['Type'] || row['type'] || '').toLowerCase().trim()
  if (!['buy', 'sell'].includes(type)) return null

  const timeStr = row['Time'] || row['time'] || ''
  let time: Date
  try {
    time = parseMT4Date(timeStr)
  } catch {
    return null
  }

  return {
    deal: row['Deal'] || row['deal'] || '',
    time,
    symbol: (row['Symbol'] || row['symbol'] || '').trim(),
    type,
    direction: dir,
    volume: parseFloat(row['Volume'] || row['volume'] || '0'),
    price: parseFloat(row['Price'] || row['price'] || '0'),
    commission: parseFloat(row['Commission'] || row['commission'] || '0'),
    swap: parseFloat(row['Swap'] || row['swap'] || '0'),
    profit: parseFloat(row['Profit'] || row['profit'] || '0'),
    comment: row['Comment'] || row['comment'] || '',
    positionId: row['Position'] || row['position'] || '',
  }
}

function mt5DealsToTrades(rows: RawRow[]): ParsedTradeRow[] {
  const results: ParsedTradeRow[] = []

  for (const row of rows) {
    const deal = parseMT5Row(row)
    if (!deal || !deal.symbol) continue

    const direction: Direction = deal.type === 'buy' ? 'LONG' : 'SHORT'

    results.push({
      symbol: deal.symbol,
      direction,
      entryPrice: 0,
      exitPrice: deal.price,
      quantity: deal.volume,
      entryDate: deal.time,
      exitDate: deal.time,
      profit: deal.profit,
      commission: deal.commission,
      swap: deal.swap,
      externalId: deal.deal || undefined,
    })
  }

  return results
}

export function parseCSVContent(csvText: string): ParsedTradeRow[] {
  const result = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (result.errors.length > 0 || result.data.length === 0) return []

  const headers = Object.keys(result.data[0] || {})
  const format = detectFormat(headers)

  if (format === 'mt4') {
    return result.data.flatMap((row) => {
      const parsed = parseMT4Row(row)
      return parsed ? [parsed] : []
    })
  }

  if (format === 'mt5') {
    return mt5DealsToTrades(result.data)
  }

  return []
}
