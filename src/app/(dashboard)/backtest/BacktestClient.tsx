'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import { collection, getDocs, doc, setDoc, deleteDoc, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { col } from '@/lib/firebase/collections'
import { Backtest, Trade, TradeVerification } from '@/lib/types'
import { DEMO_MODE, DEMO_UID } from '@/lib/demo'
import { useSetupPlans } from '@/lib/hooks/useSetupPlans'
import { usePoints } from '@/lib/hooks/usePoints'
import { verifyTrade, findMatchingPlan, defaultUserPoints, LEVEL_CONFIG } from '@/lib/scoring/planEngine'
import { ScoreCard } from '@/components/scoring/ScoreCard'
import { ScoreGauge } from '@/components/scoring/ScoreGauge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatPnl, formatDate } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Plus, FlaskConical, TrendingUp, TrendingDown, Target, BarChart2, ChevronRight, Zap } from 'lucide-react'

// ─── Demo localStorage helpers ───────────────────────────────────────────────

const DEMO_BT_KEY = 'edgeflow_demo_backtests'
function getDemoBacktests(): Backtest[] {
  try { const s = localStorage.getItem(DEMO_BT_KEY); if (s) return JSON.parse(s) } catch {}
  return []
}
function saveDemoBacktests(bts: Backtest[]) {
  localStorage.setItem(DEMO_BT_KEY, JSON.stringify(bts))
}

// ─── Backtest creation schema ─────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1),
  strategy: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  initialCapital: z.coerce.number().positive(),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

// ─── Trade entry schema for backtests ────────────────────────────────────────

const tradeSchema = z.object({
  symbol: z.string().min(1),
  direction: z.enum(['long', 'short']),
  entryDate: z.string().min(1),
  exitDate: z.string().min(1),
  entryPrice: z.coerce.number().positive(),
  exitPrice: z.coerce.number().positive(),
  quantity: z.coerce.number().positive(),
  stopLoss: z.coerce.number().optional().or(z.literal('')),
  takeProfit: z.coerce.number().optional().or(z.literal('')),
  strategy: z.string().optional(),
  setupGrade: z.enum(['A+', 'A', 'B', 'C', 'D']).optional(),
  marketCondition: z.string().optional(),
  emotionBefore: z.string().optional(),
  emotionAfter: z.string().optional(),
  tradingViewUrl: z.string().url('URL invalide').optional().or(z.literal('')),
  notes: z.string().optional(),
})
type TradeFormData = z.infer<typeof tradeSchema>

// ─── Component ────────────────────────────────────────────────────────────────

