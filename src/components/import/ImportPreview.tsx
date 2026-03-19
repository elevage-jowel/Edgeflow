'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DirectionBadge } from '@/components/trades/DirectionBadge'
import { formatCurrency, pnlClass } from '@/lib/utils'
import type { ParsedTradeRow } from '@/types'

interface Props {
  rows: ParsedTradeRow[]
  source: 'mt4' | 'mt5'
  onSuccess: (imported: number, skipped: number) => void
  onReset: () => void
}

export function ImportPreview({ rows, source, onSuccess, onReset }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    setLoading(true)
    setError(null)
    const payload = rows.map((r) => ({
      symbol: r.symbol,
      direction: r.direction,
      entryPrice: r.entryPrice,
      exitPrice: r.exitPrice,
      quantity: r.quantity,
      entryDate: r.entryDate.toISOString(),
      exitDate: r.exitDate.toISOString(),
      profit: r.profit,
      commission: r.commission,
      swap: r.swap,
      externalId: r.externalId,
    }))
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trades: payload, source }),
    })
    if (res.ok) {
      const data = await res.json()
      onSuccess(data.imported, data.skipped)
    } else {
      setError('Import failed. Please try again.')
    }
    setLoading(false)
  }

  const pnlSum = rows.reduce((s, r) => s + r.profit + r.commission + r.swap, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Preview</h2>
          <p className="text-sm text-slate-400">
            {rows.length} trades found ({source.toUpperCase()})
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onReset}>
            Change File
          </Button>
          <Button onClick={confirm} disabled={loading}>
            {loading ? 'Importing...' : 'Confirm Import'}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-700 max-h-96">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-800">
            <tr className="border-b border-slate-700">
              <th className="px-4 py-2 text-left font-medium text-slate-400">Symbol</th>
              <th className="px-4 py-2 text-left font-medium text-slate-400">Dir</th>
              <th className="px-4 py-2 text-right font-medium text-slate-400">Entry</th>
              <th className="px-4 py-2 text-right font-medium text-slate-400">Exit</th>
              <th className="px-4 py-2 text-right font-medium text-slate-400">Qty</th>
              <th className="px-4 py-2 text-right font-medium text-slate-400">P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {rows.slice(0, 200).map((row, i) => {
              const pnl = row.profit + row.commission + row.swap
              return (
                <tr key={i} className="hover:bg-slate-800/40">
                  <td className="px-4 py-2 font-medium text-slate-100">{row.symbol}</td>
                  <td className="px-4 py-2">
                    <DirectionBadge direction={row.direction} />
                  </td>
                  <td className="px-4 py-2 text-right text-slate-300">{row.entryPrice}</td>
                  <td className="px-4 py-2 text-right text-slate-300">{row.exitPrice}</td>
                  <td className="px-4 py-2 text-right text-slate-300">{row.quantity}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${pnlClass(pnl)}`}>
                    {formatCurrency(pnl)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-4 text-sm">
        <span className="text-slate-400">Total P&L:</span>
        <span className={`font-semibold ${pnlClass(pnlSum)}`}>{formatCurrency(pnlSum)}</span>
      </div>
    </div>
  )
}
