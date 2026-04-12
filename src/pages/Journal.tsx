import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Pencil, Trash2, Image, TrendingUp, TrendingDown,
  Minus, Send, BookOpen, ChevronDown, ChevronUp, X,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useStore } from '../store/useStore'
import { useI18n } from '../i18n'
import { formatCurrency } from '../lib/stats'
import { exportTradeToDiscord, exportTradeToNotion } from '../lib/integrations'
import { SYMBOL_GROUPS } from '../lib/symbols'
import { Header } from '../components/Layout/Header'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select, Textarea } from '../components/ui/Input'
import type { Trade, TradeStatus, EmotionalState, SetupQuality } from '../types'

const EMOTIONS: EmotionalState[] = [
  'confident', 'fearful', 'greedy', 'neutral', 'anxious', 'focused', 'fomo', 'disciplined',
]
const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W']
const SETUP_QUALITIES: SetupQuality[] = ['A+', 'A', 'B']

const SETUP_COLORS: Record<SetupQuality, string> = {
  'A+': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'A':  'bg-brand-500/20 text-brand-300 border-brand-500/30',
  'B':  'bg-blue-500/20 text-blue-300 border-blue-500/30',
}

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
  setup_quality: SetupQuality | ''
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
  setup_quality: '', emotion_before: '', emotion_after: '',
  notes: '', screenshot_url: '',
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

function computeRiskReward(entry: number, sl: number, tp: number, type: 'buy' | 'sell') {
  const risk = type === 'buy' ? entry - sl : sl - entry
  const reward = type === 'buy' ? tp - entry : entry - tp
  if (risk <= 0 || reward <= 0) return undefined
  return reward / risk
}

