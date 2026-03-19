import { parse, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns'
import type { DailyPnl } from '@/types'

export function parseMT4Date(dateStr: string): Date {
  return parse(dateStr, 'yyyy.MM.dd HH:mm:ss', new Date())
}

export function formatTradeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'yyyy-MM-dd')
}

export function formatDisplayDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'MMM d, yyyy')
}

export function formatDisplayDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'MMM d, yyyy HH:mm')
}

export function getDaysInMonth(year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1))
  const end = endOfMonth(new Date(year, month - 1))
  return eachDayOfInterval({ start, end })
}

export function getFirstDayOfWeek(year: number, month: number): number {
  return getDay(new Date(year, month - 1, 1))
}

export function groupByDay(dailyPnl: DailyPnl[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const { date, pnl } of dailyPnl) {
    map.set(date, (map.get(date) ?? 0) + pnl)
  }
  return map
}
