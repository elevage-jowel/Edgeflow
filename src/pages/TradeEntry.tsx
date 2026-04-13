import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Target,
  BookOpen,
  Brain,
  Camera,
  CheckCircle,
  RotateCcw,
  Save,
  Zap,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { useI18n } from '../i18n'
import { Header } from '../components/Layout/Header'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import type { EmotionalState, TradeStatus, TradeSource, TradeOrderType, TradeResult } from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOTIONS: EmotionalState[] = [
  'confident', 'fearful', 'greedy', 'neutral', 'anxious', 'focused', 'fomo', 'disciplined',
]

// ─── Form state ───────────────────────────────────────────────────────────────

interface TradeEntryFormState {
  // General
  date: string
  entry_time: string
  exit_time: string
  pair: string
  prop_firm: string
  source: TradeSource
  // Details
  order_type: TradeOrderType
  direction: 'long' | 'short'
  entry_price: string
  stop_loss: string
  take_profit: string
  rr: string
  risk_percent: string
  // Result
  trade_result: TradeResult
  pnl: string
  // Context
  setup: string
  reason: string
  // Psychology
  emotion_before: EmotionalState | ''
  emotion_after: EmotionalState | ''
  // Media
  screenshot: string
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const EMPTY_FORM: TradeEntryFormState = {
  date: todayStr(),
  entry_time: '',
  exit_time: '',
  pair: '',
  prop_firm: '',
  source: 'live',
  order_type: 'manual',
  direction: 'long',
  entry_price: '',
  stop_loss: '',
  take_profit: '',
  rr: '',
  risk_percent: '',
  trade_result: 'tp',
  pnl: '',
  setup: '',
  reason: '',
  emotion_before: '',
  emotion_after: '',
  screenshot: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeAutoRR(
  entry: number,
  sl: number,
  tp: number,
  direction: 'long' | 'short',
): number | null {
  const risk = direction === 'long' ? entry - sl : sl - entry
  const reward = direction === 'long' ? tp - entry : entry - tp
  if (risk <= 0 || reward <= 0) return null
  return parseFloat((reward / risk).toFixed(2))
}

function resultToStatus(result: TradeResult): TradeStatus {
  if (result === 'tp') return 'win'
  if (result === 'sl') return 'loss'
  return 'breakeven'
}

function formatPair(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9/]/g, '')
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  children,
  delay = 0,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="bg-surface-850 border border-surface-700 rounded-xl p-6 space-y-4"
    >
      <h2 className="flex items-center gap-2 text-xs font-semibold text-surface-300 uppercase tracking-wider pb-3 border-b border-surface-700">
        <span className="text-brand-400">{icon}</span>
        {title}
      </h2>
      {children}
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TradeEntry() {
  const { t } = useI18n()
  const { addTrade, settings } = useStore()
  const currency = settings.currency ?? 'USD'

  const [form, setForm] = useState<TradeEntryFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof TradeEntryFormState, string>>>({})

  const set = (k: keyof TradeEntryFormState, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }))
  }

  // ── Auto-compute RR from entry / SL / TP ──────────────────────────────────
  const autoRR = useMemo(() => {
    const e = parseFloat(form.entry_price)
    const sl = parseFloat(form.stop_loss)
    const tp = parseFloat(form.take_profit)
    if (e > 0 && sl > 0 && tp > 0 && !isNaN(e) && !isNaN(sl) && !isNaN(tp)) {
      return computeAutoRR(e, sl, tp, form.direction)
    }
    return null
  }, [form.entry_price, form.stop_loss, form.take_profit, form.direction])

  // ── PnL display color ─────────────────────────────────────────────────────
  const pnlValue = parseFloat(form.pnl)
  const pnlColor = !form.pnl || isNaN(pnlValue)
    ? 'text-surface-300'
    : pnlValue > 0 ? 'text-brand-400' : 'text-red-400'

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Partial<Record<keyof TradeEntryFormState, string>> = {}
    if (!form.date) errs.date = t('trade_entry.required')
    if (!form.pair.trim()) errs.pair = t('trade_entry.required')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const symbol = form.pair.toUpperCase().replace(/[^A-Z0-9]/g, '')

      const entryDateTime = form.entry_time
        ? `${form.date}T${form.entry_time}:00`
        : `${form.date}T00:00:00`
      const exitDateTime = form.exit_time
        ? `${form.date}T${form.exit_time}:00`
        : `${form.date}T00:00:00`

      const rrVal = form.rr
        ? parseFloat(form.rr)
        : autoRR ?? undefined

      await addTrade({
        symbol,
        type: form.direction === 'long' ? 'buy' : 'sell',
        entry_price: parseFloat(form.entry_price) || 0,
        pnl: parseFloat(form.pnl) || 0,
        r_multiple: rrVal,
        status: resultToStatus(form.trade_result),
        strategy: form.setup || undefined,
        notes: form.reason || undefined,
        stop_loss: form.stop_loss ? parseFloat(form.stop_loss) : undefined,
        take_profit: form.take_profit ? parseFloat(form.take_profit) : undefined,
        emotion_before: (form.emotion_before || undefined) as EmotionalState | undefined,
        emotion_after: (form.emotion_after || undefined) as EmotionalState | undefined,
        screenshot_url: form.screenshot || undefined,
        entry_date: new Date(entryDateTime).toISOString(),
        exit_date: new Date(exitDateTime).toISOString(),
        // Extended fields
        source: form.source,
        prop_firm: form.prop_firm || undefined,
        order_type: form.order_type,
        direction: form.direction,
        risk_percent: form.risk_percent ? parseFloat(form.risk_percent) : undefined,
        trade_result: form.trade_result,
      })

      setSaved(true)
      // Keep the date so consecutive entries are fast
      setForm(f => ({ ...EMPTY_FORM, date: f.date }))
      setErrors({})
      setTimeout(() => setSaved(false), 4000)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setSaved(false)
  }

  // ── Emotion options ───────────────────────────────────────────────────────
  const emotionOptions = [
    { value: '', label: '—' },
    ...EMOTIONS.map(em => ({ value: em, label: t(`emotion.${em}`) })),
  ]

  // ── Result label helper ───────────────────────────────────────────────────
  const resultLabel = (r: TradeResult) =>
    t(`trade_entry.result_${r}`)

  // ── Result badge colors ───────────────────────────────────────────────────
  const resultColors: Record<TradeResult, string> = {
    tp: 'bg-brand-500/10 border-brand-500/20 text-brand-400',
    sl: 'bg-red-500/10 border-red-500/20 text-red-400',
    be: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    custom: 'bg-surface-750 border-surface-600 text-surface-300',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5 pb-10"
    >
      <Header
        title={t('trade_entry.title')}
        subtitle={t('trade_entry.subtitle')}
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<RotateCcw size={14} />}
            onClick={handleReset}
          >
            {t('trade_entry.reset')}
          </Button>
        }
      />

      {/* Success banner */}
      <AnimatePresence>
        {saved && (
          <motion.div
            key="saved-banner"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-4 py-3 bg-brand-500/10 border border-brand-500/20 rounded-xl"
          >
            <CheckCircle size={16} className="text-brand-400 flex-shrink-0" />
            <span className="text-sm text-brand-300 font-medium">{t('trade_entry.saved')}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSave} noValidate className="space-y-4">

        {/* ── Section 1: General Information ──────────────────────────────── */}
        <SectionCard
          title={t('trade_entry.section_general')}
          icon={<Calendar size={14} />}
          delay={0.04}
        >
          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('trade_entry.date')}
              type="date"
              value={form.date}
              onChange={e => set('date', e.target.value)}
              required
              error={errors.date}
            />
            <Input
              label={t('trade_entry.entry_time')}
              type="time"
              value={form.entry_time}
              onChange={e => set('entry_time', e.target.value)}
            />
            <Input
              label={t('trade_entry.exit_time')}
              type="time"
              value={form.exit_time}
              onChange={e => set('exit_time', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('trade_entry.pair')}
              value={form.pair}
              onChange={e => set('pair', formatPair(e.target.value))}
              placeholder="EURUSD, BTCUSD..."
              required
              error={errors.pair}
              hint={t('trade_entry.pair_hint')}
            />
            <Input
              label={t('trade_entry.prop_firm')}
              value={form.prop_firm}
              onChange={e => set('prop_firm', e.target.value)}
              placeholder="None"
            />
            <Select
              label={t('trade_entry.source')}
              value={form.source}
              onChange={e => set('source', e.target.value as TradeSource)}
              options={[
                { value: 'live', label: t('trade_entry.source_live') },
                { value: 'backtest', label: t('trade_entry.source_backtest') },
              ]}
            />
          </div>
        </SectionCard>

        {/* ── Section 2: Trade Details ─────────────────────────────────────── */}
        <SectionCard
          title={t('trade_entry.section_details')}
          icon={<Zap size={14} />}
          delay={0.07}
        >
          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t('trade_entry.order_type')}
              value={form.order_type}
              onChange={e => set('order_type', e.target.value as TradeOrderType)}
              options={[
                { value: 'manual', label: t('trade_entry.order_manual') },
                { value: 'automatic', label: t('trade_entry.order_automatic') },
              ]}
            />
            {/* Direction toggle */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">
                {t('trade_entry.direction')}
              </label>
              <div className="grid grid-cols-2 gap-1 bg-surface-800 border border-surface-600 rounded-lg p-1">
                {(['long', 'short'] as const).map(dir => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => set('direction', dir)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                      form.direction === dir
                        ? dir === 'long'
                          ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'text-surface-400 hover:text-white'
                    }`}
                  >
                    {dir === 'long'
                      ? <TrendingUp size={12} />
                      : <TrendingDown size={12} />}
                    {t(`trade_entry.${dir}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('trade_entry.entry_price')}
              type="number"
              step="any"
              min="0"
              value={form.entry_price}
              onChange={e => set('entry_price', e.target.value)}
              placeholder="0.00000"
            />
            <Input
              label={t('trade_entry.stop_loss')}
              type="number"
              step="any"
              min="0"
              value={form.stop_loss}
              onChange={e => set('stop_loss', e.target.value)}
              placeholder="0.00000"
            />
            <Input
              label={t('trade_entry.take_profit')}
              type="number"
              step="any"
              min="0"
              value={form.take_profit}
              onChange={e => set('take_profit', e.target.value)}
              placeholder="0.00000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* RR field with auto-compute helper */}
            <div className="flex flex-col gap-1">
              <Input
                label={t('trade_entry.rr')}
                type="number"
                step="0.01"
                min="0"
                value={form.rr}
                onChange={e => set('rr', e.target.value)}
                placeholder={autoRR !== null ? String(autoRR) : '2.00'}
              />
              <AnimatePresence>
                {autoRR !== null && !form.rr && (
                  <motion.button
                    key="auto-rr"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    type="button"
                    onClick={() => set('rr', String(autoRR))}
                    className="text-left text-xs text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    {t('trade_entry.auto_rr')}: {autoRR}R ↗
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <Input
              label={t('trade_entry.risk_percent')}
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={form.risk_percent}
              onChange={e => set('risk_percent', e.target.value)}
              placeholder="1.0"
            />
          </div>
        </SectionCard>

        {/* ── Section 3: Result ────────────────────────────────────────────── */}
        <SectionCard
          title={t('trade_entry.section_result')}
          icon={<Target size={14} />}
          delay={0.10}
        >
          <div className="grid grid-cols-2 gap-4">
            {/* Result selector */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">
                {t('trade_entry.result')}
              </label>
              <div className="grid grid-cols-2 gap-1 bg-surface-800 border border-surface-600 rounded-lg p-1">
                {(['tp', 'sl', 'be', 'custom'] as TradeResult[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => set('trade_result', r)}
                    className={`py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                      form.trade_result === r
                        ? resultColors[r]
                        : 'text-surface-400 hover:text-white'
                    }`}
                  >
                    {r === 'tp' ? 'TP' : r === 'sl' ? 'SL' : r === 'be' ? 'BE' : 'Custom'}
                  </button>
                ))}
              </div>
            </div>

            {/* PnL input */}
            <Input
              label={`${t('trade_entry.pnl')} (${currency})`}
              type="number"
              step="any"
              value={form.pnl}
              onChange={e => set('pnl', e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Result summary badge */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
            form.trade_result === 'tp'
              ? 'bg-brand-500/10 border-brand-500/20'
              : form.trade_result === 'sl'
              ? 'bg-red-500/10 border-red-500/20'
              : form.trade_result === 'be'
              ? 'bg-amber-500/10 border-amber-500/20'
              : 'bg-surface-800 border-surface-600'
          }`}>
            {form.trade_result === 'tp'
              ? <TrendingUp size={14} className="text-brand-400 flex-shrink-0" />
              : form.trade_result === 'sl'
              ? <TrendingDown size={14} className="text-red-400 flex-shrink-0" />
              : <Target size={14} className="text-amber-400 flex-shrink-0" />}

            <div className="flex-1 min-w-0">
              <span className={`text-xs font-medium ${
                form.trade_result === 'tp' ? 'text-brand-300'
                : form.trade_result === 'sl' ? 'text-red-300'
                : form.trade_result === 'be' ? 'text-amber-300'
                : 'text-surface-300'
              }`}>
                {resultLabel(form.trade_result)}
              </span>
              {(form.rr || autoRR) && (
                <span className="ml-3 font-mono text-xs text-surface-400">
                  {form.rr || autoRR}R
                </span>
              )}
            </div>

            {form.pnl && !isNaN(pnlValue) && (
              <span className={`font-mono font-bold text-sm flex-shrink-0 ${pnlColor}`}>
                {pnlValue > 0 ? '+' : ''}{pnlValue.toFixed(2)} {currency}
              </span>
            )}
          </div>
        </SectionCard>

        {/* ── Sections 4 + 5: Context & Psychology (side-by-side) ─────────── */}
        <div className="grid grid-cols-2 gap-4">
          <SectionCard
            title={t('trade_entry.section_context')}
            icon={<BookOpen size={14} />}
            delay={0.13}
          >
            <Input
              label={t('trade_entry.setup')}
              value={form.setup}
              onChange={e => set('setup', e.target.value)}
              placeholder="London Breakout, SMC, ICT..."
            />
            <Textarea
              label={t('trade_entry.reason')}
              value={form.reason}
              onChange={e => set('reason', e.target.value)}
              rows={6}
              placeholder={t('trade_entry.reason_placeholder')}
            />
          </SectionCard>

          <SectionCard
            title={t('trade_entry.section_psychology')}
            icon={<Brain size={14} />}
            delay={0.13}
          >
            <Select
              label={t('trade_entry.emotion_before')}
              value={form.emotion_before}
              onChange={e => set('emotion_before', e.target.value)}
              options={emotionOptions}
            />
            <Select
              label={t('trade_entry.emotion_after')}
              value={form.emotion_after}
              onChange={e => set('emotion_after', e.target.value)}
              options={emotionOptions}
            />

            {/* Emotion visual pills */}
            <AnimatePresence>
              {(form.emotion_before || form.emotion_after) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-2 gap-3 pt-1"
                >
                  {form.emotion_before && (
                    <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-surface-800 border border-surface-600">
                      <span className="text-xs text-surface-500">{t('trade_entry.emotion_before')}</span>
                      <span className="text-sm font-medium text-surface-200 capitalize">
                        {t(`emotion.${form.emotion_before}`)}
                      </span>
                    </div>
                  )}
                  {form.emotion_after && (
                    <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-surface-800 border border-surface-600">
                      <span className="text-xs text-surface-500">{t('trade_entry.emotion_after')}</span>
                      <span className="text-sm font-medium text-surface-200 capitalize">
                        {t(`emotion.${form.emotion_after}`)}
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </SectionCard>
        </div>

        {/* ── Section 6: Media ─────────────────────────────────────────────── */}
        <SectionCard
          title={t('trade_entry.section_media')}
          icon={<Camera size={14} />}
          delay={0.16}
        >
          <Input
            label={t('trade_entry.screenshot')}
            value={form.screenshot}
            onChange={e => set('screenshot', e.target.value)}
            placeholder="https://i.imgur.com/..."
          />
          <AnimatePresence>
            {form.screenshot && (
              <motion.div
                key="screenshot-preview"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-lg border border-surface-600"
              >
                <img
                  src={form.screenshot}
                  alt="Trade screenshot"
                  className="w-full max-h-72 object-contain bg-surface-800"
                  onError={e => {
                    ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </SectionCard>

        {/* ── Submit bar ───────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between pt-2"
        >
          <p className="text-xs text-surface-500">
            * {t('trade_entry.required')} — Date, {t('trade_entry.pair')}
          </p>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<RotateCcw size={14} />}
              onClick={handleReset}
            >
              {t('trade_entry.reset')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={saving}
              icon={<Save size={15} />}
            >
              {t('trade_entry.save')}
            </Button>
          </div>
        </motion.div>

      </form>
    </motion.div>
  )
}
