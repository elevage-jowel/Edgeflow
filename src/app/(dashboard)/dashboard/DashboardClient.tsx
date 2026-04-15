'use client'
import { useState, useMemo } from 'react'
import { useTradeStore } from '@/lib/stores/tradeStore'
import { useAnalytics, TimeRange } from '@/lib/hooks/useAnalytics'
import { useAuthStore } from '@/lib/stores/authStore'
import { startOfWeek, endOfWeek, format, parseISO, subWeeks } from 'date-fns'
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
import { InsightsWidget } from '@/components/insights/InsightsWidget'

const ranges: TimeRange[] = ['1W', '1M', '3M', '6M', 'YTD', '1Y', 'ALL']

export default function DashboardClient() {
  const { userProfile } = useAuthStore()
  const { trades, isLoading } = useTradeStore()
  const [range, setRange] = useState<TimeRange>('3M')
  const analytics = useAnalytics(trades, range)

  const recentTrades = trades.filter(t => t.status !== 'open').slice(0, 8)
  const openTrades = trades.filter(t => t.status === 'open')

  // Weekly summary (current week Mon-Sun)
  const weeklyStats = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const prevStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
    const prevEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })

    const inRange = (t: typeof trades[0], s: Date, e: Date) => {
      try {
        const d = parseISO(t.exitDate ?? t.entryDate)
        return d >= s && d <= e && t.status === 'closed'
      } catch { return false }
    }

    const curr = trades.filter(t => inRange(t, weekStart, weekEnd))
    const prev = trades.filter(t => inRange(t, prevStart, prevEnd))

    const stats = (ts: typeof trades) => {
      const pnl = ts.reduce((s, t) => s + (t.netPnl ?? 0), 0)
      const wins = ts.filter(t => (t.netPnl ?? 0) > 0).length
      return { pnl, trades: ts.length, winRate: ts.length > 0 ? (wins / ts.length) * 100 : 0 }
    }

    return {
      curr: stats(curr),
      prev: stats(prev),
      weekStart: format(weekStart, 'MMM d'),
      weekEnd: format(weekEnd, 'MMM d'),
    }
  }, [trades])

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">
            Bon retour, {userProfile?.displayName?.split(' ')[0] ?? 'Trader'} 👋
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Voici ton aperçu de performance</p>
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
          sub="trades fermés"
          icon={analytics.totalNetPnl >= 0 ? TrendingUp : TrendingDown}
          iconColor={analytics.totalNetPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}
          loading={isLoading}
        />
        <StatCard
          title="Taux de réussite"
          value={formatWinRate(analytics.winRate)}
          sub={`${analytics.winCount}W / ${analytics.lossCount}L`}
          icon={Target}
          iconColor="text-brand-400"
          loading={isLoading}
        />
        <StatCard
          title="Profit Factor"
          value={analytics.profitFactor > 0 ? analytics.profitFactor.toFixed(2) : '—'}
          sub={analytics.profitFactor >= 2 ? 'Excellent' : analytics.profitFactor >= 1.5 ? 'Bon' : 'En développement'}
          icon={BarChart2}
          iconColor="text-cyan-400"
          loading={isLoading}
        />
        <StatCard
          title="R moyen"
          value={analytics.avgRMultiple !== 0 ? formatR(analytics.avgRMultiple) : '—'}
          sub={`${analytics.closedTrades} trades fermés`}
          icon={Activity}
          iconColor="text-violet-400"
          loading={isLoading}
        />
        <StatCard
          title="Gain moyen"
          value={analytics.avgWin > 0 ? formatCurrency(analytics.avgWin) : '—'}
          valueColor="text-emerald-400"
          icon={Award}
          iconColor="text-emerald-400"
          loading={isLoading}
        />
        <StatCard
          title="Perte moyenne"
          value={analytics.avgLoss > 0 ? formatCurrency(-analytics.avgLoss) : '—'}
          valueColor="text-red-400"
          icon={TrendingDown}
          iconColor="text-red-400"
          loading={isLoading}
        />
        <StatCard
          title="Espérance"
          value={analytics.expectancy !== 0 ? formatCurrency(analytics.expectancy) : '—'}
          valueColor={analytics.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}
          sub="par trade"
          icon={DollarSign}
          iconColor={analytics.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}
          loading={isLoading}
        />
        <StatCard
          title="Série en cours"
          value={analytics.currentStreak === 0 ? '—' : `${Math.abs(analytics.currentStreak)}${analytics.currentStreak > 0 ? '🔥' : '❄️'}`}
          sub={analytics.currentStreak > 0 ? 'série gagnante' : analytics.currentStreak < 0 ? 'série perdante' : ''}
          icon={Flame}
          iconColor={analytics.currentStreak > 0 ? 'text-amber-400' : 'text-slate-400'}
          loading={isLoading}
        />
      </div>

      {/* Discipline Score widget */}
      <PointsWidget points={userProfile?.points ?? defaultUserPoints()} />

      {/* AI Insights */}
      <InsightsWidget />

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Equity curve */}
        <div className="xl:col-span-2 bg-surface-800 border border-surface-500 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Courbe des capitaux</h3>
              <p className="text-xs text-slate-500 mt-0.5">P&L cumulatif dans le temps</p>
            </div>
            <div className={cn('text-lg font-bold font-mono', analytics.totalNetPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {formatPnl(analytics.totalNetPnl)}
            </div>
          </div>
          {analytics.equityCurve.length > 1 ? (
            <EquityCurveChart data={analytics.equityCurve} height={220} />
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
              {isLoading ? 'Chargement...' : 'Pas assez de données. Ajoute plus de trades.'}
            </div>
          )}
        </div>

        {/* Win rate donut */}
        <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Ratio Gains/Pertes</h3>
          <p className="text-xs text-slate-500 mb-2">{analytics.closedTrades} trades fermés</p>
          <WinRateDonut wins={analytics.winCount} losses={analytics.lossCount} breakevens={analytics.breakevenCount} height={180} />
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: 'Gains', value: analytics.winCount, color: 'text-emerald-400' },
              { label: 'Pertes', value: analytics.lossCount, color: 'text-red-400' },
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
          <h3 className="text-sm font-semibold text-white mb-4">P&L journalier</h3>
          {analytics.dailyPnl.length > 0 ? (
            <PnLBarChart data={analytics.dailyPnl.slice(-30).map(d => ({ ...d, date: d.date.slice(5) }))} height={180} />
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-500 text-sm">Aucune donnée</div>
          )}
        </div>
        <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Performance mensuelle</h3>
          {analytics.monthlyPnl.length > 0 ? (
            <MonthlyPnLChart data={analytics.monthlyPnl} height={180} />
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-500 text-sm">Aucune donnée</div>
          )}
        </div>
      </div>

      {/* Weekly summary */}
      <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Semaine en cours</h3>
            <p className="text-xs text-slate-500 mt-0.5">{weeklyStats.weekStart} → {weeklyStats.weekEnd}</p>
          </div>
          {weeklyStats.prev.trades > 0 && (
            <div className="text-right">
              <div className="text-xs text-slate-500 mb-0.5">Semaine précédente</div>
              <div className={cn('text-sm font-bold font-mono', weeklyStats.prev.pnl >= 0 ? 'text-emerald-400/60' : 'text-red-400/60')}>
                {formatPnl(weeklyStats.prev.pnl)}
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'P&L hebdo',
              value: weeklyStats.curr.trades > 0 ? formatPnl(weeklyStats.curr.pnl) : '—',
              color: weeklyStats.curr.pnl >= 0 ? 'text-emerald-400' : 'text-red-400',
              sub: weeklyStats.prev.trades > 0 ? (() => {
                const diff = weeklyStats.curr.pnl - weeklyStats.prev.pnl
                return `${diff >= 0 ? '+' : ''}${formatCurrency(diff)} vs sem. préc.`
              })() : undefined,
            },
            {
              label: 'Trades',
              value: String(weeklyStats.curr.trades),
              color: 'text-white',
              sub: weeklyStats.prev.trades > 0 ? `${weeklyStats.prev.trades} la sem. préc.` : undefined,
            },
            {
              label: 'Taux de réussite',
              value: weeklyStats.curr.trades > 0 ? `${weeklyStats.curr.winRate.toFixed(0)}%` : '—',
              color: weeklyStats.curr.winRate >= 50 ? 'text-emerald-400' : weeklyStats.curr.winRate > 0 ? 'text-red-400' : 'text-slate-400',
              sub: weeklyStats.prev.trades > 0 ? `${weeklyStats.prev.winRate.toFixed(0)}% la sem. préc.` : undefined,
            },
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="bg-surface-700/50 rounded-xl p-4 text-center">
              <div className={cn('text-xl font-bold font-mono', color)}>{value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              {sub && <div className="text-[10px] text-slate-600 mt-1">{sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row: recent trades + open positions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent trades */}
        <div className="xl:col-span-2 bg-surface-800 border border-surface-500 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-500">
            <h3 className="text-sm font-semibold text-white">Trades récents</h3>
            <Link href="/journal" className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
              Voir tout <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-surface-700 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentTrades.length === 0 ? (
            <EmptyState icon={BookOpen} title="Aucun trade pour l'instant" description="Ajoute ton premier trade pour le voir ici." action={{ label: 'Ajouter un trade', onClick: () => {} }} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-500">
                    {['Symbole', 'Direction', 'Entrée', 'Sortie', 'P&L', 'R', 'Date'].map(h => (
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
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono">${trade.entryPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono">{trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '—'}</td>
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
            <h3 className="text-sm font-semibold text-white mb-3">Positions ouvertes</h3>
            {openTrades.length === 0 ? (
              <p className="text-xs text-slate-500">Aucune position ouverte</p>
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
            <h3 className="text-sm font-semibold text-white mb-3">Métriques clés</h3>
            <div className="space-y-3">
              {[
                { label: 'Drawdown max', value: analytics.maxDrawdown > 0 ? `-${formatCurrency(analytics.maxDrawdown)}` : '$0.00', color: 'text-red-400' },
                { label: 'Ratio Sharpe', value: analytics.sharpeRatio.toFixed(2), color: analytics.sharpeRatio > 1 ? 'text-emerald-400' : 'text-slate-300' },
                { label: 'Meilleur jour', value: analytics.bestDay ? formatCurrency(analytics.bestDay.pnl) : '—', color: 'text-emerald-400' },
                { label: 'Pire jour', value: analytics.worstDay ? formatCurrency(analytics.worstDay.pnl) : '—', color: 'text-red-400' },
                { label: 'Total trades', value: String(analytics.totalTrades), color: 'text-white' },
                { label: 'Série gagnante', value: `${analytics.longestWinStreak} trades`, color: 'text-amber-400' },
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
