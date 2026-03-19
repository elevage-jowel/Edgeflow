import Link from 'next/link'
import { DirectionBadge } from './DirectionBadge'
import { Badge } from '@/components/ui/Badge'
import { formatDisplayDateTime } from '@/lib/dateUtils'
import { formatCurrency, pnlClass } from '@/lib/utils'
import type { Trade } from '@/types'

interface Props {
  trades: Trade[]
}

export function TradeTable({ trades }: Props) {
  if (trades.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500">
        No trades found. Add your first trade or import a CSV.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800/50">
            <th className="px-4 py-3 text-left font-medium text-slate-400">Exit Date</th>
            <th className="px-4 py-3 text-left font-medium text-slate-400">Symbol</th>
            <th className="px-4 py-3 text-left font-medium text-slate-400">Dir</th>
            <th className="px-4 py-3 text-right font-medium text-slate-400">Entry</th>
            <th className="px-4 py-3 text-right font-medium text-slate-400">Exit</th>
            <th className="px-4 py-3 text-right font-medium text-slate-400">Qty</th>
            <th className="px-4 py-3 text-right font-medium text-slate-400">P&L</th>
            <th className="px-4 py-3 text-left font-medium text-slate-400">Tags</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {trades.map((trade) => (
            <tr key={trade.id} className="hover:bg-slate-800/40 transition-colors">
              <td className="px-4 py-3 text-slate-300">{formatDisplayDateTime(trade.exitDate)}</td>
              <td className="px-4 py-3 font-medium text-slate-100">{trade.symbol}</td>
              <td className="px-4 py-3">
                <DirectionBadge direction={trade.direction} />
              </td>
              <td className="px-4 py-3 text-right text-slate-300">{trade.entryPrice}</td>
              <td className="px-4 py-3 text-right text-slate-300">{trade.exitPrice}</td>
              <td className="px-4 py-3 text-right text-slate-300">{trade.quantity}</td>
              <td className={`px-4 py-3 text-right font-semibold ${pnlClass(trade.pnl)}`}>
                {formatCurrency(trade.pnl)}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {trade.tags?.map((tag) => (
                    <Badge key={tag.id} color={tag.color}>
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/trades/${trade.id}`}
                  className="text-indigo-400 hover:text-indigo-300 text-xs"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
