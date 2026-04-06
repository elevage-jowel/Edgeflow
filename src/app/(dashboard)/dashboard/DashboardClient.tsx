'use client'
import { useState } from 'react'
import { useTradeStore } from '@/lib/stores/tradeStore'
import { useAnalytics, TimeRange } from '@/lib/hooks/useAnalytics'
import { useAuthStore } from '@/lib/stores/authStore'
import { StatCard } from '@/components/ui/StatCard'
import { EquityCurveChart } from '@/components/charts/EquityCurveChart'
import { PnLBarChart } from '@/components/charts/PnLBarChart'
import { WinRateDonut } from '@/components/charts/WinRateDonut'
import { MonthlyPnLChart } from '@/components/charts/MonthlyPnLChart'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatPnl, formatWinRate, formatR, formatDate, getPnlColor } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, BarChart2, Target, Zap, DollarSign,
  Activity, Award, BookOpen, ArrowRight, Flame
} from 'lucide-react'
import { PointsWidget } from '@/components/scoring/PointsWidget'
import { defaultUserPoints } from '@/lib/scoring/planEngine'

const ranges: TimeRange[] = ['1W', '1M', '3M', '6M', 'YTD', '1Y', 'ALL']

export default function DashboardClient() {
  const { userProfile } = useAuthStore()
  const { trades, isLoading } = useTradeStore()
  const [range, setRange] = useState<TimeRange>('3M')
  const analytics = useAnalytics(trades, range)

  const recentTrades = trades.filter(t => t.status !== 'open').slice(0, 8)
  const openTrades = trades.filter(t => t.status === 'open')

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">
            Welcome back, {userProfile?.displayName?.split(' ')[0] ?? 'Trader'} 👋
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Here&apos;s your performance overview</p>
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-1 bg-surface-800 border border-surface-500 rounded-xl p-1">
          {ranges.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                range === r ? 'bg-brand-600/30 text-brand-300 border border-brand-600/30' : 'text-slate-400 hover:text-white'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        <StatCard
          title="Net P&L"
          value={formatPnl(analytics.totalNetPnl)}
          valueColor={analytics.totalNetPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}
          sub="closed trades"
          icon={analytics.totalNetPnl >= 0 ? TrendingUp : TrendingDown}
          iconColor={analytics.totalNetPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}
          loading={isLoading}
        />
        <StatCard
          title="Win Rate"
          value={formatWinRate(analytics.winRate)}
          sub={`${analytics.winCount}W / ${analytics.lossCount}L`}
          icon={Target}
          iconColor="text-brand-400"
          loading={isLoading}
        />
        <StatCard
          title="Profit Factor"
          value={analytics.profitFactor > 0 ? analytics.profitFactor.toFixed(2) : '—'}
          sub={analytics.profitFactor >= 2 ? 'Excellent' : analytics.profitFactor >= 1.5 ? 'Good' : 'Developing'}
          icon={BarChart2}
          iconColor="text-cyan-400"
          loading={isLoading}
        />
        <StatCard
          title="Avg R Multiple"
          value={analytics.avgRMultiple !== 0 ? formatR(analytics.avgRMultiple) : '—'}
          sub={`${analytics.closedTrades} closed trades`}
          icon={Activity}
          iconColor="text-violet-400"
          loading={isLoading}
        />
        <StatCard
          title="Avg Winner"
          value={analytics.avgWin > 0 ? formatCurrency(analytics.avgWin) : '—'}
          valueColor="text-emerald-400"
          icon={Award}
          iconColor="text-emerald-400"
          loading={isLoading}
        />
        <StatCard
          title="Avg Loser"
          value={analytics.avgLoss > 0 ? formatCurrency(-analytics.avgLoss) : '—'}
          valueColor="text-red-400"
          icon={TrendingDown}
          iconColor="text-red-400"
          loading={isLoading}
        />
        <StatCard
          title="Expectancy"
          value={analytics.expectancy !== 0 ? formatCurrency(analytics.expectancy) : '—'}
          valueColor={analytics.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}
          sub="per trade"
          icon={DollarSign}
          iconColor={analytics.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}
          loading={isLoading}
        />
        <StatCard
          title="Current Streak"
          value={analytics.currentStreak === 0 ? '—' : `${Math.abs(analytics.currentStreak)}${analytics.currentStreak > 0 ? '🔥' : '❄️'}`}
          sub={analytics.currentStreak > 0 ? 'win streak' : analytics.currentStreak < 0 ? 'loss streak' : ''}
          icon={Flame}
          iconColor={analytics.currentStreak > 0 ? 'text-amber-400' : 'text-slate-400'}
          loading={isLoading}
        />
      </div>

      {/* Discipline Score widget */}
      <PointsWidget points={userProfile?.points ?? defaultUserPoints()} />

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Equity curve */}
        <div className="xl:col-span-2 bg-surface-800 border border-surface-500 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Equity Curve</h3>
              <p className="text-xs text-slate-500 mt-0.5">Cumulative P&L over time</p>
            </div>
            <div className={cn('text-lg font-bold font-mono', analytics.totalNetPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {formatPnl(analytics.totalNetPnl)}
            </div>
          </div>
          {analytics.equityCurve.length > 1 ? (
            <EquityCurveChart data={analytics.equityCurve} height={220} />
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
              {isLoading ? 'Loading...' : 'Not enough data yet. Add more trades.'}
            </div>
          )}
        </div>

        {/* Win rate donut */}
        <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Win/Loss Ratio</h3>
          <p className="text-xs text-slate-500 mb-2">{analytics.closedTrades} closed trades</p>
          <WinRateDonut wins={analytics.winCount} losses={analytics.lossCount} breakevens={analytics.breakevenCount} height={180} />
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: 'Wins', value: analytics.winCount, color: 'text-emerald-400' },
              { label: 'Losses', value: analytics.lossCount, color: 'text-red-400' },
              { label: 'B/E', value: analytics.breakevenCount, color: 'text-slate-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <div className={cn('text-base font-bold font-mono', color)}>{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily P&L and Monthly P&L */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Daily P&L</h3>
          {analytics.dailyPnl.length > 0 ? (
            <PnLBarChart data={analytics.dailyPnl.slice(-30).map(d => ({ ...d, date: d.date.slice(5) }))} height={180} />
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-500 text-sm">No data</div>
          )}
        </div>
        <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Monthly Performance</h3>
          {analytics.monthlyPnl.length > 0 ? (
            <MonthlyPnLChart data={analytics.monthlyPnl} height={180} />
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-500 text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Bottom row: recent trades + open positions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent trades */}
        <div className="xl:col-span-2 bg-surface-800 border border-surface-500 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-500">
            <h3 className="text-sm font-semibold text-white">Recent Trades</h3>
            <Link href="/journal" className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-surface-700 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentTrades.length === 0 ? (
            <EmptyState icon={BookOpen} title="No trades yet" description="Add your first trade to see it here." action={{ label: 'Add Trade', onClick: () => {} }} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-500">
                    {['Symbol', 'Direction', 'Entry', 'Exit', 'P&L', 'R', 'Date'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-600">
                  {recentTrades.map(trade => (
                    <tr key={trade.id} className="hover:bg-surface-700/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{trade.symbol}</span>
                          <span className="text-xs text-slate-500">{trade.assetClass}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={trade.direction === 'long' ? 'long' : 'short'}>
                          {trade.direction.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono">${trade.entryPrice}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono">{trade.exitPrice ? `$${trade.exitPrice}` : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-sm font-bold font-mono', getPnlColor(trade.netPnl ?? 0))}>
                          {trade.netPnl !== undefined ? formatPnl(trade.netPnl) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-sm font-mono', getPnlColor(trade.rMultiple ?? 0))}>
                          {trade.rMultiple !== undefined ? formatR(trade.rMultiple) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(trade.entryDate, 'MMM d')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary stats */}
        <div className="space-y-4">
          {/* Open positions */}
          <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Open Positions</h3>
            {openTrades.length === 0 ? (
              <p className="text-xs text-slate-500">No open positions</p>
            ) : (
              <div className="space-y-2">
                {openTrades.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="open">OPEN</Badge>
                      <span className="text-sm font-semibold text-white">{t.symbol}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">${t.entryPrice} × {t.quantity}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Key metrics */}
          <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Key Metrics</h3>
            <div className="space-y-3">
              {[
                { label: 'Max Drawdown', value: analytics.maxDrawdown > 0 ? `-${formatCurrency(analytics.maxDrawdown)}` : '$0.00', color: 'text-red-400' },
                { label: 'Sharpe Ratio', value: analytics.sharpeRatio.toFixed(2), color: analytics.sharpeRatio > 1 ? 'text-emerald-400' : 'text-slate-300' },
                { label: 'Best Day', value: analytics.bestDay ? formatCurrency(analytics.bestDay.pnl) : '—', color: 'text-emerald-400' },
                { label: 'Worst Day', value: analytics.worstDay ? formatCurrency(analytics.worstDay.pnl) : '—', color: 'text-red-400' },
                { label: 'Total Trades', value: String(analytics.totalTrades), color: 'text-white' },
                { label: 'Win Streak', value: `${analytics.longestWinStreak} trades`, color: 'text-amber-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className={cn('text-xs font-semibold font-mono', color)}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
