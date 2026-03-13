import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, FlaskConical, Trash2, Pencil, PlayCircle,
  PauseCircle, CheckCircle2, TrendingUp, BarChart2,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { useI18n } from '../i18n'
import { formatCurrency, computeStats } from '../lib/stats'
import { Header } from '../components/Layout/Header'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Journal } from './Journal'
import type { BacktestSession, BacktestStatus } from '../types'

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W']

interface SessionFormState {
  name: string
  strategy: string
  description: string
  symbol: string
  timeframe: string
  start_date: string
  end_date: string
  initial_balance: string
  status: BacktestStatus
}

const EMPTY_FORM: SessionFormState = {
  name: '', strategy: '', description: '', symbol: '', timeframe: '1H',
  start_date: '', end_date: '', initial_balance: '10000', status: 'running',
}

function StatusBadge({ status }: { status: BacktestStatus }) {
  const { t } = useI18n()
  const config = {
    running: { icon: PlayCircle, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    completed: { icon: CheckCircle2, color: 'text-brand-400', bg: 'bg-brand-500/10 border-brand-500/20' },
    paused: { icon: PauseCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  }[status]

  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${config.color} ${config.bg}`}>
      <Icon size={10} />
      {t(`backtest.${status}`)}
    </span>
  )
}

export function Backtest() {
  const { t } = useI18n()
  const { backtestSessions, trades, settings, addBacktestSession, updateBacktestSession, deleteBacktestSession } = useStore()
  const currency = settings.currency ?? 'USD'

  const [showModal, setShowModal] = useState(false)
  const [editingSession, setEditingSession] = useState<BacktestSession | null>(null)
  const [selectedSession, setSelectedSession] = useState<BacktestSession | null>(null)

  const fmt = (v: number) => formatCurrency(v, currency)

  const handleSave = async (form: SessionFormState) => {
    const data = {
      name: form.name,
      strategy: form.strategy,
      description: form.description || undefined,
      symbol: form.symbol,
      timeframe: form.timeframe,
      start_date: form.start_date,
      end_date: form.end_date,
      initial_balance: parseFloat(form.initial_balance),
      status: form.status,
      total_trades: 0,
      win_rate: 0,
      profit_factor: 0,
      total_pnl: 0,
      max_drawdown: 0,
    }

    if (editingSession) {
      await updateBacktestSession(editingSession.id, data)
    } else {
      await addBacktestSession(data)
    }
    setShowModal(false)
    setEditingSession(null)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this backtest session and all its trades?')) {
      await deleteBacktestSession(id)
      if (selectedSession?.id === id) setSelectedSession(null)
    }
  }

  // Recompute session stats from trades
  const sessionsWithStats = useMemo(() => {
    return backtestSessions.map(s => {
      const sessionTrades = trades.filter(t => t.backtest_session_id === s.id)
      const stats = computeStats(sessionTrades.map(t => ({ ...t, backtest_session_id: undefined })))
      return {
        ...s,
        total_trades: sessionTrades.length,
        win_rate: stats.winRate,
        profit_factor: stats.profitFactor,
        total_pnl: stats.totalPnL,
        max_drawdown: stats.maxDrawdown,
      }
    })
  }, [backtestSessions, trades])

  if (selectedSession) {
    const sessionTrades = trades.filter(t => t.backtest_session_id === selectedSession.id)
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)}>
            ← Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">{selectedSession.name}</h1>
            <p className="text-xs text-surface-400">{selectedSession.strategy} · {selectedSession.symbol} · {selectedSession.timeframe}</p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={selectedSession.status} />
          </div>
        </div>

        {/* Session summary */}
        {sessionTrades.length > 0 && (() => {
          const stats = computeStats(sessionTrades.map(t => ({ ...t, backtest_session_id: undefined })))
          return (
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%` },
                { label: 'Profit Factor', value: isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞' },
                { label: 'Total PnL', value: fmt(stats.totalPnL), color: stats.totalPnL >= 0 ? 'text-brand-400' : 'text-red-400' },
                { label: 'Max Drawdown', value: fmt(stats.maxDrawdown), color: 'text-red-400' },
              ].map((item, i) => (
                <div key={i} className="bg-surface-850 border border-surface-700 rounded-xl p-4">
                  <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">{item.label}</p>
                  <p className={`font-mono font-bold text-lg ${item.color ?? 'text-white'}`}>{item.value}</p>
                </div>
              ))}
            </div>
          )
        })()}

        {/* Trades for this session */}
        <div className="bg-surface-850 border border-surface-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
            <h3 className="text-sm font-semibold text-white">Trades ({sessionTrades.length})</h3>
          </div>
          {sessionTrades.length === 0 ? (
            <div className="py-12 text-center text-surface-500 text-sm">
              No trades in this session yet. Add trades from the Journal page with this session linked.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700">
                  {['Symbol', 'Type', 'Entry', 'Exit', 'PnL', 'R', 'Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessionTrades.map(t => (
                  <tr key={t.id} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-sm text-white">{t.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${t.type === 'buy' ? 'text-brand-400' : 'text-red-400'}`}>
                        {t.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-surface-300">{t.entry_price}</td>
                    <td className="px-4 py-3 font-mono text-xs text-surface-300">{t.exit_price}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono font-bold text-sm ${t.pnl > 0 ? 'text-brand-400' : t.pnl < 0 ? 'text-red-400' : 'text-surface-300'}`}>
                        {fmt(t.pnl)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-surface-400">
                      {t.r_multiple !== undefined ? `${t.r_multiple.toFixed(2)}R` : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-surface-500">{t.exit_date.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header
        title={t('backtest.title')}
        actions={
          <Button icon={<Plus size={16} />} onClick={() => { setEditingSession(null); setShowModal(true) }}>
            {t('backtest.new_session')}
          </Button>
        }
      />

      {sessionsWithStats.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-16 h-16 bg-surface-800 rounded-2xl flex items-center justify-center mb-4">
            <FlaskConical size={28} className="text-brand-400" />
          </div>
          <p className="text-surface-400 text-sm max-w-xs">{t('backtest.no_sessions')}</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnimatePresence>
            {sessionsWithStats.map((session, i) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="bg-surface-850 border border-surface-700 rounded-xl p-5 hover:border-surface-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{session.name}</h3>
                      <StatusBadge status={session.status} />
                    </div>
                    <p className="text-xs text-surface-400">{session.strategy} · {session.symbol} · {session.timeframe}</p>
                    {session.description && (
                      <p className="text-xs text-surface-500 mt-1">{session.description}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Trades', value: session.total_trades },
                    { label: 'Win Rate', value: `${session.win_rate.toFixed(1)}%` },
                    { label: 'PF', value: isFinite(session.profit_factor) ? session.profit_factor.toFixed(2) : '∞' },
                    {
                      label: 'PnL',
                      value: fmt(session.total_pnl),
                      color: session.total_pnl >= 0 ? 'text-brand-400' : 'text-red-400',
                    },
                  ].map(item => (
                    <div key={item.label} className="bg-surface-800 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-surface-500 mb-0.5">{item.label}</p>
                      <p className={`font-mono font-bold text-sm ${item.color ?? 'text-white'}`}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-surface-500">
                  <span>{session.start_date} → {session.end_date}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedSession(session)}
                      className="px-2.5 py-1 rounded-md bg-surface-700 hover:bg-surface-600 text-white transition-colors flex items-center gap-1"
                    >
                      <BarChart2 size={12} />
                      {t('backtest.view_trades')}
                    </button>
                    <button
                      onClick={() => { setEditingSession(session); setShowModal(true) }}
                      className="p-1.5 rounded-md hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="p-1.5 rounded-md hover:bg-red-500/10 text-surface-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingSession(null) }}
        title={editingSession ? 'Edit Session' : t('backtest.new_session')}
      >
        <SessionFormComponent
          initial={editingSession
            ? {
                name: editingSession.name,
                strategy: editingSession.strategy,
                description: editingSession.description ?? '',
                symbol: editingSession.symbol,
                timeframe: editingSession.timeframe,
                start_date: editingSession.start_date,
                end_date: editingSession.end_date,
                initial_balance: String(editingSession.initial_balance),
                status: editingSession.status,
              }
            : EMPTY_FORM
          }
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingSession(null) }}
        />
      </Modal>
    </div>
  )
}

function SessionFormComponent({
  initial,
  onSave,
  onClose,
}: {
  initial: SessionFormState
  onSave: (f: SessionFormState) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const [form, setForm] = useState<SessionFormState>(initial)
  const set = (k: keyof SessionFormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label={t('backtest.session_name')} value={form.name} onChange={e => set('name', e.target.value)} required placeholder="My Strategy Test" />
        <Input label={t('backtest.strategy')} value={form.strategy} onChange={e => set('strategy', e.target.value)} required placeholder="Breakout, EMA Cross..." />
      </div>
      <Textarea label={t('backtest.description')} value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
      <div className="grid grid-cols-3 gap-4">
        <Input label={t('backtest.symbol')} value={form.symbol} onChange={e => set('symbol', e.target.value.toUpperCase())} required placeholder="EURUSD" />
        <Select label={t('backtest.timeframe')} value={form.timeframe} onChange={e => set('timeframe', e.target.value)} options={TIMEFRAMES.map(tf => ({ value: tf, label: tf }))} />
        <Select
          label={t('backtest.status')}
          value={form.status}
          onChange={e => set('status', e.target.value as BacktestStatus)}
          options={[
            { value: 'running', label: t('backtest.running') },
            { value: 'completed', label: t('backtest.completed') },
            { value: 'paused', label: t('backtest.paused') },
          ]}
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Input label={t('backtest.start_date')} type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} required />
        <Input label={t('backtest.end_date')} type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} required />
        <Input label={t('backtest.initial_balance')} type="number" value={form.initial_balance} onChange={e => set('initial_balance', e.target.value)} required />
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-surface-700">
        <Button type="button" variant="ghost" onClick={onClose}>{t('journal.cancel')}</Button>
        <Button type="submit">{t('journal.save')}</Button>
      </div>
    </form>
  )
}
