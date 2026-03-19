import Link from 'next/link'
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { TradeTable } from '@/components/trades/TradeTable'
import { TradeFilters } from '@/components/trades/TradeFilters'
import { Button } from '@/components/ui/Button'
import type { Trade } from '@/types'

interface SearchParams {
  page?: string
  symbol?: string
  direction?: string
  dateFrom?: string
  dateTo?: string
}

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || '1'))
  const limit = 20

  const where = {
    ...(sp.symbol && { symbol: { contains: sp.symbol.toUpperCase() } }),
    ...(sp.direction && { direction: sp.direction }),
    ...(sp.dateFrom || sp.dateTo
      ? {
          exitDate: {
            ...(sp.dateFrom && { gte: new Date(sp.dateFrom) }),
            ...(sp.dateTo && { lte: new Date(sp.dateTo + 'T23:59:59') }),
          },
        }
      : {}),
  }

  const [trades, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: { exitDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.trade.count({ where }),
  ])

  const formatted: Trade[] = trades.map((t) => ({
    ...t,
    entryDate: t.entryDate.toISOString(),
    exitDate: t.exitDate.toISOString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    direction: t.direction as Trade['direction'],
    tags: t.tags.map((tt) => tt.tag),
  }))

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Trades</h1>
          <p className="text-sm text-slate-400">{total} total trades</p>
        </div>
        <Link href="/trades/new">
          <Button>+ Add Trade</Button>
        </Link>
      </div>

      <Suspense>
        <TradeFilters />
      </Suspense>

      <TradeTable trades={formatted} />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/trades?page=${p}`}
              className={`rounded-md px-3 py-1.5 text-sm ${
                p === page
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-700'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
