'use client'
import { useState } from 'react'
import { useTradeStore } from '@/lib/stores/tradeStore'
import { useAnalytics, TimeRange } from '@/lib/hooks/useAnalytics'
import { EquityCurveChart } from '@/components/charts/EquityCurveChart'
import { DrawdownChart } from '@/components/charts/DrawdownChart'
import { DayOfWeekChart } from '@/components/charts/DayOfWeekChart'
import { MonthlyPnLChart } from '@/components/charts/MonthlyPnLChart'
import { WinRateDonut } from '@/components/charts/WinRateDonut'
import { EmotionPnLChart } from '@/components/charts/EmotionPnLChart'
import { HeatmapChart } from '@/components/charts/HeatmapChart'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatWinRate, formatR, formatPnl } from '@/lib/utils/formatters'

const ranges: TimeRange[] = ['1W', '1M', '3M', '6M', 'YTD', '1Y', 'ALL']
const tabs = ['Vue d\'ensemble', 'Par symbole', 'Par setup', 'Par jour', 'Par heure', 'Par session', 'Par émotion', 'Distribution']

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
  const [tab, setTab] = useState('Vue d\'ensemble')
  const [heatMode, setHeatMode] = useState<'pnl' | 'winRate' | 'trades'>('pnl')
  const a = useAnalytics(trades, range)

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Analytiques de performance</h2>
          <p className="text-sm text-slate-500">Analyse approfondie de ta performance de trading</p>
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
        <MetricItem label="Taux de réussite" value={formatWinRate(a.winRate)} sub={`${a.winCount}W/${a.lossCount}L`} />
        <MetricItem label="Profit Factor" value={a.profitFactor.toFixed(2)} color={a.profitFactor >= 2 ? 'text-emerald-400' : a.profitFactor >= 1.5 ? 'text-brand-400' : 'text-slate-300'} />
        <MetricItem label="R moyen" value={formatR(a.avgRMultiple)} color={a.avgRMultiple > 0 ? 'text-emerald-400' : 'text-red-400'} />
        <MetricItem label="Ratio Sharpe" value={a.sharpeRatio.toFixed(2)} color={a.sharpeRatio > 1 ? 'text-emerald-400' : 'text-slate-300'} />
        <MetricItem label="Drawdown max" value={a.maxDrawdown > 0 ? `-${formatCurrency(a.maxDrawdown)}` : '$0'} color="text-red-400" sub={`${a.maxDrawdownPct.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricItem label="Espérance" value={formatCurrency(a.expectancy)} color={a.expectancy > 0 ? 'text-emerald-400' : 'text-red-400'} sub="par trade" />
        <MetricItem label="Gain moyen" value={a.avgWin > 0 ? formatCurrency(a.avgWin) : '—'} color="text-emerald-400" />
        <MetricItem label="Perte moyenne" value={a.avgLoss > 0 ? formatCurrency(-a.avgLoss) : '—'} color="text-red-400" />
        <MetricItem label="Sortino" value={a.sortinoRatio.toFixed(2)} color={a.sortinoRatio > 1.5 ? 'text-emerald-400' : 'text-slate-300'} />
        <MetricItem label="Facteur de récupération" value={a.recoveryFactor > 0 ? a.recoveryFactor.toFixed(2) : '—'} />
        <MetricItem label="Série gagnante" value={`${a.longestWinStreak}`} sub="trades" color="text-amber-400" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-800 border border-surface-500 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === t ? 'bg-surface-600 text-white' : 'text-slate-400 hover:text-white')}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'Vue d\'ensemble' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Courbe des capitaux</h3>
            {a.equityCurve.length > 1 ? <EquityCurveChart data={a.equityCurve} height={240} /> : <div className="h-48 flex items-center justify-center text-slate-500 text-sm">Pas assez de données</div>}
          </div>
          <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Drawdown</h3>
            {a.equityCurve.length > 1 ? <DrawdownChart equityCurve={a.equityCurve} height={240} /> : <div className="h-48 flex items-center justify-center text-slate-500 text-sm">Pas assez de données</div>}
          </div>
          <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">P&L mensuel</h3>
            {a.monthlyPnl.length > 0 ? <MonthlyPnLChart data={a.monthlyPnl} height={200} /> : <div className="h-48 flex items-center justify-center text-slate-500 text-sm">Aucune donnée</div>}
          </div>
          <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Distribution Gains/Pertes</h3>
            <WinRateDonut wins={a.winCount} losses={a.lossCount} breakevens={a.breakevenCount} height={200} />
          </div>
        </div>
      )}

      {tab === 'Par symbole' && (
        <div className="bg-surface-800 border border-surface-500 rounded-2xl overflow-hidden">
          {a.bySymbol.length === 0 ? (
            <div className="p-12 text-center text-slate-500">Aucune donnée de trade fermé</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-500">
                  {['Symbole', 'Trades', 'Taux de réussite', 'Net P&L', 'R moyen', 'Meilleur', 'Pire'].map(h => (
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

      {tab === 'Par jour' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">P&L par jour de la semaine</h3>
            <DayOfWeekChart data={a.byDayOfWeek} height={220} />
          </div>
          <div className="bg-surface-800 border border-surface-500 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-500">
                  {['Jour', 'Trades', 'Taux de réussite', 'Net P&L'].map(h => (
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

      {tab === 'Par heure' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Heatmap jour × heure</h3>
              <p className="text-xs text-slate-500 mt-0.5">Visualise tes meilleures plages horaires par jour de la semaine</p>
            </div>
            <div className="flex gap-1 bg-surface-700 border border-surface-500 rounded-lg p-0.5">
              {(['pnl', 'winRate', 'trades'] as const).map(m => (
                <button key={m} onClick={() => setHeatMode(m)} className={cn('px-3 py-1 rounded text-xs font-medium transition-all', heatMode === m ? 'bg-surface-500 text-white' : 'text-slate-400 hover:text-white')}>
                  {m === 'pnl' ? 'P&L' : m === 'winRate' ? 'Win Rate' : 'Trades'}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
            {a.byDayHour.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-500 text-sm">Aucune donnée — ajoute des trades pour voir la heatmap</div>
            ) : (
              <HeatmapChart data={a.byDayHour} mode={heatMode} />
            )}
          </div>

          {/* Best/worst hour summary */}
          {a.bestHour !== null && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                <div className="text-xs text-emerald-400 font-medium mb-1">Meilleure heure</div>
                <div className="text-2xl font-bold font-mono text-emerald-400">{a.bestHour}h00</div>
                <div className="text-xs text-slate-500 mt-1">Heure avec le meilleur P&L cumulé</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                <div className="text-xs text-red-400 font-medium mb-1">Pire heure</div>
                <div className="text-2xl font-bold font-mono text-red-400">{a.worstHour}h00</div>
                <div className="text-xs text-slate-500 mt-1">Heure avec le pire P&L cumulé</div>
              </div>
            </div>
          )}

          {/* Hour table */}
          {a.byHour.length > 0 && (
            <div className="bg-surface-800 border border-surface-500 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-500">
                    {['Heure', 'Trades', 'Taux de réussite', 'Net P&L'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-600">
                  {a.byHour.map(h => (
                    <tr key={h.hour} className="hover:bg-surface-700/40">
                      <td className="px-5 py-3 text-sm font-medium text-white font-mono">{String(h.hour).padStart(2, '0')}h00</td>
                      <td className="px-5 py-3 text-sm text-slate-300 font-mono">{h.trades}</td>
                      <td className="px-5 py-3 text-sm font-mono"><span className={h.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}>{h.winRate.toFixed(0)}%</span></td>
                      <td className="px-5 py-3 text-sm font-bold font-mono"><span className={h.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatPnl(h.pnl)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'Par session' && (
        <div className="bg-surface-800 border border-surface-500 rounded-2xl overflow-hidden">
          {a.bySession.length === 0 ? (
            <div className="p-12 text-center text-slate-500">Aucune donnée de session</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-500">
                  {['Session', 'Trades', 'Taux de réussite', 'Net P&L'].map(h => (
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

      {tab === 'Par setup' && (
        <div className="bg-surface-800 border border-surface-500 rounded-2xl overflow-hidden">
          {a.bySetup.length === 0 ? (
            <div className="p-12 text-center text-slate-500">Aucune donnée de stratégie — ajoute une stratégie lors de la saisie des trades</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-500">
                  {['Stratégie / Setup', 'Trades', 'Taux de réussite', 'Net P&L', 'R moyen'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-600">
                {a.bySetup.map(s => (
                  <tr key={s.setup} className="hover:bg-surface-700/40 transition-colors">
                    <td className="px-5 py-3 text-sm font-bold text-white">{s.setup}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'Par émotion' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">P&L moyen par émotion (avant le trade)</h3>
              </div>
              <EmotionPnLChart data={a.byEmotion} height={240} mode="avgPnl" />
            </div>
            <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Taux de réussite par émotion</h3>
              <EmotionPnLChart data={a.byEmotion} height={240} mode="winRate" />
            </div>
          </div>
          {a.byEmotion.length > 0 && (
            <div className="bg-surface-800 border border-surface-500 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-500">
                    {['Émotion', 'Trades', 'Taux de réussite', 'P&L total', 'P&L moyen'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-600">
                  {a.byEmotion.map(e => (
                    <tr key={e.emotion} className="hover:bg-surface-700/40">
                      <td className="px-5 py-3 text-sm font-medium text-white capitalize">{e.emotion}</td>
                      <td className="px-5 py-3 text-sm text-slate-300 font-mono">{e.trades}</td>
                      <td className="px-5 py-3 text-sm font-mono">
                        <span className={e.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}>{e.winRate.toFixed(0)}%</span>
                      </td>
                      <td className="px-5 py-3 text-sm font-bold font-mono">
                        <span className={e.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatPnl(e.pnl)}</span>
                      </td>
                      <td className="px-5 py-3 text-sm font-mono">
                        <span className={e.avgPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatCurrency(e.avgPnl)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'Distribution' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-emerald-400 mb-4">Distribution des gains</h3>
            {a.winDistribution.length > 0 ? (
              <div className="space-y-2">
                {(() => { const mx = Math.max(...a.winDistribution.map(x => x.count), 1); return a.winDistribution.map(d => (
                  <div key={d.range} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-28">{d.range}</span>
                    <div className="flex-1 bg-surface-600 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(d.count / mx) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-300 w-6 text-right font-mono">{d.count}</span>
                  </div>
                )) })()}
              </div>
            ) : <div className="h-32 flex items-center justify-center text-slate-500 text-sm">Aucun gain pour l&apos;instant</div>}
          </div>
          <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-red-400 mb-4">Distribution des pertes</h3>
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
            ) : <div className="h-32 flex items-center justify-center text-slate-500 text-sm">Aucune perte pour l&apos;instant</div>}
          </div>
        </div>
      )}
    </div>
  )
}