export default function BacktestClient() {
  const { user, userProfile } = useAuthStore()
  const { plans } = useSetupPlans()
  const { runVerification } = usePoints()

  const [backtests, setBacktests] = useState<Backtest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<Backtest | null>(null)
  const [isTradeOpen, setIsTradeOpen] = useState(false)
  const [pendingVerification, setPendingVerification] = useState<TradeVerification | null>(null)

  useEffect(() => {
    if (DEMO_MODE) {
      setBacktests(getDemoBacktests())
      setIsLoading(false)
      return
    }
    if (!user) return
    const load = async () => {
      const q = query(collection(db, col.backtests(user.uid)), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setBacktests(snap.docs.map(d => ({ id: d.id, ...d.data() } as Backtest)))
      setIsLoading(false)
    }
    load()
  }, [user])

  const { register, handleSubmit, formState: { isSubmitting }, reset } = useForm<FormData>({ resolver: zodResolver(schema) })
  const { register: rt, handleSubmit: ht, formState: { isSubmitting: ist }, reset: resetTradeForm, setValue: setTradeValue, watch: watchTrade } = useForm<TradeFormData>({ resolver: zodResolver(tradeSchema) })
  const btSetupGrade = watchTrade('setupGrade')
  const btEmotionBefore = watchTrade('emotionBefore')
  const btEmotionAfter = watchTrade('emotionAfter')

  const onSubmit = async (data: FormData) => {
    const uid = DEMO_MODE ? DEMO_UID : user?.uid
    if (!uid) return
    try {
      const id = `backtest_${Date.now()}`
      const bt: Backtest = {
        ...data, id, userId: uid, trades: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }
      if (DEMO_MODE) {
        const updated = [bt, ...backtests]
        saveDemoBacktests(updated)
        setBacktests(updated)
      } else {
        await setDoc(doc(db, col.backtest(uid, id)), bt)
        setBacktests(prev => [bt, ...prev])
      }
      toast.success('Backtest session created')
      setIsOpen(false)
      reset()
    } catch { toast.error('Failed to create session') }
  }

  const onAddTrade = async (data: TradeFormData) => {
    const uid = DEMO_MODE ? DEMO_UID : user?.uid
    if (!uid || !selected) return
    try {
      const dir = data.direction === 'long' ? 1 : -1
      const gross = parseFloat(((data.exitPrice - data.entryPrice) * data.quantity * dir).toFixed(2))
      const sl = data.stopLoss ? Number(data.stopLoss) : undefined
      const tp = data.takeProfit ? Number(data.takeProfit) : undefined
      const slDist = sl ? Math.abs(data.entryPrice - sl) : 0
      const tpDist = tp ? Math.abs(data.entryPrice - tp) : 0
      const rr = slDist > 0 && tpDist > 0 ? parseFloat((tpDist / slDist).toFixed(2)) : undefined
      const riskAmt = slDist * data.quantity
      const rMult = riskAmt > 0 ? parseFloat((gross / riskAmt).toFixed(2)) : parseFloat((gross / (data.entryPrice * data.quantity * 0.01)).toFixed(2))

      const tradeId = `bt_trade_${Date.now()}`
      const newTrade: Trade = {
        id: tradeId,
        userId: uid,
        symbol: data.symbol.toUpperCase(),
        assetClass: 'forex',
        direction: data.direction,
        status: 'closed',
        outcome: gross > 0 ? 'win' : gross < 0 ? 'loss' : 'breakeven',
        entryDate: new Date(data.entryDate).toISOString(),
        exitDate: new Date(data.exitDate).toISOString(),
        entryPrice: data.entryPrice,
        exitPrice: data.exitPrice,
        quantity: data.quantity,
        commission: 0,
        grossPnl: gross,
        netPnl: gross,
        rMultiple: rMult,
        stopLoss: sl,
        takeProfit: tp,
        riskRewardRatio: rr,
        strategy: data.strategy || undefined,
        setupGrade: data.setupGrade || undefined,
        marketCondition: data.marketCondition || undefined,
        emotionBefore: data.emotionBefore || undefined,
        emotionAfter: data.emotionAfter || undefined,
        tradingViewUrl: data.tradingViewUrl || undefined,
        notes: data.notes || '',
        tags: [],
        screenshotUrls: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const updatedTrades = [...selected.trades, { id: tradeId, symbol: newTrade.symbol, direction: newTrade.direction, entryDate: newTrade.entryDate, exitDate: newTrade.exitDate!, entryPrice: newTrade.entryPrice, exitPrice: newTrade.exitPrice!, quantity: newTrade.quantity, pnl: gross, rMultiple: rMult, notes: data.notes }]
      const totalPnl = updatedTrades.reduce((s, t) => s + t.pnl, 0)
      const winRate = updatedTrades.length > 0 ? updatedTrades.filter(t => t.pnl > 0).length / updatedTrades.length : 0
      const updatedBt: Backtest = { ...selected, trades: updatedTrades, totalPnl, winRate, updatedAt: new Date().toISOString() }

      if (DEMO_MODE) {
        const updatedBts = backtests.map(b => b.id === selected.id ? updatedBt : b)
        saveDemoBacktests(updatedBts)
        setBacktests(updatedBts)
        setSelected(updatedBt)
      } else {
        await setDoc(doc(db, col.backtest(uid, selected.id)), updatedBt)
        setBacktests(prev => prev.map(b => b.id === selected.id ? updatedBt : b))
        setSelected(updatedBt)
      }

      // Auto-verification for backtest trade
      const matchingPlan = findMatchingPlan(newTrade, plans)
      if (matchingPlan) {
        const currentStreak = userProfile?.points?.currentStreak ?? 0
        const verification = verifyTrade(newTrade, matchingPlan, 'backtest', currentStreak)
        setPendingVerification(verification)
        runVerification(newTrade, matchingPlan, 'backtest').catch(() => {})
      }

      toast.success('Trade added')
      setIsTradeOpen(false)
      resetTradeForm()
    } catch (e: any) { toast.error(e.message ?? 'Failed') }
  }

  // ─── Delete backtest ──────────────────────────────────────────────────────

  const deleteBacktest = async (bt: Backtest) => {
    if (!confirm(`Delete "${bt.name}"?`)) return
    const uid = DEMO_MODE ? DEMO_UID : user?.uid
    if (!uid) return
    try {
      if (DEMO_MODE) {
        const updated = backtests.filter(b => b.id !== bt.id)
        saveDemoBacktests(updated)
        setBacktests(updated)
      } else {
        await deleteDoc(doc(db, col.backtest(uid, bt.id)))
        setBacktests(prev => prev.filter(b => b.id !== bt.id))
      }
      if (selected?.id === bt.id) setSelected(null)
      toast.success('Session deleted')
    } catch { toast.error('Failed to delete') }
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  const analytics = useMemo(() => {
    if (!selected || selected.trades.length === 0) return null
    const trades = selected.trades
    const wins = trades.filter(t => t.pnl > 0)
    const losses = trades.filter(t => t.pnl < 0)
    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0)
    const winRate = wins.length / trades.length
    const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0
    const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0
    const avgR = trades.reduce((s, t) => s + t.rMultiple, 0) / trades.length

    return { totalPnl, winRate, avgWin, avgLoss, profitFactor, avgR, wins: wins.length, losses: losses.length, total: trades.length }
  }, [selected])

  const inputCls = "w-full px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
  const lbl = "text-xs font-medium text-slate-400 mb-1 block"

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Backtesting</h2>
          <p className="text-sm text-slate-500">Log and analyze manual backtest sessions — auto-verified against your setup plans</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsOpen(true)}>New Session</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-surface-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : backtests.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No backtest sessions yet" description="Create a session to test your strategies on historical data with automatic plan verification." action={{ label: 'New Session', onClick: () => setIsOpen(true) }} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {backtests.map(bt => (
            <div key={bt.id} className="relative group bg-surface-800 border border-surface-500 rounded-2xl hover:border-brand-500/40 transition-all">
              <button onClick={() => setSelected(bt)} className="w-full p-5 text-left">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-bold text-white mb-0.5">{bt.name}</div>
                    <div className="text-xs text-slate-500">{bt.strategy}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn('text-sm font-bold font-mono', (bt.totalPnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {bt.totalPnl !== undefined ? formatPnl(bt.totalPnl) : '—'}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                  <span>{formatDate(bt.startDate, 'MMM d')} — {formatDate(bt.endDate, 'MMM d, yyyy')}</span>
                  <span>{bt.trades.length} trades</span>
                </div>
                {bt.winRate !== undefined && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1 bg-surface-600 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(bt.winRate ?? 0) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-500 tabular-nums">{((bt.winRate ?? 0) * 100).toFixed(0)}% WR</span>
                  </div>
                )}
              </button>
              <button
                onClick={() => deleteBacktest(bt)}
                className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-md bg-red-500/0 hover:bg-red-500/20 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                title="Delete session"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create session modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="New Backtest Session" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Session Name *</label>
              <input {...register('name')} placeholder="NVDA Momentum Jan" className={inputCls} />
            </div>
            <div>
              <label className={lbl}>Strategy *</label>
              <input {...register('strategy')} placeholder="Breakout, ICT, SMC..." className={inputCls} />
            </div>
          </div>
          <div>
            <label className={lbl}>Description</label>
            <textarea {...register('description')} rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Start Date *</label>
              <input {...register('startDate')} type="date" className={inputCls} />
            </div>
            <div>
              <label className={lbl}>End Date *</label>
              <input {...register('endDate')} type="date" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={lbl}>Initial Capital ($) *</label>
            <input {...register('initialCapital')} type="number" placeholder="10000" className={inputCls} />
          </div>
          <div>
            <label className={lbl}>Notes</label>
            <textarea {...register('notes')} rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>Create Session</Button>
          </div>
        </form>
      </Modal>

      {/* Session detail modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? 'Session'} size="xl">
        {selected && (
          <div className="p-6 space-y-5">
            {/* Analytics row */}
            {analytics ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total P&L', value: formatPnl(analytics.totalPnl), color: analytics.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'Win Rate', value: `${(analytics.winRate * 100).toFixed(1)}%`, color: analytics.winRate >= 0.5 ? 'text-emerald-400' : 'text-amber-400' },
                  { label: 'Profit Factor', value: analytics.profitFactor > 0 ? analytics.profitFactor.toFixed(2) : '—', color: analytics.profitFactor >= 1.5 ? 'text-emerald-400' : 'text-amber-400' },
                  { label: 'Avg R', value: analytics.avgR !== 0 ? `${analytics.avgR >= 0 ? '+' : ''}${analytics.avgR.toFixed(2)}R` : '—', color: analytics.avgR >= 0 ? 'text-emerald-400' : 'text-red-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-surface-700/50 rounded-xl p-3 text-center">
                    <div className={cn('text-sm font-bold font-mono', color)}>{value}</div>
                    <div className="text-xs text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['Total P&L', 'Win Rate', 'Profit Factor', 'Avg R'].map(label => (
                  <div key={label} className="bg-surface-700/50 rounded-xl p-3 text-center">
                    <div className="text-sm font-bold text-slate-500">—</div>
                    <div className="text-xs text-slate-600">{label}</div>
                  </div>
                ))}
              </div>
            )}

            {selected.notes && (
              <p className="text-sm text-slate-400 bg-surface-700/40 rounded-xl p-3">{selected.notes}</p>
            )}

            {/* Trades table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-white">Trades ({selected.trades.length})</h4>
                <Button variant="secondary" size="sm" icon={Plus} onClick={() => setIsTradeOpen(true)}>Add Trade</Button>
              </div>

              {selected.trades.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm border border-surface-600 rounded-xl border-dashed">
                  No trades yet. Add your first backtest trade to start scoring.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-surface-600">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-surface-600 text-slate-500">
                        <th className="text-left px-3 py-2 font-medium">Symbol</th>
                        <th className="text-left px-3 py-2 font-medium">Dir</th>
                        <th className="text-left px-3 py-2 font-medium">Entry</th>
                        <th className="text-left px-3 py-2 font-medium">Exit</th>
                        <th className="text-right px-3 py-2 font-medium">P&L</th>
                        <th className="text-right px-3 py-2 font-medium">R</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.trades.map(t => (
                        <tr key={t.id} className="border-b border-surface-600/50 hover:bg-surface-700/30 transition-colors">
                          <td className="px-3 py-2 font-bold text-white">{t.symbol}</td>
                          <td className="px-3 py-2">
                            <span className={cn('font-medium', t.direction === 'long' ? 'text-emerald-400' : 'text-red-400')}>
                              {t.direction === 'long' ? '↑ Long' : '↓ Short'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-400">{formatDate(t.entryDate, 'MMM d')}</td>
                          <td className="px-3 py-2 text-slate-400">{formatDate(t.exitDate, 'MMM d')}</td>
                          <td className={cn('px-3 py-2 text-right font-mono font-bold', t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                            {formatPnl(t.pnl)}
                          </td>
                          <td className={cn('px-3 py-2 text-right font-mono', t.rMultiple >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                            {t.rMultiple >= 0 ? '+' : ''}{t.rMultiple.toFixed(2)}R
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pending verification */}
            {pendingVerification && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" /> Last Trade Verification
                </h4>
                <ScoreCard verification={pendingVerification} />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add trade modal */}
      <Modal isOpen={isTradeOpen} onClose={() => setIsTradeOpen(false)} title="Add Backtest Trade" size="md">
        <form onSubmit={ht(onAddTrade)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Symbol *</label>
              <input {...rt('symbol')} placeholder="EURUSD" className={inputCls} />
            </div>
            <div>
              <label className={lbl}>Direction *</label>
              <select {...rt('direction')} className={inputCls}>
                <option value="long">Long ↑</option>
                <option value="short">Short ↓</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Entry Date *</label>
              <input {...rt('entryDate')} type="date" className={inputCls} />
            </div>
            <div>
              <label className={lbl}>Exit Date *</label>
              <input {...rt('exitDate')} type="date" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Entry Price *</label>
              <input {...rt('entryPrice')} type="number" step="any" placeholder="1.0950" className={inputCls} />
            </div>
            <div>
              <label className={lbl}>Exit Price *</label>
              <input {...rt('exitPrice')} type="number" step="any" placeholder="1.1050" className={inputCls} />
            </div>
            <div>
              <label className={lbl}>Quantity *</label>
              <input {...rt('quantity')} type="number" step="any" placeholder="1" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Stop Loss</label>
              <input {...rt('stopLoss')} type="number" step="any" placeholder="1.0900" className={inputCls} />
            </div>
            <div>
              <label className={lbl}>Take Profit</label>
              <input {...rt('takeProfit')} type="number" step="any" placeholder="1.1100" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Strategy</label>
              <input {...rt('strategy')} placeholder="Breakout, ICT, SMC..." className={inputCls} />
            </div>
            <div>
              <label className={lbl}>Grade</label>
              <div className="flex gap-1">
                {(['A+', 'A', 'B', 'C', 'D'] as const).map(g => (
                  <button key={g} type="button"
                    onClick={() => setTradeValue('setupGrade', g === btSetupGrade ? undefined : g)}
                    className={cn(
                      'flex-1 h-9 rounded-lg text-xs font-bold border transition-all',
                      btSetupGrade === g
                        ? g === 'A+' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : g === 'A'  ? 'bg-green-500/20 border-green-500 text-green-400'
                        : g === 'B'  ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                        : g === 'C'  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-red-500/20 border-red-500 text-red-400'
                        : 'border-surface-500 text-slate-400 hover:border-slate-400'
                    )}>{g}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className={lbl}>Émotion avant</label>
            <div className="grid grid-cols-6 gap-1">
              {[{v:'calm',e:'😌'},{v:'focused',e:'🎯'},{v:'confident',e:'💪'},{v:'hesitant',e:'🤔'},{v:'fearful',e:'😰'},{v:'greedy',e:'🤑'},{v:'frustrated',e:'😤'},{v:'tired',e:'😴'},{v:'fomo',e:'😱'},{v:'revenge',e:'😡'},{v:'overconfident',e:'🦁'},{v:'distracted',e:'💭'}].map(({v,e}) => (
                <button key={v} type="button" title={v}
                  onClick={() => setTradeValue('emotionBefore', btEmotionBefore === v ? '' : v)}
                  className={cn('py-1.5 rounded-lg border text-base text-center transition-all', btEmotionBefore === v ? 'border-brand-500/60 bg-brand-500/15' : 'border-surface-500 bg-surface-700/50 hover:border-surface-400')}
                >{e}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={lbl}>Émotion après</label>
            <div className="grid grid-cols-6 gap-1">
              {[{v:'calm',e:'😌'},{v:'focused',e:'🎯'},{v:'confident',e:'💪'},{v:'hesitant',e:'🤔'},{v:'fearful',e:'😰'},{v:'greedy',e:'🤑'},{v:'frustrated',e:'😤'},{v:'tired',e:'😴'},{v:'fomo',e:'😱'},{v:'revenge',e:'😡'},{v:'overconfident',e:'🦁'},{v:'distracted',e:'💭'}].map(({v,e}) => (
                <button key={v} type="button" title={v}
                  onClick={() => setTradeValue('emotionAfter', btEmotionAfter === v ? '' : v)}
                  className={cn('py-1.5 rounded-lg border text-base text-center transition-all', btEmotionAfter === v ? 'border-brand-500/60 bg-brand-500/15' : 'border-surface-500 bg-surface-700/50 hover:border-surface-400')}
                >{e}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={lbl}>Lien TradingView</label>
            <input {...rt('tradingViewUrl')} type="url" placeholder="https://www.tradingview.com/chart/..." className={inputCls} />
          </div>
          <div>
            <label className={lbl}>Notes</label>
            <textarea {...rt('notes')} rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsTradeOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={ist}>Add & Verify</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
