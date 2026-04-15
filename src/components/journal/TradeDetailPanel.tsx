import { useState } from 'react'
import { Trade } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatPnl, formatR, formatDate, getPnlColor } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { Pencil, Star, ExternalLink, Send } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import toast from 'react-hot-toast'

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
  const { userProfile } = useAuthStore()
  const [syncing, setSyncing] = useState(false)

  const syncToNotion = async () => {
    const cfg = userProfile?.notionConfig
    if (!cfg?.integrationToken || !cfg?.databaseId) {
      toast.error('Configure Notion dans les Paramètres d\'abord')
      return
    }
    setSyncing(true)
    try {
      const res = await fetch('/api/notion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: cfg.integrationToken, databaseId: cfg.databaseId, trade }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur')
      toast.success('Trade exporté vers Notion ✓')
    } catch (e: any) {
      toast.error(e.message ?? 'Échec de l\'export Notion')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-xl font-bold text-white">{trade.symbol}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={trade.direction === 'long' ? 'long' : 'short'}>{(trade.direction ?? 'long').toUpperCase()}</Badge>
              <Badge variant="default" className="capitalize">{trade.assetClass}</Badge>
              {trade.status === 'open' && <Badge variant="open">Open</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" icon={Send} size="sm" onClick={syncToNotion} loading={syncing}>Notion</Button>
          <Button variant="outline" icon={Pencil} size="sm" onClick={onEdit}>Edit</Button>
        </div>
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
            {(trade.commission ?? 0) > 0 ? formatCurrency(-(trade.commission ?? 0)) : '$0.00'}
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
        {trade.tradingViewUrl && (
          <Row label="TradingView" value={
            <a href={trade.tradingViewUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-brand-400 hover:text-brand-300 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Voir le graphique
            </a>
          } />
        )}
        <Row label="Setup Rating" value={<RatingStars value={trade.setupRating} />} />
        {trade.setupGrade && (
          <Row label="Grade" value={
            <span className={cn('px-2 py-0.5 rounded text-xs font-bold',
              trade.setupGrade === 'A+' ? 'bg-emerald-500/20 text-emerald-400' :
              trade.setupGrade === 'A' ? 'bg-green-500/20 text-green-400' :
              trade.setupGrade === 'B' ? 'bg-brand-500/20 text-brand-400' :
              trade.setupGrade === 'C' ? 'bg-amber-500/20 text-amber-400' :
              'bg-red-500/20 text-red-400'
            )}>{trade.setupGrade}</span>
          } />
        )}
        <Row label="Execution Rating" value={<RatingStars value={trade.executionRating} />} />
      </div>

      {/* Tags */}
      {(trade.tags ?? []).length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-slate-500 mb-2">Tags</div>
          <div className="flex flex-wrap gap-1.5">
            {(trade.tags ?? []).map(tag => (
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
