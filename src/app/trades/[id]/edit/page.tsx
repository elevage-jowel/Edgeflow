import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { TradeForm } from '@/components/trades/TradeForm'
import type { Trade } from '@/types'

export default async function EditTradePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const raw = await prisma.trade.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } } },
  })
  if (!raw) notFound()

  const trade: Trade = {
    ...raw,
    entryDate: raw.entryDate.toISOString(),
    exitDate: raw.exitDate.toISOString(),
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    direction: raw.direction as Trade['direction'],
    tags: raw.tags.map((tt) => tt.tag),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Edit Trade</h1>
        <p className="text-sm text-slate-400">{trade.symbol} — {trade.direction}</p>
      </div>
      <TradeForm trade={trade} />
    </div>
  )
}
