import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { computeStats } from '@/lib/calculations'
import { StatsCards } from '@/components/stats/StatsCards'
import { EquityCurve } from '@/components/stats/EquityCurve'
import { TradeTable } from '@/components/trades/TradeTable'
import { Button } from '@/components/ui/Button'
import type { Trade } from '@/types'

export default async function DashboardPage() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [allRaw, recentRaw] = await Promise.all([
    prisma.trade.findMany({ orderBy: { exitDate: 'asc' } }),
    prisma.trade.findMany({
      include: { tags: { include: { tag: true } } },
      orderBy: { exitDate: 'desc' },
      take: 10,
    }),
  ])

  const allTrades: Trade[] = allRaw.map((t) => ({
    ...t,
    entryDate: t.entryDate.toISOString(),
    exitDate: t.exitDate.toISOString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    direction: t.direction as Trade['direction'],
  }))

  const recentTrades: Trade[] = recentRaw.map((t) => ({
    ...t,
    entryDate: t.entryDate.toISOString(),
    exitDate: t.exitDate.toISOString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    direction: t.direction as Trade['direction'],
    tags: t.tags.map((tt) => tt.tag),
  }))

  const stats = computeStats(allTrades)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-400">All-time performance overview</p>
        </div>
        <div className="flex gap-2">
          <Link href="/import">
            <Button variant="secondary" size="sm">Import CSV</Button>
          </Link>
          <Link href="/trades/new">
            <Button size="sm">+ Add Trade</Button>
          </Link>
        </div>
      </div>

      {stats.totalTrades === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-16 text-center">
          <p className="text-slate-400 mb-4">No trades yet. Start by adding a trade or importing a CSV.</p>
          <div className="flex justify-center gap-3">
            <Link href="/trades/new">
              <Button>+ Add Trade</Button>
            </Link>
            <Link href="/import">
              <Button variant="secondary">Import CSV</Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <StatsCards stats={stats} />
          <EquityCurve data={stats.equityCurve} />
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-100">Recent Trades</h2>
              <Link href="/trades" className="text-sm text-indigo-400 hover:text-indigo-300">
                View all →
              </Link>
            </div>
            <TradeTable trades={recentTrades} />
          </div>
        </>
      )}
    </div>
  )
}
