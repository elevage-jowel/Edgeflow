import { Card, CardTitle } from '@/components/ui/Card'
import { formatCurrency, pnlClass } from '@/lib/utils'
import type { TradeStats } from '@/types'

interface Props {
  stats: TradeStats
}

export function StatsCards({ stats }: Props) {
  const pf =
    stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardTitle>Total P&L</CardTitle>
        <p className={`text-2xl font-bold ${pnlClass(stats.totalPnl)}`}>
          {formatCurrency(stats.totalPnl)}
        </p>
      </Card>
      <Card>
        <CardTitle>Win Rate</CardTitle>
        <p className="text-2xl font-bold text-slate-100">
          {stats.winRate.toFixed(1)}%
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {stats.winningTrades}W / {stats.losingTrades}L / {stats.totalTrades} total
        </p>
      </Card>
      <Card>
        <CardTitle>Profit Factor</CardTitle>
        <p className="text-2xl font-bold text-slate-100">{pf}</p>
        <p className="text-xs text-slate-500 mt-1">
          Expectancy: {formatCurrency(stats.expectancy)}
        </p>
      </Card>
      <Card>
        <CardTitle>Max Drawdown</CardTitle>
        <p className="text-2xl font-bold text-rose-400">
          {formatCurrency(stats.maxDrawdown)}
        </p>
        <p className="text-xs text-slate-500 mt-1">{stats.maxDrawdownPct.toFixed(2)}%</p>
      </Card>
    </div>
  )
}
