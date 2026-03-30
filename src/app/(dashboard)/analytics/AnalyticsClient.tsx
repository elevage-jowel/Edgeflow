'use client'
import { useState } from 'react'
import { useTradeStore } from '@/lib/stores/tradeStore'
import { useAnalytics, TimeRange } from '@/lib/hooks/useAnalytics'
import { EquityCurveChart } from '@/components/charts/EquityCurveChart'
import { DrawdownChart } from '@/components/charts/DrawdownChart'
import { DayOfWeekChart } from '@/components/charts/DayOfWeekChart'
import { MonthlyPnLChart } from '@/components/charts/MonthlyPnLChart'
import { WinRateDonut } from '@/components/charts/WinRateDonut'
import { PnLBarChart } from '@/components/charts/PnLBarChart'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatWinRate, formatR, formatPnl } from '@/lib/utils/formatters'
import { BarChart2, TrendingDown, Target, Zap } from 'lucide-react'

const ranges: TimeRange[] = ['1W', '1M', '3M', '6M', 'YTD', '1Y', 'ALL']
const tabs = ['Overview', 'By Symbol', 'By Day', 'By Session', 'Distribution']

interface MetricItemProps { label: string; value: string; sub?: string; color?: string }
function MetricItem({ label, value, sub, color }: MetricItemProps) {
  return (
    <div className="bg-surface-700/50 rounded-xl p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={cn('text-lg font-bold font-mono', color ?? 'text-white')}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function AnalyticsClient() {
  const { trades } = useTradeStore()
  const [range, setRange] = useState<TimeRange>('3M')
  const [tab, setTab] = useState('Overview')
  const a = useAnalytics(trades, range)

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Performance Analytics</h2>
          <p className="text-sm text-slate-500">Deep insights into your trading performance</p>
        </div>
        <div className="flex items-center gap-1 bg-surface-800 border border-surface-500 rounded-xl p-1">
          {ranges.map(r => (
            <button key={r} onClick={() => setRange(r)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', range === r ? 'bg-brand-600/30 text-brand-300 border border-brand-600/30' : 'text-slate-400 hover:text-white')}>{r}</button>
          ))}
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricItem label="Net P&L" value={formatPnl(a.totalNetPnl)} color={a.totalNetPnl >= 0 ? 'text-emerald-400' : 'text-red-400'} sub={`${a.closedTrades} trades`} />
        <MetricItem label="Win Rate" value={formatWinRate(a.winRate)} sub={`${a.winCount}W/${a.lossCount}L`} />
        <MetricItem label="Profit Factor" value={a.profitFactor.toFixed(2)} color={a.profitFactor >= 2 ? 'text-emerald-400' : a.profitFactor >= 1.5 ? 'text-brand-400' : 'text-slate-300'} />
        <MetricItem label="Avg R" value={formatR(a.avgRMultiple)} color={a.avgRMultiple > 0 ? 'text-emerald-400' : 'text-red-400'} />
        <MetricItem label="Sharpe Ratio" value={a.sharpeRatio.toFixed(2)} color={a.sharpeRatio > 1 ? 'text-emerald-400' : 'text-slate-300'} />
        <MetricItem label="Max Drawdown" value={a.maxDrawdown > 0 ? `-${formatCurrency(a.maxDrawdown)}` : '$0'} color="text-red-400" sub={`${a.maxDrawdownPct.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricItem label="Expectancy" value={formatCurrency(a.expectancy)} color={a.expectancy > 0 ? 'text-emerald-400' : 'text-red-400'} sub="per trade" />
        <MetricItem label="Avg Winner" value={a.avgWin > 0 ? formatCurrency(a.avgWin) : '—'} color="text-emerald-400" />
        <MetricItem label="Avg Loser" value={a.avgLoss > 0 ? formatCurrency(-a.avgLoss) : '—'} color="text-red-400" />
        <MetricItem label="Sortino" value={a.sortinoRatio.toFixed(2)} color={a.sortinoRatio > 1.5 ? 'text-emerald-400' : 'text-slate-300'} />
        <MetricItem label="Recovery Factor" value={a.recoveryFactor > 0 ? a.recoveryFactor.toFixed(2) : '—'} />
        <MetricItem label="Win Streak" value={`${a.longestWinStreak}`} sub="trades" color="text-amber-400" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-800 border border-surface-500 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === t ? 'bg-surface-600 text-white' : 'text-slate-400 hover:text-white')}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Equity Curve</h3>
            {a.equityCurve.length > 1 ? <EquityCurveChart data={a.equityCurve} height={240} /> : <div className="h-48 flex items-center justify-center text-slate-500 text-sm">Not enough data</div>}
          </div>
          <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Drawdown</h3>
            {a.equityCurve.length > 1 ? <DrawdownChart equityCurve={a.equityCurve} height={240} /> : <div className="h-48 flex items-center justify-center text-slate-500 text-sm">Not enough data</div>}
          </div>
          <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Monthly P&L</h3>
            {a.monthlyPnl.length > 0 ? <MonthlyPnLChart data={a.monthlyPnl} height={200} /> : <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data</div>}
          </div>
          <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Win/Loss Distribution</h3>
            <WinRateDonut wins={a.winCount} losses={a.lossCount} breakevens={a.breakevenCount} height={200} />
          </div>
        </div>
      )}

      {tab === 'By Symbol' && (
        <div className="bg-surface-800 border border-surface-500 rounded-2xl overflow-hidden">
          {a.bySymbol.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No closed trade data</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-500">
                  {['Symbol', 'Trades', 'Win Rate', 'Net P&L', 'Avg R', 'Best', 'Worst'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-600">
                {a.bySymbol.map(s => (
                  <tr key={s.symbol} className="hover:bg-surface-700/40 transition-colors">
                    <td className="px-5 py-3 text-sm font-bold text-white">{s.symbol}</td>
                    <td className="px-5 py-3 text-sm text-slate-300 font-mono">{s.trades}</td>
                    <td className="px-5 py-3 text-sm font-mono">
                      <span className={s.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}>{s.winRate.toFixed(0)}%</span>
                    </td>
                    <td className="px-5 py-3 text-sm font-bold font-mono">
                      <span className={s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatPnl(s.pnl)}</span>
                    </td>
                    <td className="px-5 py-3 text-sm font-mono">
                      <span className={s.avgR >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatR(s.avgR)}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">—</td>
                    <td className="px-5 py-3 text-xs text-slate-500">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'By Day' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">P&L by Day of Week</h3>
            <DayOfWeekChart data={a.byDayOfWeek} height={220} />
          </div>
          <div className="bg-surface-800 border border-surface-500 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-500">
                  {['Day', 'Trades', 'Win Rate', 'Net P&L'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-600">
                {a.byDayOfWeek.map(d => (
                  <tr key={d.day} className="hover:bg-surface-700/40">
                    <td className="px-5 py-3 text-sm font-medium text-white">{d.day}</td>
                    <td className="px-5 py-3 text-sm text-slate-300 font-mono">{d.trades}</td>
                    <td className="px-5 py-3 text-sm font-mono">
                      <span className={d.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}>{d.winRate.toFixed(0)}%</span>
                    </td>
                    <td className="px-5 py-3 text-sm font-bold font-mono">
                      <span className={d.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatPnl(d.pnl)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'By Session' && (
        <div className="bg-surface-800 border border-surface-500 rounded-2xl overflow-hidden">
          {a.bySession.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No session data</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-500">
                  {['Session', 'Trades', 'Win Rate', 'Net P&L'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-600">
                {a.bySession.sort((a, b) => b.pnl - a.pnl).map(s => (
                  <tr key={s.session} className="hover:bg-surface-700/40">
                    <td className="px-5 py-3 text-sm font-medium text-white">{s.session}</td>
                    <td className="px-5 py-3 text-sm text-slate-300 font-mono">{s.trades}</td>
                    <td className="px-5 py-3 text-sm font-mono"><span className={s.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}>{s.winRate.toFixed(0)}%</span></td>
                    <td className="px-5 py-3 text-sm font-bold font-mono"><span className={s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatPnl(s.pnl)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'Distribution' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-emerald-400 mb-4">Winner Distribution</h3>
            {a.winDistribution.length > 0 ? (
              <div className="space-y-2">
                {a.winDistribution.map(d => (
                  <div key={d.range} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-28">{d.range}</span>
                    <div className="flex-1 bg-surface-600 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(d.count / Math.max(...a.winDistribution.map(x => x.count))) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-300 w-6 text-right font-mono">{d.count}</span>
                  </div>
                ))}
              </div>
            ) : <div className="h-32 flex items-center justify-center text-slate-500 text-sm">No wins yet</div>}
          </div>
          <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-red-400 mb-4">Loser Distribution</h3>
            {a.lossDistribution.length > 0 ? (
              <div className="space-y-2">
                {a.lossDistribution.map(d => (
                  <div key={d.range} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-28">{d.range}</span>
                    <div className="flex-1 bg-surface-600 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: `${(d.count / Math.max(...a.lossDistribution.map(x => x.count))) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-300 w-6 text-right font-mono">{d.count}</span>
                  </div>
                ))}
              </div>
            ) : <div className="h-32 flex items-center justify-center text-slate-500 text-sm">No losses yet</div>}
          </div>
        </div>
      )}
    </div>
  )
}
