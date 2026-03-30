import { Trade } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatPnl, formatR, formatDate, getPnlColor } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { Pencil, Star } from 'lucide-react'

interface TradeDetailPanelProps {
  trade: Trade
  onEdit: () => void
}

function RatingStars({ value }: { value?: number }) {
  if (!value) return <span className="text-xs text-slate-500">—</span>
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn('w-3.5 h-3.5', i < value ? 'text-amber-400 fill-amber-400' : 'text-slate-600')} />
      ))}
    </div>
  )
}

function Row({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-surface-600 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={cn('text-sm font-medium text-white', className)}>{value}</span>
    </div>
  )
}

export function TradeDetailPanel({ trade, onEdit }: TradeDetailPanelProps) {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-xl font-bold text-white">{trade.symbol}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={trade.direction === 'long' ? 'long' : 'short'}>{trade.direction.toUpperCase()}</Badge>
              <Badge variant="default" className="capitalize">{trade.assetClass}</Badge>
              {trade.status === 'open' && <Badge variant="open">Open</Badge>}
            </div>
          </div>
        </div>
        <Button variant="outline" icon={Pencil} size="sm" onClick={onEdit}>Edit</Button>
      </div>

      {/* P&L summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-surface-700/60 rounded-xl p-3 text-center">
          <div className={cn('text-lg font-bold font-mono', getPnlColor(trade.netPnl ?? 0))}>
            {trade.netPnl !== undefined ? formatPnl(trade.netPnl) : '—'}
          </div>
          <div className="text-xs text-slate-500">Net P&L</div>
        </div>
        <div className="bg-surface-700/60 rounded-xl p-3 text-center">
          <div className={cn('text-lg font-bold font-mono', getPnlColor(trade.rMultiple ?? 0))}>
            {trade.rMultiple !== undefined ? formatR(trade.rMultiple) : '—'}
          </div>
          <div className="text-xs text-slate-500">R Multiple</div>
        </div>
        <div className="bg-surface-700/60 rounded-xl p-3 text-center">
          <div className="text-lg font-bold font-mono text-slate-300">
            {trade.commission > 0 ? formatCurrency(-trade.commission) : '$0.00'}
          </div>
          <div className="text-xs text-slate-500">Fees</div>
        </div>
      </div>

      {/* Details */}
      <div className="mb-5">
        <Row label="Entry Date" value={formatDate(trade.entryDate, 'MMM d, yyyy HH:mm')} />
        <Row label="Exit Date" value={trade.exitDate ? formatDate(trade.exitDate, 'MMM d, yyyy HH:mm') : '—'} />
        <Row label="Entry Price" value={<span className="font-mono">${trade.entryPrice.toFixed(2)}</span>} />
        <Row label="Exit Price" value={trade.exitPrice ? <span className="font-mono">${trade.exitPrice.toFixed(2)}</span> : '—'} />
        <Row label="Quantity" value={<span className="font-mono">{trade.quantity}</span>} />
        <Row label="Stop Loss" value={trade.stopLoss ? <span className="font-mono text-red-400">${trade.stopLoss}</span> : '—'} />
        <Row label="Take Profit" value={trade.takeProfit ? <span className="font-mono text-emerald-400">${trade.takeProfit}</span> : '—'} />
        <Row label="Strategy" value={trade.strategy ?? '—'} />
        <Row label="Session" value={trade.session ?? '—'} />
        <Row label="Setup Rating" value={<RatingStars value={trade.setupRating} />} />
        <Row label="Execution Rating" value={<RatingStars value={trade.executionRating} />} />
      </div>

      {/* Tags */}
      {trade.tags.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-slate-500 mb-2">Tags</div>
          <div className="flex flex-wrap gap-1.5">
            {trade.tags.map(tag => (
              <Badge key={tag} variant="brand">{tag}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {trade.notes && (
        <div>
          <div className="text-xs text-slate-500 mb-2">Notes</div>
          <p className="text-sm text-slate-300 bg-surface-700/50 rounded-xl p-3 leading-relaxed">{trade.notes}</p>
        </div>
      )}
    </div>
  )
}
