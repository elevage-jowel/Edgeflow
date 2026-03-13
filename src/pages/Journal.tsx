import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Pencil, Trash2, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useStore } from '../store/useStore'
import { useI18n } from '../i18n'
import { formatCurrency } from '../lib/stats'
import { Header } from '../components/Layout/Header'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select, Textarea } from '../components/ui/Input'
import type { Trade, TradeStatus, EmotionalState } from '../types'

const EMOTIONS: EmotionalState[] = [
  'confident', 'fearful', 'greedy', 'neutral', 'anxious', 'focused', 'fomo', 'disciplined',
]

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W']

interface TradeFormState {
  symbol: string
  type: 'buy' | 'sell'
  entry_price: string
  exit_price: string
  quantity: string
  stop_loss: string
  take_profit: string
  strategy: string
  timeframe: string
  emotion_before: EmotionalState | ''
  emotion_after: EmotionalState | ''
  notes: string
  screenshot_url: string
  entry_date: string
  exit_date: string
}

const EMPTY_FORM: TradeFormState = {
  symbol: '', type: 'buy', entry_price: '', exit_price: '', quantity: '',
  stop_loss: '', take_profit: '', strategy: '', timeframe: '1H',
  emotion_before: '', emotion_after: '', notes: '', screenshot_url: '',
  entry_date: new Date().toISOString().slice(0, 16),
  exit_date: new Date().toISOString().slice(0, 16),
}

function computeTradeResult(entry: number, exit: number, qty: number, type: 'buy' | 'sell') {
  const pnl = type === 'buy' ? (exit - entry) * qty : (entry - exit) * qty
  const status: TradeStatus = pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'breakeven'
  return { pnl, status }
}

function computeRMultiple(entry: number, exit: number, sl: number, type: 'buy' | 'sell') {
  if (!sl) return undefined
  const risk = type === 'buy' ? entry - sl : sl - entry
  if (risk <= 0) return undefined
  const reward = type === 'buy' ? exit - entry : entry - exit
  return reward / risk
}

