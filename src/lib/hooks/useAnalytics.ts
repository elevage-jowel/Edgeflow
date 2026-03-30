'use client'
import { useMemo } from 'react'
import { Trade } from '@/lib/types'
import { computeAnalytics } from '@/lib/utils/calculations'
import { subDays, startOfYear } from 'date-fns'

export type TimeRange = '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL'

export function useAnalytics(trades: Trade[], range: TimeRange = 'ALL') {
  return useMemo(() => {
    const now = new Date()
    let from: Date

    switch (range) {
      case '1W': from = subDays(now, 7); break
      case '1M': from = subDays(now, 30); break
      case '3M': from = subDays(now, 90); break
      case '6M': from = subDays(now, 180); break
      case 'YTD': from = startOfYear(now); break
      case '1Y': from = subDays(now, 365); break
      default: from = new Date(0)
    }

    const filtered = range === 'ALL' ? trades : trades.filter(t => new Date(t.entryDate) >= from)
    return computeAnalytics(filtered)
  }, [trades, range])
}
