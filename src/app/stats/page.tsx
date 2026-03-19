import { prisma } from '@/lib/prisma'
import { computeStats } from '@/lib/calculations'
import { StatsCards } from '@/components/stats/StatsCards'
import { EquityCurve } from '@/components/stats/EquityCurve'
import { WinLossChart } from '@/components/stats/WinLossChart'
import { DrawdownChart } from '@/components/stats/DrawdownChart'
import type { Trade } from '@/types'

export default async function StatsPage() {
  const raw = await prisma.trade.findMany({ orderBy: { exitDate: 'asc' } })
  const trades: Trade[] = raw.map((t) => ({
    ...t,
    entryDate: t.entryDate.toISOString(),
    exitDate: t.exitDate.toISOString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    direction: t.direction as Trade['direction'],
  }))

  const stats = computeStats(trades)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Statistics</h1>
        <p className="text-sm text-slate-400">All-time performance metrics</p>
      </div>
      <StatsCards stats={stats} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EquityCurve data={stats.equityCurve} />
        <DrawdownChart equityCurve={stats.equityCurve} />
        <WinLossChart data={stats.dailyPnl} />
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Summary</h3>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            {[
              ['Gross Profit', `$${stats.grossProfit.toFixed(2)}`],
              ['Gross Loss', `$${stats.grossLoss.toFixed(2)}`],
              ['Avg Win', `$${stats.avgWin.toFixed(2)}`],
              ['Avg Loss', `$${stats.avgLoss.toFixed(2)}`],
              ['Expectancy', `$${stats.expectancy.toFixed(2)}`],
              ['Total Trades', stats.totalTrades],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-slate-100 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