function TradeForm({
  initial,
  onSave,
  onClose,
  title,
  currency,
}: {
  initial: TradeFormState
  onSave: (form: TradeFormState) => void
  onClose: () => void
  title: string
  currency: string
}) {
  const { t } = useI18n()
  const [form, setForm] = useState<TradeFormState>(initial)

  const preview = useMemo(() => {
    const e = parseFloat(form.entry_price)
    const x = parseFloat(form.exit_price)
    const q = parseFloat(form.quantity)
    if (!isNaN(e) && !isNaN(x) && !isNaN(q)) {
      return computeTradeResult(e, x, q, form.type)
    }
    return null
  }, [form.entry_price, form.exit_price, form.quantity, form.type])

  const set = (k: keyof TradeFormState, v: string) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  const emotionOptions = [
    { value: '', label: '—' },
    ...EMOTIONS.map(e => ({ value: e, label: t(`emotion.${e}`) })),
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('journal.symbol')}
          value={form.symbol}
          onChange={e => set('symbol', e.target.value.toUpperCase())}
          placeholder="EURUSD, BTCUSD..."
          required
        />
        <Select
          label={t('journal.type')}
          value={form.type}
          onChange={e => set('type', e.target.value as 'buy' | 'sell')}
          options={[
            { value: 'buy', label: t('journal.buy') },
            { value: 'sell', label: t('journal.sell') },
          ]}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label={t('journal.entry_price')}
          type="number"
          step="any"
          value={form.entry_price}
          onChange={e => set('entry_price', e.target.value)}
          required
        />
        <Input
          label={t('journal.exit_price')}
          type="number"
          step="any"
          value={form.exit_price}
          onChange={e => set('exit_price', e.target.value)}
          required
        />
        <Input
          label={t('journal.quantity')}
          type="number"
          step="any"
          value={form.quantity}
          onChange={e => set('quantity', e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('journal.stop_loss')}
          type="number"
          step="any"
          value={form.stop_loss}
          onChange={e => set('stop_loss', e.target.value)}
        />
        <Input
          label={t('journal.take_profit')}
          type="number"
          step="any"
          value={form.take_profit}
          onChange={e => set('take_profit', e.target.value)}
        />
      </div>

      {/* PnL Preview */}
      {preview && (
        <div className={`flex items-center justify-between p-3 rounded-lg border ${
          preview.pnl > 0
            ? 'bg-brand-500/10 border-brand-500/20'
            : preview.pnl < 0
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-surface-800 border-surface-600'
        }`}>
          <span className="text-xs text-surface-400 uppercase tracking-wider">PnL Preview</span>
          <span className={`font-mono font-bold ${
            preview.pnl > 0 ? 'text-brand-400' : preview.pnl < 0 ? 'text-red-400' : 'text-surface-300'
          }`}>
            {formatCurrency(preview.pnl, currency)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('journal.strategy')}
          value={form.strategy}
          onChange={e => set('strategy', e.target.value)}
          placeholder="Breakout, Reversal..."
        />
        <Select
          label={t('journal.timeframe')}
          value={form.timeframe}
          onChange={e => set('timeframe', e.target.value)}
          options={TIMEFRAMES.map(tf => ({ value: tf, label: tf }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label={t('journal.emotion_before')}
          value={form.emotion_before}
          onChange={e => set('emotion_before', e.target.value)}
          options={emotionOptions}
        />
        <Select
          label={t('journal.emotion_after')}
          value={form.emotion_after}
          onChange={e => set('emotion_after', e.target.value)}
          options={emotionOptions}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('journal.entry_date')}
          type="datetime-local"
          value={form.entry_date}
          onChange={e => set('entry_date', e.target.value)}
          required
        />
        <Input
          label={t('journal.exit_date')}
          type="datetime-local"
          value={form.exit_date}
          onChange={e => set('exit_date', e.target.value)}
          required
        />
      </div>

      <Input
        label={t('journal.screenshot')}
        value={form.screenshot_url}
        onChange={e => set('screenshot_url', e.target.value)}
        placeholder="https://..."
      />

      <Textarea
        label={t('journal.notes')}
        value={form.notes}
        onChange={e => set('notes', e.target.value)}
        rows={3}
        placeholder="Setup, confluences, learnings..."
      />

      <div className="flex justify-end gap-3 pt-2 border-t border-surface-700">
        <Button type="button" variant="ghost" onClick={onClose}>
          {t('journal.cancel')}
        </Button>
        <Button type="submit" variant="primary">
          {t('journal.save')}
        </Button>
      </div>
    </form>
  )
}

export function Journal() {
  const { t } = useI18n()
  const { trades, settings, addTrade, updateTrade, deleteTrade } = useStore()
  const currency = settings.currency ?? 'USD'

  const [showModal, setShowModal] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'win' | 'loss' | 'breakeven'>('all')

  const realTrades = useMemo(
    () => trades.filter(t => !t.backtest_session_id),
    [trades]
  )

  const filtered = useMemo(() => {
    return realTrades
      .filter(t => {
        if (filter !== 'all' && t.status !== filter) return false
        if (search) {
          const q = search.toLowerCase()
          return (
            t.symbol.toLowerCase().includes(q) ||
            t.strategy?.toLowerCase().includes(q) ||
            t.notes?.toLowerCase().includes(q)
          )
        }
        return true
      })
      .sort((a, b) => new Date(b.exit_date).getTime() - new Date(a.exit_date).getTime())
  }, [realTrades, filter, search])

  const handleSave = async (form: TradeFormState) => {
    const entry = parseFloat(form.entry_price)
    const exit = parseFloat(form.exit_price)
    const qty = parseFloat(form.quantity)
    const sl = parseFloat(form.stop_loss)

    const { pnl, status } = computeTradeResult(entry, exit, qty, form.type)
    const r_multiple = computeRMultiple(entry, exit, sl, form.type)

    const tradeData = {
      symbol: form.symbol,
      type: form.type,
      entry_price: entry,
      exit_price: exit,
      quantity: qty,
      stop_loss: isNaN(sl) ? undefined : sl,
      take_profit: isNaN(parseFloat(form.take_profit)) ? undefined : parseFloat(form.take_profit),
      pnl,
      r_multiple,
      status,
      strategy: form.strategy || undefined,
      timeframe: form.timeframe || undefined,
      emotion_before: (form.emotion_before || undefined) as EmotionalState | undefined,
      emotion_after: (form.emotion_after || undefined) as EmotionalState | undefined,
      notes: form.notes || undefined,
      screenshot_url: form.screenshot_url || undefined,
      entry_date: new Date(form.entry_date).toISOString(),
      exit_date: new Date(form.exit_date).toISOString(),
    }

    if (editingTrade) {
      await updateTrade(editingTrade.id, tradeData)
    } else {
      await addTrade(tradeData)
    }

    setShowModal(false)
    setEditingTrade(null)
  }

  const handleEdit = (trade: Trade) => {
    setEditingTrade(trade)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm(t('journal.confirm_delete'))) {
      await deleteTrade(id)
    }
  }

  const openNew = () => {
    setEditingTrade(null)
    setShowModal(true)
  }

  const initialForm = editingTrade
    ? {
        symbol: editingTrade.symbol,
        type: editingTrade.type,
        entry_price: String(editingTrade.entry_price),
        exit_price: String(editingTrade.exit_price),
        quantity: String(editingTrade.quantity),
        stop_loss: editingTrade.stop_loss ? String(editingTrade.stop_loss) : '',
        take_profit: editingTrade.take_profit ? String(editingTrade.take_profit) : '',
        strategy: editingTrade.strategy ?? '',
        timeframe: editingTrade.timeframe ?? '1H',
        emotion_before: (editingTrade.emotion_before ?? '') as EmotionalState | '',
        emotion_after: (editingTrade.emotion_after ?? '') as EmotionalState | '',
        notes: editingTrade.notes ?? '',
        screenshot_url: editingTrade.screenshot_url ?? '',
        entry_date: editingTrade.entry_date.slice(0, 16),
        exit_date: editingTrade.exit_date.slice(0, 16),
      }
    : EMPTY_FORM

  return (
    <div>
      <Header
        title={t('journal.title')}
        actions={
          <Button icon={<Plus size={16} />} onClick={openNew}>
            {t('journal.add_trade')}
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            className="w-full bg-surface-800 border border-surface-600 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500/50"
            placeholder={t('journal.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'win', 'loss', 'breakeven'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? f === 'win' ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : f === 'loss' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : f === 'breakeven' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-surface-700 text-white border border-surface-600'
                  : 'text-surface-400 hover:text-white hover:bg-surface-800 border border-transparent'
              }`}
            >
              {t(f === 'all' ? 'journal.filter_all' : `journal.${f}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Trade Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-surface-500 text-sm">{t('journal.no_trades')}</p>
        </div>
      ) : (
        <div className="bg-surface-850 border border-surface-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700">
                {['Symbol', 'Type', 'Entry', 'Exit', 'Qty', 'PnL', 'R', 'Status', 'Strategy', 'Date', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((trade, i) => (
                  <motion.tr
                    key={trade.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-white text-sm">{trade.symbol}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        trade.type === 'buy' ? 'bg-brand-500/10 text-brand-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {trade.type === 'buy' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {t(`journal.${trade.type}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-surface-300">{trade.entry_price}</td>
                    <td className="px-4 py-3 font-mono text-xs text-surface-300">{trade.exit_price}</td>
                    <td className="px-4 py-3 font-mono text-xs text-surface-300">{trade.quantity}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono font-bold text-sm ${
                        trade.pnl > 0 ? 'text-brand-400' : trade.pnl < 0 ? 'text-red-400' : 'text-surface-300'
                      }`}>
                        {formatCurrency(trade.pnl, currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-surface-400">
                      {trade.r_multiple !== undefined ? `${trade.r_multiple.toFixed(2)}R` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        trade.status === 'win' ? 'bg-brand-500/10 text-brand-400' :
                        trade.status === 'loss' ? 'bg-red-500/10 text-red-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {trade.status === 'win' ? <TrendingUp size={10} /> :
                         trade.status === 'loss' ? <TrendingDown size={10} /> :
                         <Minus size={10} />}
                        {t(`journal.${trade.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-surface-500">{trade.strategy || '—'}</td>
                    <td className="px-4 py-3 text-xs text-surface-500 font-mono">
                      {trade.exit_date.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {trade.screenshot_url && (
                          <a
                            href={trade.screenshot_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-md hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                        <button
                          onClick={() => handleEdit(trade)}
                          className="p-1.5 rounded-md hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(trade.id)}
                          className="p-1.5 rounded-md hover:bg-red-500/10 text-surface-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingTrade(null) }}
        title={editingTrade ? t('journal.edit_trade') : t('journal.add_trade')}
        maxWidth="max-w-3xl"
      >
        <TradeForm
          key={editingTrade?.id ?? 'new'}
          initial={initialForm}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingTrade(null) }}
          title={editingTrade ? t('journal.edit_trade') : t('journal.add_trade')}
          currency={currency}
        />
      </Modal>
    </div>
  )
}
