import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DirectionBadge } from '@/components/trades/DirectionBadge'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDisplayDateTime } from '@/lib/dateUtils'
import { formatCurrency, pnlClass } from '@/lib/utils'
import { DeleteTradeButton } from './DeleteTradeButton'
import type { Trade } from '@/types'

export default async function TradePage({ params }: { params: Promise<{ id: string }> }) {
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
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-100">{trade.symbol}</h1>
            <DirectionBadge direction={trade.direction} />
          </div>
          <p className="text-sm text-slate-400">
            {formatDisplayDateTime(trade.entryDate)} → {formatDisplayDateTime(trade.exitDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/trades/${id}/edit`}>
            <Button variant="secondary" size="sm">Edit</Button>
          </Link>
          <DeleteTradeButton tradeId={id} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Entry Price', value: trade.entryPrice },
          { label: 'Exit Price', value: trade.exitPrice },
          { label: 'Quantity', value: trade.quantity },
          { label: 'Fees', value: trade.fees },
          { label: 'Commission', value: trade.commission },
          { label: 'Swap', value: trade.swap },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-lg font-semibold text-slate-100">{value}</p>
          </div>
        ))}
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <p className="text-xs text-slate-500 mb-1">P&L</p>
          <p className={`text-lg font-semibold ${pnlClass(trade.pnl)}`}>
            {formatCurrency(trade.pnl)}
          </p>
        </div>
        {trade.setupType && (
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-1">Setup</p>
            <p className="text-lg font-semibold text-slate-100">{trade.setupType}</p>
          </div>
        )}
      </div>

      {trade.tags && trade.tags.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2">Tags</p>
          <div className="flex flex-wrap gap-2">
            {trade.tags.map((tag) => (
              <Badge key={tag.id} color={tag.color}>{tag.name}</Badge>
            ))}
          </div>
        </div>
      )}

      {trade.notes && (
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <p className="text-xs text-slate-500 mb-2">Notes</p>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{trade.notes}</p>
        </div>
      )}
    </div>
  )
}