// ─── Symbol Combobox ──────────────────────────────────────────────────────────
function SymbolInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!query) return SYMBOL_GROUPS
    const q = query.toUpperCase()
    return SYMBOL_GROUPS
      .map(g => ({ ...g, symbols: g.symbols.filter(s => s.includes(q)) }))
      .filter(g => g.symbols.length > 0)
  }, [query])

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">Symbol</label>
      <input
        className="w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500/50"
        value={query}
        placeholder="EURUSD, BTCUSD..."
        onChange={e => { setQuery(e.target.value.toUpperCase()); onChange(e.target.value.toUpperCase()); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        required
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-surface-800 border border-surface-600 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {filtered.map(g => (
            <div key={g.label}>
              <div className="px-3 py-1.5 text-xs font-semibold text-surface-500 uppercase tracking-wider bg-surface-850 sticky top-0">
                {g.label}
              </div>
              <div className="flex flex-wrap gap-1 p-2">
                {g.symbols.map(s => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={() => { onChange(s); setQuery(s); setOpen(false) }}
                    className="px-2 py-0.5 rounded text-xs font-mono bg-surface-700 hover:bg-brand-500/20 hover:text-brand-300 text-surface-300 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Screenshot Upload ────────────────────────────────────────────────────────
function ScreenshotUpload({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onChange(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const isDataUrl = value.startsWith('data:')
  const isHttpUrl = value.startsWith('http')

  return (
    <div>
      <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">Screenshot</label>
      <div className="flex gap-2">
        <input
          className="flex-1 bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500/50"
          value={isDataUrl ? '' : value}
          onChange={e => onChange(e.target.value)}
          placeholder="Paste URL or upload file..."
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="px-3 py-2 rounded-lg bg-surface-700 hover:bg-surface-600 text-surface-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs"
        >
          <Image size={13} /> Upload
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-2 rounded-lg bg-surface-700 hover:bg-red-500/10 text-surface-400 hover:text-red-400 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {(isDataUrl || isHttpUrl) && (
        <div className="mt-2 relative rounded-lg overflow-hidden border border-surface-600 max-h-32">
          <img
            src={value}
            alt="screenshot"
            className="w-full object-cover max-h-32"
          />
        </div>
      )}
    </div>
  )
}

// ─── Trade Form ───────────────────────────────────────────────────────────────
function TradeForm({
  initial, onSave, onClose, currency,
}: {
  initial: TradeFormState
  onSave: (form: TradeFormState) => void
  onClose: () => void
  currency: string
}) {
  const { t } = useI18n()
  const [form, setForm] = useState<TradeFormState>(initial)

  const preview = useMemo(() => {
    const e = parseFloat(form.entry_price)
    const x = parseFloat(form.exit_price)
    const q = parseFloat(form.quantity)
    if (!isNaN(e) && !isNaN(x) && !isNaN(q)) return computeTradeResult(e, x, q, form.type)
    return null
  }, [form.entry_price, form.exit_price, form.quantity, form.type])

  const rrPreview = useMemo(() => {
    const e = parseFloat(form.entry_price)
    const sl = parseFloat(form.stop_loss)
    const tp = parseFloat(form.take_profit)
    if (!isNaN(e) && !isNaN(sl) && !isNaN(tp)) return computeRiskReward(e, sl, tp, form.type)
    return null
  }, [form.entry_price, form.stop_loss, form.take_profit, form.type])

  const set = (k: keyof TradeFormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  const emotionOptions = [
    { value: '', label: '—' },
    ...EMOTIONS.map(e => ({ value: e, label: t(`emotion.${e}`) })),
  ]

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <SymbolInput value={form.symbol} onChange={v => set('symbol', v)} />
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
        <Input label={t('journal.entry_price')} type="number" step="any" value={form.entry_price} onChange={e => set('entry_price', e.target.value)} required />
        <Input label={t('journal.exit_price')} type="number" step="any" value={form.exit_price} onChange={e => set('exit_price', e.target.value)} required />
        <Input label={t('journal.quantity')} type="number" step="any" value={form.quantity} onChange={e => set('quantity', e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label={t('journal.stop_loss')} type="number" step="any" value={form.stop_loss} onChange={e => set('stop_loss', e.target.value)} />
        <Input label={t('journal.take_profit')} type="number" step="any" value={form.take_profit} onChange={e => set('take_profit', e.target.value)} />
      </div>

      {/* Live preview */}
      {(preview || rrPreview !== null) && (
        <div className={`flex items-center justify-between gap-4 p-3 rounded-lg border ${
          preview && preview.pnl > 0 ? 'bg-brand-500/10 border-brand-500/20'
          : preview && preview.pnl < 0 ? 'bg-red-500/10 border-red-500/20'
          : 'bg-surface-800 border-surface-600'
        }`}>
          {preview && (
            <div>
              <span className="text-xs text-surface-400 uppercase tracking-wider mr-2">PnL</span>
              <span className={`font-mono font-bold ${preview.pnl > 0 ? 'text-brand-400' : preview.pnl < 0 ? 'text-red-400' : 'text-surface-300'}`}>
                {formatCurrency(preview.pnl, currency)}
              </span>
            </div>
          )}
          {rrPreview !== null && (
            <div>
              <span className="text-xs text-surface-400 uppercase tracking-wider mr-2">R:R</span>
              <span className="font-mono font-bold text-white">1:{rrPreview.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Input label={t('journal.strategy')} value={form.strategy} onChange={e => set('strategy', e.target.value)} placeholder="Breakout..." />
        <Select label={t('journal.timeframe')} value={form.timeframe} onChange={e => set('timeframe', e.target.value)} options={TIMEFRAMES.map(tf => ({ value: tf, label: tf }))} />
        {/* Setup Quality */}
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">Setup Quality</label>
          <div className="flex gap-1.5">
            {(['', ...SETUP_QUALITIES] as const).map(q => (
              <button
                key={q}
                type="button"
                onClick={() => set('setup_quality', q)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                  form.setup_quality === q
                    ? q === '' ? 'bg-surface-600 text-white border-surface-500'
                      : SETUP_COLORS[q as SetupQuality]
                    : 'bg-surface-800 text-surface-500 border-surface-700 hover:border-surface-500'
                }`}
              >
                {q || '—'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select label={t('journal.emotion_before')} value={form.emotion_before} onChange={e => set('emotion_before', e.target.value)} options={emotionOptions} />
        <Select label={t('journal.emotion_after')} value={form.emotion_after} onChange={e => set('emotion_after', e.target.value)} options={emotionOptions} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label={t('journal.entry_date')} type="datetime-local" value={form.entry_date} onChange={e => set('entry_date', e.target.value)} required />
        <Input label={t('journal.exit_date')} type="datetime-local" value={form.exit_date} onChange={e => set('exit_date', e.target.value)} required />
      </div>

      <ScreenshotUpload value={form.screenshot_url} onChange={v => set('screenshot_url', v)} />

      <Textarea label={t('journal.notes')} value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Setup, confluences, learnings..." />

      <div className="flex justify-end gap-3 pt-2 border-t border-surface-700">
        <Button type="button" variant="ghost" onClick={onClose}>{t('journal.cancel')}</Button>
        <Button type="submit" variant="primary">{t('journal.save')}</Button>
      </div>
    </form>
  )
}

// ─── Trade Detail Row ─────────────────────────────────────────────────────────
function TradeRow({
  trade, currency, onEdit, onDelete, onDiscord, onNotion,
}: {
  trade: Trade
  currency: string
  onEdit: () => void
  onDelete: () => void
  onDiscord: () => void
  onNotion: () => void
}) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)

  const rr = trade.risk_reward
    ? `1:${trade.risk_reward.toFixed(2)}`
    : trade.r_multiple !== undefined
    ? `${trade.r_multiple.toFixed(2)}R`
    : null

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10 }}
        className="border-b border-surface-800 hover:bg-surface-800/40 transition-colors group"
      >
        {/* Symbol */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-white text-sm">{trade.symbol}</span>
            {trade.setup_quality && (
              <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${SETUP_COLORS[trade.setup_quality]}`}>
                {trade.setup_quality}
              </span>
            )}
          </div>
        </td>
        {/* Type */}
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${trade.type === 'buy' ? 'bg-brand-500/10 text-brand-400' : 'bg-red-500/10 text-red-400'}`}>
            {trade.type === 'buy' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {t(`journal.${trade.type}`)}
          </span>
        </td>
        {/* Entry / Exit */}
        <td className="px-4 py-3 font-mono text-xs text-surface-300">{trade.entry_price}</td>
        <td className="px-4 py-3 font-mono text-xs text-surface-300">{trade.exit_price}</td>
        {/* SL / TP */}
        <td className="px-4 py-3 font-mono text-xs text-red-400/80">{trade.stop_loss ?? '—'}</td>
        <td className="px-4 py-3 font-mono text-xs text-brand-400/80">{trade.take_profit ?? '—'}</td>
        {/* PnL */}
        <td className="px-4 py-3">
          <div>
            <span className={`font-mono font-bold text-sm ${trade.pnl > 0 ? 'text-brand-400' : trade.pnl < 0 ? 'text-red-400' : 'text-surface-300'}`}>
              {formatCurrency(trade.pnl, currency)}
            </span>
            {trade.pnl_percent !== undefined && (
              <div className={`text-xs font-mono ${trade.pnl_percent > 0 ? 'text-brand-500' : trade.pnl_percent < 0 ? 'text-red-500' : 'text-surface-500'}`}>
                {trade.pnl_percent >= 0 ? '+' : ''}{trade.pnl_percent.toFixed(2)}%
              </div>
            )}
          </div>
        </td>
        {/* R:R */}
        <td className="px-4 py-3 font-mono text-xs text-surface-400">{rr ?? '—'}</td>
        {/* Status */}
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            trade.status === 'win' ? 'bg-brand-500/10 text-brand-400'
            : trade.status === 'loss' ? 'bg-red-500/10 text-red-400'
            : 'bg-amber-500/10 text-amber-400'
          }`}>
            {trade.status === 'win' ? <TrendingUp size={10} /> : trade.status === 'loss' ? <TrendingDown size={10} /> : <Minus size={10} />}
            {t(`journal.${trade.status}`)}
          </span>
        </td>
        {/* Date */}
        <td className="px-4 py-3 text-xs text-surface-500 font-mono">{trade.exit_date.slice(0, 10)}</td>
        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-md hover:bg-surface-700 text-surface-400 hover:text-white transition-colors" title="Details">
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            <button onClick={onDiscord} className="p-1.5 rounded-md hover:bg-indigo-500/10 text-surface-400 hover:text-indigo-400 transition-colors" title="Export to Discord">
              <Send size={13} />
            </button>
            <button onClick={onNotion} className="p-1.5 rounded-md hover:bg-surface-700 text-surface-400 hover:text-white transition-colors" title="Export to Notion">
              <BookOpen size={13} />
            </button>
            <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-surface-700 text-surface-400 hover:text-white transition-colors">
              <Pencil size={13} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-red-500/10 text-surface-400 hover:text-red-400 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </motion.tr>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.tr
            key="detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border-b border-surface-800 bg-surface-900/50"
          >
            <td colSpan={11} className="px-4 py-4">
              <div className="flex gap-6">
                {/* Screenshot */}
                {trade.screenshot_url && (
                  <div className="flex-shrink-0">
                    <img
                      src={trade.screenshot_url}
                      alt="trade screenshot"
                      className="h-36 w-auto rounded-lg border border-surface-600 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(trade.screenshot_url, '_blank')}
                    />
                  </div>
                )}
                {/* Info */}
                <div className="flex-1 grid grid-cols-3 gap-3 text-xs">
                  {[
                    ['Strategy', trade.strategy || '—'],
                    ['Timeframe', trade.timeframe || '—'],
                    ['Quantity', String(trade.quantity)],
                    ['Entry', String(trade.entry_price)],
                    ['Stop Loss', trade.stop_loss ? String(trade.stop_loss) : '—'],
                    ['Take Profit', trade.take_profit ? String(trade.take_profit) : '—'],
                    ['R Multiple', trade.r_multiple !== undefined ? `${trade.r_multiple.toFixed(2)}R` : '—'],
                    ['R:R', trade.risk_reward ? `1:${trade.risk_reward.toFixed(2)}` : '—'],
                    ['Emotion Before', trade.emotion_before || '—'],
                    ['Emotion After', trade.emotion_after || '—'],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <span className="text-surface-500 uppercase tracking-wider">{label}: </span>
                      <span className="text-surface-200 font-mono">{val}</span>
                    </div>
                  ))}
                </div>
                {/* Notes */}
                {trade.notes && (
                  <div className="max-w-xs">
                    <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-xs text-surface-300 leading-relaxed">{trade.notes}</p>
                  </div>
                )}
              </div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Journal Page ─────────────────────────────────────────────────────────────
export function Journal() {
  const { t } = useI18n()
  const { trades, settings, addTrade, updateTrade, deleteTrade } = useStore()
  const currency = settings.currency ?? 'USD'
  const initialBalance = settings.initial_balance ?? 10000

  const [showModal, setShowModal] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'win' | 'loss' | 'breakeven'>('all')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const realTrades = useMemo(() => trades.filter(t => !t.backtest_session_id), [trades])

  const filtered = useMemo(() =>
    realTrades
      .filter(t => {
        if (filter !== 'all' && t.status !== filter) return false
        if (search) {
          const q = search.toLowerCase()
          return t.symbol.toLowerCase().includes(q) || t.strategy?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q)
        }
        return true
      })
      .sort((a, b) => new Date(b.exit_date).getTime() - new Date(a.exit_date).getTime()),
  [realTrades, filter, search])

  const handleSave = async (form: TradeFormState) => {
    const entry = parseFloat(form.entry_price)
    const exit = parseFloat(form.exit_price)
    const qty = parseFloat(form.quantity)
    const sl = parseFloat(form.stop_loss)
    const tp = parseFloat(form.take_profit)

    const { pnl, status } = computeTradeResult(entry, exit, qty, form.type)
    const r_multiple = computeRMultiple(entry, exit, sl, form.type)
    const risk_reward = !isNaN(sl) && !isNaN(tp) ? computeRiskReward(entry, sl, tp, form.type) : undefined
    const pnl_percent = (pnl / initialBalance) * 100

    await (editingTrade ? updateTrade(editingTrade.id, {
      symbol: form.symbol, type: form.type, entry_price: entry, exit_price: exit,
      quantity: qty, stop_loss: isNaN(sl) ? undefined : sl,
      take_profit: isNaN(tp) ? undefined : tp,
      pnl, pnl_percent, r_multiple, risk_reward, status,
      setup_quality: (form.setup_quality || undefined) as SetupQuality | undefined,
      strategy: form.strategy || undefined, timeframe: form.timeframe || undefined,
      emotion_before: (form.emotion_before || undefined) as EmotionalState | undefined,
      emotion_after: (form.emotion_after || undefined) as EmotionalState | undefined,
      notes: form.notes || undefined,
      screenshot_url: form.screenshot_url || undefined,
      entry_date: new Date(form.entry_date).toISOString(),
      exit_date: new Date(form.exit_date).toISOString(),
    }) : addTrade({
      symbol: form.symbol, type: form.type, entry_price: entry, exit_price: exit,
      quantity: qty, stop_loss: isNaN(sl) ? undefined : sl,
      take_profit: isNaN(tp) ? undefined : tp,
      pnl, pnl_percent, r_multiple, risk_reward, status,
      setup_quality: (form.setup_quality || undefined) as SetupQuality | undefined,
      strategy: form.strategy || undefined, timeframe: form.timeframe || undefined,
      emotion_before: (form.emotion_before || undefined) as EmotionalState | undefined,
      emotion_after: (form.emotion_after || undefined) as EmotionalState | undefined,
      notes: form.notes || undefined,
      screenshot_url: form.screenshot_url || undefined,
      entry_date: new Date(form.entry_date).toISOString(),
      exit_date: new Date(form.exit_date).toISOString(),
    }))

    setShowModal(false)
    setEditingTrade(null)
  }

  const handleEdit = (trade: Trade) => { setEditingTrade(trade); setShowModal(true) }
  const handleDelete = async (id: string) => {
    if (window.confirm(t('journal.confirm_delete'))) await deleteTrade(id)
  }

  const handleDiscord = async (trade: Trade) => {
    const webhook = settings.discord_webhook
    if (!webhook) { showToast('No Discord webhook configured — go to Settings', false); return }
    const { ok, error } = await exportTradeToDiscord(trade, webhook, currency)
    showToast(ok ? 'Trade sent to Discord!' : `Discord error: ${error}`, ok)
  }

  const handleNotion = async (trade: Trade) => {
    const apiKey = settings.notion_api_key
    const dbId = settings.notion_database_id
    if (!apiKey || !dbId) { showToast('No Notion credentials configured — go to Settings', false); return }
    const { ok, error } = await exportTradeToNotion(trade, apiKey, dbId, currency)
    showToast(ok ? 'Trade sent to Notion!' : `Notion error: ${error}`, ok)
  }

  const initialForm = editingTrade ? {
    symbol: editingTrade.symbol, type: editingTrade.type,
    entry_price: String(editingTrade.entry_price), exit_price: String(editingTrade.exit_price),
    quantity: String(editingTrade.quantity),
    stop_loss: editingTrade.stop_loss ? String(editingTrade.stop_loss) : '',
    take_profit: editingTrade.take_profit ? String(editingTrade.take_profit) : '',
    strategy: editingTrade.strategy ?? '', timeframe: editingTrade.timeframe ?? '1H',
    setup_quality: (editingTrade.setup_quality ?? '') as SetupQuality | '',
    emotion_before: (editingTrade.emotion_before ?? '') as EmotionalState | '',
    emotion_after: (editingTrade.emotion_after ?? '') as EmotionalState | '',
    notes: editingTrade.notes ?? '', screenshot_url: editingTrade.screenshot_url ?? '',
    entry_date: editingTrade.entry_date.slice(0, 16),
    exit_date: editingTrade.exit_date.slice(0, 16),
  } : EMPTY_FORM

  return (
    <div>
      <Header title={t('journal.title')} actions={
        <Button icon={<Plus size={16} />} onClick={() => { setEditingTrade(null); setShowModal(true) }}>
          {t('journal.add_trade')}
        </Button>
      } />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border ${
              toast.ok
                ? 'bg-brand-500/20 border-brand-500/30 text-brand-300'
                : 'bg-red-500/20 border-red-500/30 text-red-300'
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-surface-500 text-sm">{t('journal.no_trades')}</p>
        </div>
      ) : (
        <div className="bg-surface-850 border border-surface-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700">
                {['Symbol', 'Type', 'Entry', 'Exit', 'SL', 'TP', 'PnL', 'R:R', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map(trade => (
                  <TradeRow
                    key={trade.id}
                    trade={trade}
                    currency={currency}
                    onEdit={() => handleEdit(trade)}
                    onDelete={() => handleDelete(trade.id)}
                    onDiscord={() => handleDiscord(trade)}
                    onNotion={() => handleNotion(trade)}
                  />
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
          currency={currency}
        />
      </Modal>
    </div>
  )
}
