import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { computeDailyPnl } from '@/lib/calculations'
import { CalendarHeatmap } from '@/components/calendar/CalendarHeatmap'
import { formatCurrency, pnlClass } from '@/lib/utils'
import type { Trade } from '@/types'

interface SearchParams { year?: string; month?: string }

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const now = new Date()
  const year = parseInt(sp.year || String(now.getFullYear()))
  const month = parseInt(sp.month || String(now.getMonth() + 1))

  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  const raw = await prisma.trade.findMany({
    where: { exitDate: { gte: startDate, lte: endDate } },
    orderBy: { exitDate: 'asc' },
  })

  const trades: Trade[] = raw.map((t) => ({
    ...t,
    entryDate: t.entryDate.toISOString(),
    exitDate: t.exitDate.toISOString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    direction: t.direction as Trade['direction'],
  }))

  const dailyPnlArr = computeDailyPnl(trades)
  const dailyPnlMap = new Map(dailyPnlArr.map(({ date, pnl }) => [date, pnl]))
  const monthTotal = trades.reduce((s, t) => s + t.pnl, 0)

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  const monthName = startDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Calendar</h1>
          <p className="text-sm text-slate-400">Daily P&L heatmap</p>
        </div>
        <div className={`text-lg font-semibold ${pnlClass(monthTotal)}`}>
          {formatCurrency(monthTotal)}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Link
          href={`/calendar?year=${prevYear}&month=${prevMonth}`}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
        >
          ← Prev
        </Link>
        <h2 className="text-lg font-semibold text-slate-100">{monthName}</h2>
        <Link
          href={`/calendar?year=${nextYear}&month=${nextMonth}`}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
        >
          Next →
        </Link>
      </div>

      <CalendarHeatmap year={year} month={month} dailyPnl={dailyPnlMap} />
    </div>
  )
}
