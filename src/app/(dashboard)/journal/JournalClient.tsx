'use client'
import { useState } from 'react'
import { useTrades, useTradeActions } from '@/lib/hooks/useTrades'
import { useTradeStore } from '@/lib/stores/tradeStore'
import { Trade } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { TradeForm } from '@/components/journal/TradeForm'
import { TradeDetailPanel } from '@/components/journal/TradeDetailPanel'
import { formatCurrency, formatPnl, formatR, formatDate, getPnlColor } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import toast from 'react-hot-toast'
import {
  Plus, Search, SlidersHorizontal, ChevronUp, ChevronDown,
  BookOpen, Pencil, Trash2, Eye, Filter
} from 'lucide-react'

type SortField = 'entryDate' | 'symbol' | 'netPnl' | 'rMultiple'
type SortDir = 'asc' | 'desc'

export default function JournalClient() {
  const { trades, allTrades, isLoading } = useTrades()
  const { filters, setFilters, resetFilters } = useTradeStore()
  const { deleteTrade } = useTradeActions()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editTrade, setEditTrade] = useState<Trade | null>(null)
  const [viewTrade, setViewTrade] = useState<Trade | null>(null)
  const [sortField, setSortField] = useState<SortField>('entryDate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showFilters, setShowFilters] = useState(false)

  const sorted = [...trades].sort((a, b) => {
    let cmp = 0
    if (sortField === 'entryDate') cmp = a.entryDate.localeCompare(b.entryDate)
    else if (sortField === 'symbol') cmp = a.symbol.localeCompare(b.symbol)
    else if (sortField === 'netPnl') cmp = (a.netPnl ?? 0) - (b.netPnl ?? 0)
    else if (sortField === 'rMultiple') cmp = (a.rMultiple ?? 0) - (b.rMultiple ?? 0)
    return sortDir === 'asc' ? cmp : -cmp
  })

  const handleSort = (field: SortField) => {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this trade?')) return
    try {
      await deleteTrade(id)
      toast.success('Trade deleted')
    } catch {
      toast.error('Failed to delete trade')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (field !== sortField) return <ChevronDown className="w-3 h-3 text-slate-600" />
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-brand-400" /> : <ChevronDown className="w-3 h-3 text-brand-400" />
  }

  const winCount = allTrades.filter(t => (t.netPnl ?? 0) > 0).length
  const totalPnl = allTrades.reduce((s, t) => s + (t.netPnl ?? 0), 0)

  return (
    <div className="space-y-5 max-w-screen-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-2xl font-bold font-mono text-white">{allTrades.length}</div>
            <div className="text-xs text-slate-500">Total Trades</div>
          </div>
          <div className="w-px h-10 bg-surface-500" />
          <div>
            <div className={cn('text-2xl font-bold font-mono', totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {formatPnl(totalPnl)}
            </div>
            <div className="text-xs text-slate-500">Total P&L</div>
          </div>
          <div className="w-px h-10 bg-surface-500 hidden sm:block" />
          <div className="hidden sm:block">
            <div className="text-2xl font-bold font-mono text-white">
              {allTrades.length > 0 ? ((winCount / allTrades.filter(t => t.status !== 'open').length) * 100).toFixed(0) : 0}%
            </div>
            <div className="text-xs text-slate-500">Win Rate</div>
          </div>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsAddOpen(true)}>Add Trade</Button>
      </div>

      {/* Filters */}
      <div className="bg-surface-800 border border-surface-500 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={filters.search ?? ''}
              onChange={e => setFilters({ search: e.target.value })}
              placeholder="Search symbol or notes..."
              className="w-full pl-9 pr-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
          <select
            value={filters.assetClass ?? 'all'}
            onChange={e => setFilters({ assetClass: e.target.value as any })}
            className="px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Assets</option>
            <option value="stocks">Stocks</option>
            <option value="options">Options</option>
            <option value="futures">Futures</option>
            <option value="forex">Forex</option>
            <option value="crypto">Crypto</option>
          </select>
          <select
            value={filters.direction ?? 'all'}
            onChange={e => setFilters({ direction: e.target.value as any })}
            className="px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="all">Both Dirs</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
          <select
            value={filters.outcome ?? 'all'}
            onChange={e => setFilters({ outcome: e.target.value as any })}
            className="px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Results</option>
            <option value="win">Winners</option>
            <option value="loss">Losers</option>
            <option value="breakeven">Breakeven</option>
          </select>
          <button onClick={resetFilters} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Reset</button>
          <div className="ml-auto text-xs text-slate-500">{sorted.length} trade{sorted.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-800 border border-surface-500 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 bg-surface-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No trades found"
            description={allTrades.length === 0 ? "Add your first trade to start tracking performance." : "No trades match your current filters."}
            action={allTrades.length === 0 ? { label: 'Add Trade', onClick: () => setIsAddOpen(true) } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b border-surface-500 bg-surface-900/40">
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => handleSort('entryDate')} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-300 uppercase tracking-wider">
                      Date <SortIcon field="entryDate" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => handleSort('symbol')} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-300 uppercase tracking-wider">
                      Symbol <SortIcon field="symbol" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dir</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Asset</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Entry</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Exit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-right">
                    <button onClick={() => handleSort('netPnl')} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-300 uppercase tracking-wider ml-auto">
                      P&L <SortIcon field="netPnl" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button onClick={() => handleSort('rMultiple')} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-300 uppercase tracking-wider ml-auto">
                      R <SortIcon field="rMultiple" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Strategy</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-600">
                {sorted.map(trade => (
                  <tr key={trade.id} className="hover:bg-surface-700/40 transition-colors group">
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{formatDate(trade.entryDate, 'MMM d')}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-white">{trade.symbol}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={trade.direction === 'long' ? 'long' : 'short'}>
                        {trade.direction === 'long' ? 'L' : 'S'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 capitalize">{trade.assetClass}</td>
                    <td className="px-4 py-3 text-right text-sm font-mono text-slate-300">${trade.entryPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-sm font-mono text-slate-300">
                      {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-mono text-slate-300">{trade.quantity}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn('text-sm font-bold font-mono', getPnlColor(trade.netPnl ?? 0))}>
                        {trade.netPnl !== undefined ? formatPnl(trade.netPnl) : trade.status === 'open' ? <Badge variant="open">Open</Badge> : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn('text-sm font-mono', getPnlColor(trade.rMultiple ?? 0))}>
                        {trade.rMultiple !== undefined ? formatR(trade.rMultiple) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-28 truncate">{trade.strategy ?? '—'}</td>
                    <td className="px-4 py-3">
                      {trade.status === 'open' ? (
                        <Badge variant="open">Open</Badge>
                      ) : trade.netPnl !== undefined ? (
                        <Badge variant={(trade.netPnl ?? 0) > 0 ? 'win' : (trade.netPnl ?? 0) < 0 ? 'loss' : 'breakeven'}>
                          {(trade.netPnl ?? 0) > 0 ? 'Win' : (trade.netPnl ?? 0) < 0 ? 'Loss' : 'B/E'}
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewTrade(trade)} className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-surface-600 flex items-center justify-center transition-all" title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditTrade(trade)} className="w-7 h-7 rounded-lg text-slate-400 hover:text-brand-300 hover:bg-brand-500/10 flex items-center justify-center transition-all" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(trade.id)} className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add trade modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Trade" size="lg">
        <TradeForm onClose={() => setIsAddOpen(false)} />
      </Modal>

      {/* Edit trade modal */}
      <Modal isOpen={!!editTrade} onClose={() => setEditTrade(null)} title="Edit Trade" size="lg">
        {editTrade && <TradeForm trade={editTrade} onClose={() => setEditTrade(null)} />}
      </Modal>

      {/* View trade detail */}
      <Modal isOpen={!!viewTrade} onClose={() => setViewTrade(null)} title="Trade Detail" size="lg">
        {viewTrade && <TradeDetailPanel trade={viewTrade} onEdit={() => { setEditTrade(viewTrade); setViewTrade(null) }} />}
      </Modal>
    </div>
  )
}
