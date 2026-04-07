'use client'
import { useState, useMemo } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTradeActions } from '@/lib/hooks/useTrades'
import { useSetupPlans } from '@/lib/hooks/useSetupPlans'
import { usePoints } from '@/lib/hooks/usePoints'
import { Trade, TradeVerification } from '@/lib/types'
import { verifyTrade, findMatchingPlan, defaultUserPoints } from '@/lib/scoring/planEngine'
import { ScoreCard } from '@/components/scoring/ScoreCard'
import { useAuthStore } from '@/lib/stores/authStore'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import toast from 'react-hot-toast'
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Zap, SlidersHorizontal, Star, AlertTriangle, ImagePlus, X, Loader2 } from 'lucide-react'
import { uploadTradeScreenshot } from '@/lib/firebase/storageUtils'

// ─── Static options ───────────────────────────────────────────────────────────

const SETUPS = [
  'Liquidity Sweep', 'Breakout', 'Retest', 'Reversal', 'Trend Continuation',
  'Range Reaction', 'News Trade', 'SMT Divergence', 'ICT Model', 'VWAP Rejection',
  'Opening Range Breakout', 'Support/Resistance', 'Fair Value Gap', 'Order Block', 'Custom',
]
const SESSIONS = [
  'London Open', 'London Mid', 'New York Open', 'New York Mid', 'New York Close',
  'London/NY Overlap', 'Asian Session', 'Sydney Session', 'Pre-Market', 'After-Hours',
]
const PROP_FIRMS = [
  'FTMO', 'MyForexFunds', 'The5%ers', 'FundedNext', 'True Forex Funds',
  'Apex', 'TopStep', 'Earn2Trade', 'E8 Funding', 'Other',
]
const MARKET_CONDITIONS = [
  'Trending Up', 'Trending Down', 'Ranging', 'High Volatility', 'Low Volatility',
  'News Event', 'Consolidating', 'Pre-News', 'Reversal Zone',
]
const EMOTIONS = [
  { v: 'calm', l: 'Calm', e: '😌' },
  { v: 'focused', l: 'Focused', e: '🎯' },
  { v: 'confident', l: 'Confident', e: '💪' },
  { v: 'hesitant', l: 'Hesitant', e: '🤔' },
  { v: 'fearful', l: 'Fearful', e: '😰' },
  { v: 'greedy', l: 'Greedy', e: '🤑' },
  { v: 'frustrated', l: 'Frustrated', e: '😤' },
  { v: 'tired', l: 'Tired', e: '😴' },
  { v: 'fomo', l: 'FOMO', e: '😱' },
  { v: 'revenge', l: 'Revenge', e: '😡' },
  { v: 'overconfident', l: 'Overconf.', e: '🦁' },
  { v: 'distracted', l: 'Distracted', e: '💭' },
]
const MISTAKE_TAGS = [
  'No Setup', 'FOMO Entry', 'Oversize', 'Moved SL',
  'Early Exit', 'Late Entry', 'No Plan', 'Chased Price',
  'News Caught', 'Rule Break', 'Revenge Trade', 'Overtrading',
]
const RESULTS: { v: Trade['outcome'], l: string, cls: string }[] = [
  { v: 'win',       l: 'Win',       cls: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' },
  { v: 'loss',      l: 'Loss',      cls: 'bg-red-500/20 border-red-500/50 text-red-400' },
  { v: 'breakeven', l: 'Breakeven', cls: 'bg-amber-500/20 border-amber-500/50 text-amber-400' },
]

// ─── Zod schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  // Core — Quick mode
  symbol: z.string().min(1, 'Required'),
  assetClass: z.enum(['stocks', 'options', 'futures', 'forex', 'crypto', 'indices', 'commodities']),
  direction: z.enum(['long', 'short']),
  status: z.enum(['open', 'closed', 'partial']),
  entryDate: z.string().min(1, 'Required'),
  entryPrice: z.coerce.number().positive('Must be > 0'),
  stopLoss: z.coerce.number().positive().optional().or(z.literal('')),
  takeProfit: z.coerce.number().positive().optional().or(z.literal('')),
  exitPrice: z.coerce.number().positive().optional().or(z.literal('')),
  exitDate: z.string().optional(),
  quantity: z.coerce.number().positive().optional().or(z.literal('')),
  manualPnl: z.coerce.number().optional().or(z.literal('')),
  outcome: z.enum(['win', 'loss', 'breakeven']).optional(),
  strategy: z.string().optional(),
  notes: z.string().optional(),
  // Advanced — Account
  propFirm: z.string().optional(),
  accountType: z.enum(['challenge', 'funded', 'personal']).optional(),
  accountName: z.string().optional(),
  tradeSource: z.enum(['manual', 'signal', 'copied', 'imported']).optional(),
  // Advanced — Context
  session: z.string().optional(),
  marketCondition: z.string().optional(),
  preTradeNote: z.string().optional(),
  // Advanced — Management
  commission: z.coerce.number().min(0).default(0),
  spread: z.coerce.number().min(0).optional().or(z.literal('')),
  slippage: z.coerce.number().optional().or(z.literal('')),
  lots: z.coerce.number().positive().optional().or(z.literal('')),
  breakEvenMoved: z.boolean().default(false),
  partialsTaken: z.boolean().default(false),
  // Advanced — Psychology
  emotionBefore: z.string().optional(),
  emotionAfter: z.string().optional(),
  confidenceScore: z.coerce.number().min(1).max(10).optional().or(z.literal('')),
  ruleViolated: z.boolean().default(false),
  mistakeTags: z.array(z.string()).default([]),
  // Advanced — Ratings
  setupRating: z.coerce.number().min(1).max(5).optional().or(z.literal('')),
  executionRating: z.coerce.number().min(1).max(5).optional().or(z.literal('')),
  tags: z.string().optional(),
  playbookId: z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className="w-full flex items-center justify-between py-2 text-left group">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-slate-300 transition-colors">{title}</span>
      {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
    </button>
  )
}

