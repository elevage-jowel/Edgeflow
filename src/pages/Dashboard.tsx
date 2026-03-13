import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'
import {
  Target, TrendingUp, TrendingDown, Award, AlertCircle,
  Zap, BarChart2, DollarSign, Flame, Shield,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { useI18n } from '../i18n'
import { computeStats, getEquityCurve, getPnLDistribution, formatCurrency } from '../lib/stats'
import { StatCard } from '../components/ui/StatCard'
import { Header } from '../components/Layout/Header'

const CustomTooltip = ({ active, payload, label, currency }: { active?: boolean; payload?: Array<{ value: number }>; label?: string; currency: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-xs text-surface-400 mb-1">{label}</p>
        <p className="text-sm font-mono font-semibold text-white">{formatCurrency(payload[0].value, currency)}</p>
      </div>
    )
  }
  return null
}

export function Dashboard() {
  const { t } = useI18n()
  const { trades, settings } = useStore()
  const currency = settings.currency ?? 'USD'
  const initialBalance = settings.initial_balance ?? 10000

  const realTrades = useMemo(() => trades.filter(t => !t.backtest_session_id), [trades])
  const stats = useMemo(() => computeStats(realTrades), [realTrades])
  const equityCurve = useMemo(() => getEquityCurve(realTrades, initialBalance), [realTrades, initialBalance])
  const distribution = useMemo(() => getPnLDistribution(realTrades), [realTrades])

  const fmt = (v: number) => formatCurrency(v, currency)

  return (
    <div>
      <Header
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
      />

      {stats.totalTrades === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-16 h-16 bg-surface-800 rounded-2xl flex items-center justify-center mb-4">
            <TrendingUp size={28} className="text-brand-400" />
          </div>
          <p className="text-surface-400 text-sm max-w-xs">{t('dashboard.no_trades')}</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Primary Stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              index={0}
              label={t('dashboard.win_rate')}
              value={`${stats.winRate.toFixed(1)}%`}
              sub={`${stats.winningTrades}W / ${stats.losingTrades}L`}
              icon={Target}
              color="brand"
              trend={stats.winRate >= 50 ? 'up' : 'down'}
            />
            <StatCard
              index={1}
              label={t('dashboard.total_pnl')}
              value={fmt(stats.totalPnL)}
              sub={`${stats.totalTrades} ${t('dashboard.total_trades').toLowerCase()}`}
              icon={DollarSign}
              color={stats.totalPnL >= 0 ? 'brand' : 'red'}
              trend={stats.totalPnL >= 0 ? 'up' : 'down'}
            />
            <StatCard
              index={2}
              label={t('dashboard.profit_factor')}
              value={isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'}
              sub={`${fmt(stats.grossProfit)} / ${fmt(stats.grossLoss)}`}
              icon={BarChart2}
              color={stats.profitFactor >= 1.5 ? 'brand' : stats.profitFactor >= 1 ? 'amber' : 'red'}
            />
            <StatCard
              index={3}
              label={t('dashboard.expectancy')}
              value={fmt(stats.expectancy)}
              sub="per trade"
              icon={Zap}
              color={stats.expectancy >= 0 ? 'brand' : 'red'}
              trend={stats.expectancy >= 0 ? 'up' : 'down'}
            />
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              index={4}
              label={t('dashboard.rr_ratio')}
              value={isFinite(stats.riskRewardRatio) ? stats.riskRewardRatio.toFixed(2) : '∞'}
              sub="avg win / avg loss"
              icon={Shield}
              color="blue"
            />
            <StatCard
              index={5}
              label={t('dashboard.avg_r')}
              value={stats.avgRMultiple !== 0 ? `${stats.avgRMultiple.toFixed(2)}R` : 'N/A'}
              sub="average R multiple"
              icon={Award}
              color="purple"
            />
            <StatCard
              index={6}
              label={t('dashboard.win_streak')}
              value={stats.maxWinStreak}
              sub={stats.currentStreakType === 'win' ? `Current: ${stats.currentStreak}` : ''}
              icon={Flame}
              color="brand"
            />
            <StatCard
              index={7}
              label={t('dashboard.max_drawdown')}
              value={fmt(stats.maxDrawdown)}
              sub="peak to trough"
              icon={AlertCircle}
              color="red"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Equity Curve */}
            <div className="xl:col-span-2 bg-surface-850 border border-surface-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">{t('dashboard.equity_curve')}</h3>
              {equityCurve.length > 1 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={equityCurve} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0fb98e" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#0fb98e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#232d3f" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#3d4f6a' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#3d4f6a' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip currency={currency} />} />
                    <Area
                      type="monotone"
                      dataKey="equity"
                      stroke="#0fb98e"
                      strokeWidth={2}
                      fill="url(#equityGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-surface-500 text-sm">
                  Add more trades to see the equity curve
                </div>
              )}
            </div>

            {/* PnL Distribution */}
            <div className="bg-surface-850 border border-surface-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">{t('dashboard.pnl_distribution')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={distribution} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232d3f" />
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 8, fill: '#3d4f6a' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#3d4f6a' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1c2535', border: '1px solid #2d3a50', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#3d4f6a' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {distribution.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.range.startsWith('-') || entry.range.startsWith('<') ? '#ef4444' : '#0fb98e'}
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Best / Worst */}
          {realTrades.length > 0 && (() => {
            const best = realTrades.reduce((a, b) => a.pnl > b.pnl ? a : b)
            const worst = realTrades.reduce((a, b) => a.pnl < b.pnl ? a : b)
            return (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-850 border border-brand-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} className="text-brand-400" />
                    <span className="text-xs font-medium text-surface-400 uppercase tracking-wider">{t('dashboard.best_session')}</span>
                  </div>
                  <p className="font-mono font-bold text-brand-400 text-xl">{fmt(best.pnl)}</p>
                  <p className="text-xs text-surface-500 mt-1">{best.symbol} · {best.exit_date.slice(0, 10)}</p>
                </div>
                <div className="bg-surface-850 border border-red-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown size={14} className="text-red-400" />
                    <span className="text-xs font-medium text-surface-400 uppercase tracking-wider">{t('dashboard.worst_session')}</span>
                  </div>
                  <p className="font-mono font-bold text-red-400 text-xl">{fmt(worst.pnl)}</p>
                  <p className="text-xs text-surface-500 mt-1">{worst.symbol} · {worst.exit_date.slice(0, 10)}</p>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