function StarRating({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={cn('transition-colors', n <= (value ?? 0) ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400')}>
          <Star className="w-5 h-5 fill-current" />
        </button>
      ))}
    </div>
  )
}

function EmotionPicker({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {EMOTIONS.map(({ v, l, e }) => (
        <button key={v} type="button" onClick={() => onChange(value === v ? '' : v)}
          title={l}
          className={cn(
            'flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg border text-center transition-all',
            value === v
              ? 'border-brand-500/60 bg-brand-500/15 shadow-glow-purple'
              : 'border-surface-500 bg-surface-700/50 hover:border-surface-400',
          )}>
          <span className="text-base leading-none">{e}</span>
          <span className="text-[9px] text-slate-400 leading-tight">{l}</span>
        </button>
      ))}
    </div>
  )
}

function ConfidenceBar({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={cn(
            'flex-1 h-5 rounded-sm text-[9px] font-bold transition-all',
            n <= (value ?? 0)
              ? n <= 3 ? 'bg-red-500 text-white' : n <= 6 ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-white'
              : 'bg-surface-600 text-slate-500 hover:bg-surface-500',
          )}>
          {n}
        </button>
      ))}
    </div>
  )
}

// ─── Live Calculator ──────────────────────────────────────────────────────────

function LiveCalc({ entry, sl, tp, direction, qty, commission, exitPrice }: {
  entry: number; sl: number; tp: number; direction: 'long' | 'short';
  qty: number; commission: number; exitPrice: number;
}) {
  const dir = direction === 'long' ? 1 : -1
  const slDist = sl > 0 && entry > 0 ? Math.abs(entry - sl) : 0
  const tpDist = tp > 0 && entry > 0 ? Math.abs(entry - tp) : 0
  const rrExpected = slDist > 0 && tpDist > 0 ? (tpDist / slDist) : null
  const riskAmt = slDist > 0 && qty > 0 ? slDist * qty : null
  const expectedPnl = tpDist > 0 && qty > 0 ? tpDist * qty * dir - commission : null

  let realPnl: number | null = null
  let rMultiple: number | null = null
  if (exitPrice > 0 && entry > 0 && qty > 0) {
    const gross = (exitPrice - entry) * qty * dir
    realPnl = gross - commission
    if (riskAmt && riskAmt > 0) rMultiple = realPnl / riskAmt
  }

  const items = [
    { label: 'R:R', value: rrExpected ? `1 : ${rrExpected.toFixed(2)}` : '—', color: rrExpected && rrExpected >= 2 ? 'text-emerald-400' : rrExpected ? 'text-amber-400' : 'text-slate-400' },
    { label: 'Risk $', value: riskAmt ? `$${riskAmt.toFixed(2)}` : '—', color: 'text-slate-300' },
    { label: 'Target', value: expectedPnl !== null ? `$${expectedPnl.toFixed(2)}` : '—', color: 'text-emerald-400' },
    { label: 'R-Multiple', value: rMultiple !== null ? `${rMultiple >= 0 ? '+' : ''}${rMultiple.toFixed(2)}R` : '—', color: rMultiple !== null ? (rMultiple >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-400' },
  ]

  return (
    <div className="grid grid-cols-4 gap-2 p-3 bg-surface-900/60 border border-surface-500/50 rounded-xl">
      {items.map(({ label, value, color }) => (
        <div key={label} className="text-center">
          <div className={cn('text-sm font-bold font-mono', color)}>{value}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TradeFormProps {
  trade?: Trade
  onClose: () => void
}

export function TradeForm({ trade, onClose }: TradeFormProps) {
  const { createTrade, updateTrade } = useTradeActions()
  const { plans } = useSetupPlans()
  const { runVerification } = usePoints()
  const { userProfile } = useAuthStore()
  const [mode, setMode] = useState<'quick' | 'advanced'>('quick')
  const [sections, setSections] = useState({ account: true, context: false, management: false, psychology: false, ratings: false })
  const [pendingVerification, setPendingVerification] = useState<TradeVerification | null>(null)
  const [screenshots, setScreenshots] = useState<string[]>(trade?.screenshotUrls ?? [])
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false)
  const { user } = useAuthStore()

  const toggleSection = (k: keyof typeof sections) => setSections(p => ({ ...p, [k]: !p[k] }))

  const { register, handleSubmit, control, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: trade ? {
      symbol: trade.symbol,
      assetClass: trade.assetClass,
      direction: trade.direction,
      status: trade.status,
      entryDate: trade.entryDate.slice(0, 16),
      exitDate: trade.exitDate?.slice(0, 16) ?? '',
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice ?? '',
      quantity: trade.quantity,
      stopLoss: trade.stopLoss ?? '',
      takeProfit: trade.takeProfit ?? '',
      commission: trade.commission ?? 0,
      strategy: trade.strategy ?? '',
      session: trade.session ?? '',
      notes: trade.notes ?? '',
      tags: trade.tags.join(', '),
      outcome: trade.outcome,
      setupRating: trade.setupRating ?? '',
      executionRating: trade.executionRating ?? '',
      propFirm: trade.propFirm ?? '',
      accountType: trade.accountType,
      accountName: trade.accountName ?? '',
      tradeSource: trade.tradeSource,
      marketCondition: trade.marketCondition ?? '',
      preTradeNote: trade.preTradeNote ?? '',
      emotionBefore: trade.emotionBefore ?? '',
      emotionAfter: trade.emotionAfter ?? '',
      confidenceScore: trade.confidenceScore ?? '',
      ruleViolated: trade.ruleViolated ?? false,
      mistakeTags: trade.mistakeTags ?? [],
      breakEvenMoved: trade.breakEvenMoved ?? false,
      partialsTaken: trade.partialsTaken ?? false,
      lots: trade.lots ?? '',
      spread: trade.spread ?? '',
      slippage: trade.slippage ?? '',
    } : {
      assetClass: 'forex',
      direction: 'long',
      status: 'closed',
      commission: 0,
      breakEvenMoved: false,
      partialsTaken: false,
      ruleViolated: false,
      mistakeTags: [],
    },
  })

  // Live watched values for calculator
  const watched = useWatch({ control, name: ['entryPrice', 'stopLoss', 'takeProfit', 'direction', 'quantity', 'commission', 'exitPrice'] })
  const [wEntry, wSl, wTp, wDir, wQty, wComm, wExit] = watched.map(Number)

  const direction = watch('direction')
  const outcome = watch('outcome')
  const emotionBefore = watch('emotionBefore')
  const emotionAfter = watch('emotionAfter')
  const confidenceScore = watch('confidenceScore')
  const setupRating = watch('setupRating')
  const executionRating = watch('executionRating')
  const mistakeTags = watch('mistakeTags') ?? []

  const toggleMistakeTag = (tag: string) => {
    const current = mistakeTags
    setValue('mistakeTags', current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag])
  }

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    try {
      setUploadingScreenshot(true)
      const tradeId = trade?.id ?? `tmp_${Date.now()}`
      const url = await uploadTradeScreenshot(user.uid, tradeId, file)
      setScreenshots(prev => [...prev, url])
      toast.success('Screenshot uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploadingScreenshot(false)
      e.target.value = ''
    }
  }

  const removeScreenshot = (url: string) => {
    setScreenshots(prev => prev.filter(s => s !== url))
  }

  const onSubmit = async (data: FormData) => {
    try {
      const dir = data.direction === 'long' ? 1 : -1
      const qty = Number(data.quantity) || 0
      const entry = data.entryPrice
      const exit = data.exitPrice ? Number(data.exitPrice) : undefined
      const sl = data.stopLoss ? Number(data.stopLoss) : undefined
      const tp = data.takeProfit ? Number(data.takeProfit) : undefined
      const comm = data.commission ?? 0
      const slDist = sl ? Math.abs(entry - sl) : 0
      const tpDist = tp ? Math.abs(entry - tp) : 0

      let grossPnl: number | undefined
      let netPnl: number | undefined
      let rMultiple: number | undefined

      if (exit && qty > 0) {
        grossPnl = parseFloat(((exit - entry) * qty * dir).toFixed(2))
        netPnl = parseFloat((grossPnl - comm).toFixed(2))
        const riskAmt = slDist * qty
        if (riskAmt > 0) rMultiple = parseFloat((netPnl / riskAmt).toFixed(2))
      } else if (data.manualPnl !== undefined && data.manualPnl !== '') {
        netPnl = Number(data.manualPnl)
      }

      const detectedOutcome: Trade['outcome'] =
        data.outcome ??
        (netPnl !== undefined ? (netPnl > 0 ? 'win' : netPnl < 0 ? 'loss' : 'breakeven') : undefined)

      const payload: Omit<Trade, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        symbol: data.symbol.toUpperCase(),
        assetClass: data.assetClass,
        direction: data.direction,
        status: data.status,
        outcome: detectedOutcome,
        entryDate: new Date(data.entryDate).toISOString(),
        exitDate: data.exitDate ? new Date(data.exitDate).toISOString() : undefined,
        entryPrice: entry,
        exitPrice: exit,
        quantity: qty || 1,
        commission: comm,
        grossPnl,
        netPnl,
        rMultiple,
        stopLoss: sl,
        takeProfit: tp,
        riskRewardRatio: slDist > 0 && tpDist > 0 ? parseFloat((tpDist / slDist).toFixed(2)) : undefined,
        strategy: data.strategy || undefined,
        session: data.session || undefined,
        notes: data.notes || '',
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        screenshotUrls: screenshots,
        setupRating: data.setupRating ? Number(data.setupRating) : undefined,
        executionRating: data.executionRating ? Number(data.executionRating) : undefined,
        propFirm: data.propFirm || undefined,
        accountType: data.accountType || undefined,
        accountName: data.accountName || undefined,
        tradeSource: data.tradeSource || undefined,
        marketCondition: data.marketCondition || undefined,
        preTradeNote: data.preTradeNote || undefined,
        emotionBefore: data.emotionBefore || undefined,
        emotionAfter: data.emotionAfter || undefined,
        confidenceScore: data.confidenceScore ? Number(data.confidenceScore) : undefined,
        ruleViolated: data.ruleViolated || false,
        mistakeTags: data.mistakeTags?.length ? data.mistakeTags : undefined,
        breakEvenMoved: data.breakEvenMoved || false,
        partialsTaken: data.partialsTaken || false,
        lots: data.lots ? Number(data.lots) : undefined,
        spread: data.spread ? Number(data.spread) : undefined,
        slippage: data.slippage ? Number(data.slippage) : undefined,
      }

      let savedTrade: Trade
      if (trade) {
        await updateTrade(trade.id, payload as any)
        savedTrade = { ...trade, ...(payload as any) }
        toast.success('Trade updated')
      } else {
        savedTrade = await createTrade(payload as any)
        toast.success('Trade saved')
      }

      // Auto-verification: find matching plan and score the trade
      const matchingPlan = findMatchingPlan(savedTrade, plans)
      if (matchingPlan) {
        const currentStreak = userProfile?.points?.currentStreak ?? 0
        const verification = verifyTrade(savedTrade, matchingPlan, 'live', currentStreak)
        setPendingVerification(verification)
        // Save verification to Firestore in background
        runVerification(savedTrade, matchingPlan, 'live').catch(() => {})
      } else {
        onClose()
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save trade')
    }
  }

  const inp = "w-full px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
  const lbl = "block text-xs font-medium text-slate-400 mb-1.5"
  const err = "text-red-400 text-[11px] mt-1"
  const divider = <div className="border-t border-surface-500/60" />

  if (pendingVerification) {
    return (
      <div className="p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white mb-0.5">Setup Verification</h3>
          <p className="text-xs text-slate-500">Automatic analysis of your trade against the {pendingVerification.planName} plan</p>
        </div>
        <ScoreCard verification={pendingVerification} />
        <div className="flex justify-end pt-2">
          <Button variant="primary" onClick={() => { setPendingVerification(null); onClose() }}>
            Continue
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* ── Header strip ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-surface-500 bg-surface-900/40">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Mode :</span>
          <div className="flex rounded-lg overflow-hidden border border-surface-500">
            <button type="button" onClick={() => setMode('quick')}
              className={cn('flex items-center gap-1 px-3 py-1 text-xs font-medium transition-all', mode === 'quick' ? 'bg-brand-600 text-white' : 'hover:text-white')}>
              <Zap className="w-3 h-3" /> Quick
            </button>
            <button type="button" onClick={() => setMode('advanced')}
              className={cn('flex items-center gap-1 px-3 py-1 text-xs font-medium transition-all', mode === 'advanced' ? 'bg-brand-600 text-white' : 'hover:text-white')}>
              <SlidersHorizontal className="w-3 h-3" /> Advanced
            </button>
          </div>
        </div>
        {mode === 'advanced' && (
          <span className="text-[10px] text-slate-500 italic">Tous les champs facultatifs sauf *</span>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* ── Direction toggle ─────────────────────────────────────────────────── */}
        <div>
          <label className={lbl}>Direction *</label>
          <div className="grid grid-cols-2 gap-2">
            {(['long', 'short'] as const).map(d => (
              <button key={d} type="button" onClick={() => setValue('direction', d)}
                className={cn(
                  'flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold text-sm transition-all',
                  direction === d
                    ? d === 'long'
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                      : 'bg-red-500/20 border-red-500/60 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                    : 'border-surface-500 bg-surface-700/40 text-slate-400 hover:text-white',
                )}>
                {d === 'long' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {d === 'long' ? 'Long / Buy' : 'Short / Sell'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Instrument ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Instrument *</label>
            <input {...register('symbol')} placeholder="EUR/USD, XAUUSD, NAS100…" className={`${inp} uppercase`} />
            {errors.symbol && <p className={err}>{errors.symbol.message}</p>}
          </div>
          <div>
            <label className={lbl}>Classe d&apos;actif *</label>
            <select {...register('assetClass')} className={inp}>
              <option value="forex">Forex</option>
              <option value="indices">Indices</option>
              <option value="commodities">Commodities / Gold</option>
              <option value="crypto">Crypto</option>
              <option value="stocks">Actions</option>
              <option value="futures">Futures</option>
              <option value="options">Options</option>
            </select>
          </div>
        </div>

        {/* ── Date & Time ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Entrée (date & heure) *</label>
            <input {...register('entryDate')} type="datetime-local" className={inp} />
            {errors.entryDate && <p className={err}>{errors.entryDate.message}</p>}
          </div>
          <div>
            <label className={lbl}>Sortie (date & heure)</label>
            <input {...register('exitDate')} type="datetime-local" className={inp} />
          </div>
        </div>

        {/* ── Prices ───────────────────────────────────────────────────────────── */}
        <div>
          <label className={lbl}>Prix</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: 'entryPrice', label: 'Entry *', placeholder: '1.08500' },
              { name: 'exitPrice',  label: 'Exit',    placeholder: '1.09200' },
              { name: 'stopLoss',   label: 'Stop Loss', placeholder: '1.08200' },
              { name: 'takeProfit', label: 'Take Profit', placeholder: '1.09800' },
            ].map(({ name, label, placeholder }) => (
              <div key={name}>
                <label className="text-[11px] text-slate-500 mb-1 block">{label}</label>
                <input {...register(name as any)} type="number" step="any" placeholder={placeholder}
                  className={inp} />
                {(errors as any)[name] && <p className={err}>{(errors as any)[name]?.message}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Live Calculator ───────────────────────────────────────────────────── */}
        <LiveCalc
          entry={wEntry || 0} sl={wSl || 0} tp={wTp || 0}
          direction={direction} qty={wQty || 0}
          commission={wComm || 0} exitPrice={wExit || 0}
        />

        {/* ── Result + P&L ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Résultat</label>
            <div className="grid grid-cols-3 gap-1.5">
              {RESULTS.map(({ v, l, cls }) => (
                <button key={v} type="button" onClick={() => setValue('outcome', outcome === v ? undefined : v!)}
                  className={cn('py-1.5 rounded-lg border text-xs font-semibold transition-all', outcome === v ? cls : 'border-surface-500 bg-surface-700/40 text-slate-400 hover:text-white')}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={lbl}>P&amp;L (manuel si pas d&apos;exit)</label>
            <input {...register('manualPnl')} type="number" step="any" placeholder="+125.00"
              className={inp} />
          </div>
        </div>

        {/* ── Quantity / Lots ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Quantité</label>
            <input {...register('quantity')} type="number" step="any" placeholder="1" className={inp} />
          </div>
          <div>
            <label className={lbl}>Lots (forex)</label>
            <input {...register('lots')} type="number" step="0.01" placeholder="0.10" className={inp} />
          </div>
        </div>

        {/* ── Setup + Note ─────────────────────────────────────────────────────── */}
        <div>
          <label className={lbl}>Setup</label>
          <select {...register('strategy')} className={inp}>
            <option value="">Sélectionner un setup…</option>
            {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className={lbl}>Note rapide</label>
          <textarea {...register('notes')} rows={mode === 'quick' ? 2 : 3}
            placeholder="Pourquoi ce trade ? Ce que tu as vu sur le graphique…"
            className={`${inp} resize-none`} />
        </div>

        {/* ════════════════════════════════════════════════════════════════════════
            ADVANCED MODE SECTIONS
        ════════════════════════════════════════════════════════════════════════ */}
        {mode === 'advanced' && (
          <>
            {divider}

            {/* Section — Account & Prop Firm */}
            <div>
              <SectionHeader title="🏢 Compte & Prop Firm" open={sections.account} onToggle={() => toggleSection('account')} />
              {sections.account && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Prop Firm</label>
                      <select {...register('propFirm')} className={inp}>
                        <option value="">Aucune / Perso</option>
                        {PROP_FIRMS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Phase du compte</label>
                      <select {...register('accountType')} className={inp}>
                        <option value="">—</option>
                        <option value="challenge">Challenge / Évaluation</option>
                        <option value="funded">Funded / Live</option>
                        <option value="personal">Compte Personnel</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Nom du compte</label>
                      <input {...register('accountName')} placeholder="FTMO 100k — Phase 1" className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Source du trade</label>
                      <select {...register('tradeSource')} className={inp}>
                        <option value="">—</option>
                        <option value="manual">Manuel</option>
                        <option value="signal">Signal</option>
                        <option value="copied">Copié</option>
                        <option value="imported">Importé</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {divider}

            {/* Section — Market Context */}
            <div>
              <SectionHeader title="🌍 Contexte de marché" open={sections.context} onToggle={() => toggleSection('context')} />
              {sections.context && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Session</label>
                      <select {...register('session')} className={inp}>
                        <option value="">—</option>
                        {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Condition de marché</label>
                      <select {...register('marketCondition')} className={inp}>
                        <option value="">—</option>
                        {MARKET_CONDITIONS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Biais pré-trade</label>
                    <textarea {...register('preTradeNote')} rows={2} placeholder="Structure du marché, niveaux clés, raison de l'entrée…" className={`${inp} resize-none`} />
                  </div>
                </div>
              )}
            </div>

            {divider}

            {/* Section — Trade Management */}
            <div>
              <SectionHeader title="⚙️ Gestion du trade" open={sections.management} onToggle={() => toggleSection('management')} />
              {sections.management && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={lbl}>Commission / Frais</label>
                      <input {...register('commission')} type="number" step="any" placeholder="0" className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Spread (pips)</label>
                      <input {...register('spread')} type="number" step="any" placeholder="1.5" className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Slippage (pips)</label>
                      <input {...register('slippage')} type="number" step="any" placeholder="0.5" className={inp} />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    {[
                      { name: 'breakEvenMoved', label: '✅ Stop ramené au BE' },
                      { name: 'partialsTaken',  label: '📤 Partiels pris' },
                      { name: 'ruleViolated',   label: '⚠️ Règle violée' },
                    ].map(({ name, label }) => (
                      <label key={name} className="flex items-center gap-2 cursor-pointer group">
                        <input {...register(name as any)} type="checkbox"
                          className="w-4 h-4 rounded border-surface-500 bg-surface-700 text-brand-500 focus:ring-0 focus:ring-offset-0" />
                        <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{label}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <label className={lbl}>Tags (virgules)</label>
                    <input {...register('tags')} placeholder="liquidity, nyopen, gold, …" className={inp} />
                  </div>
                </div>
              )}
            </div>

            {divider}

            {/* Section — Psychology */}
            <div>
              <SectionHeader title="🧠 Psychologie" open={sections.psychology} onToggle={() => toggleSection('psychology')} />
              {sections.psychology && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className={lbl}>Émotion avant le trade</label>
                    <EmotionPicker value={emotionBefore} onChange={v => setValue('emotionBefore', v)} />
                  </div>
                  <div>
                    <label className={lbl}>Émotion après le trade</label>
                    <EmotionPicker value={emotionAfter} onChange={v => setValue('emotionAfter', v)} />
                  </div>
                  <div>
                    <label className={lbl}>Score de confiance (1–10)</label>
                    <ConfidenceBar
                      value={confidenceScore ? Number(confidenceScore) : undefined}
                      onChange={v => setValue('confidenceScore', v)}
                    />
                  </div>
                  <div>
                    <label className={lbl}>Tags d&apos;erreurs</label>
                    <div className="flex flex-wrap gap-1.5">
                      {MISTAKE_TAGS.map(tag => (
                        <button key={tag} type="button" onClick={() => toggleMistakeTag(tag)}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                            mistakeTags.includes(tag)
                              ? 'bg-red-500/20 border-red-500/50 text-red-400'
                              : 'border-surface-500 bg-surface-700/40 text-slate-400 hover:text-white',
                          )}>
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rule violated warning */}
                  {watch('ruleViolated') && (
                    <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs text-amber-300">Trade marqué comme violation de règle — sera inclus dans ton rapport de discipline.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {divider}

            {/* Section — Ratings */}
            <div>
              <SectionHeader title="⭐ Notation & Revue" open={sections.ratings} onToggle={() => toggleSection('ratings')} />
              {sections.ratings && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={lbl}>Qualité du setup</label>
                      <StarRating value={setupRating ? Number(setupRating) : undefined} onChange={v => setValue('setupRating', v)} />
                    </div>
                    <div>
                      <label className={lbl}>Qualité d&apos;exécution</label>
                      <StarRating value={executionRating ? Number(executionRating) : undefined} onChange={v => setValue('executionRating', v)} />
                    </div>
                  </div>
                  {/* Screenshots */}
                  <div>
                    <label className={lbl}>Screenshots</label>
                    <div className="space-y-2">
                      {screenshots.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {screenshots.map((url, i) => (
                            <div key={i} className="relative group">
                              <a href={url} target="_blank" rel="noopener noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt={`Screenshot ${i + 1}`} className="h-20 w-28 object-cover rounded-lg border border-surface-500 hover:border-brand-500 transition-all" />
                              </a>
                              <button
                                type="button"
                                onClick={() => removeScreenshot(url)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <label className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-surface-400 text-slate-400 hover:text-white hover:border-brand-500 cursor-pointer transition-all text-xs w-fit', uploadingScreenshot && 'opacity-50 cursor-not-allowed')}>
                        {uploadingScreenshot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                        {uploadingScreenshot ? 'Uploading...' : 'Add screenshot'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleScreenshotUpload} disabled={uploadingScreenshot} />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Submit ───────────────────────────────────────────────────────────── */}
        {divider}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <select {...register('status')} className="px-2 py-1.5 bg-surface-700 border border-surface-500 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-brand-500">
              <option value="closed">Fermé</option>
              <option value="open">Ouvert</option>
              <option value="partial">Partiel</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
            <Button type="submit" variant="primary" size="sm" loading={isSubmitting}>
              {trade ? 'Mettre à jour' : 'Enregistrer le trade'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
