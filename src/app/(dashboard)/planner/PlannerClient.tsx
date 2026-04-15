'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { format, addDays, subDays, parseISO } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { ChevronLeft, ChevronRight, Plus, Trash2, CheckCheck, TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react'
import { useTradeStore } from '@/lib/stores/tradeStore'
import { formatPnl, formatCurrency, formatR } from '@/lib/utils/formatters'
import { Badge } from '@/components/ui/Badge'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CheckItem { id: string; label: string; checked: boolean }
interface TradeIdea { id: string; symbol: string; direction: 'long' | 'short'; notes: string; traded: boolean }
interface DailyGoal { id: string; text: string; done: boolean }
type Bias = 'bullish' | 'bearish' | 'neutral' | 'uncertain'

interface PlannerData {
  preMarket: CheckItem[]
  postMarket: CheckItem[]
  tradeIdeas: TradeIdea[]
  goals: DailyGoal[]
  bias: Bias
  biasReason: string
}

// ─── Defaults (FR) ────────────────────────────────────────────────────────────

const DEFAULT_PRE: Omit<CheckItem, 'checked'>[] = [
  { id: 'pre1', label: 'Vérifier le calendrier économique (événements majeurs)' },
  { id: 'pre2', label: 'Analyser l\'action des prix overnight et les gaps' },
  { id: 'pre3', label: 'Tracer les niveaux S/R clés du jour' },
  { id: 'pre4', label: 'Définir le risque maximum pour la journée ($)' },
  { id: 'pre5', label: 'Passer en revue les positions ouvertes existantes' },
  { id: 'pre6', label: 'Placer des alertes sur les niveaux importants' },
]

const DEFAULT_POST: Omit<CheckItem, 'checked'>[] = [
  { id: 'post1', label: 'Fermer toutes les positions (ou confirmer les overnight)' },
  { id: 'post2', label: 'Revoir chaque trade pris aujourd\'hui' },
  { id: 'post3', label: 'Journaliser les émotions et le score de discipline' },
  { id: 'post4', label: 'Mettre à jour le journal de trading' },
  { id: 'post5', label: 'Identifier les erreurs et les leçons apprises' },
  { id: 'post6', label: 'Préparer la watchlist pour demain' },
]

function makeDefault(): PlannerData {
  return {
    preMarket: DEFAULT_PRE.map(i => ({ ...i, checked: false })),
    postMarket: DEFAULT_POST.map(i => ({ ...i, checked: false })),
    tradeIdeas: [],
    goals: [],
    bias: 'neutral',
    biasReason: '',
  }
}

// ─── Storage helpers ───────────────────────────────────────────────────────────

function storageKey(date: Date) {
  return `planner_${format(date, 'yyyy-MM-dd')}`
}

function loadData(date: Date): PlannerData {
  if (typeof window === 'undefined') return makeDefault()
  try {
    const raw = localStorage.getItem(storageKey(date))
    if (!raw) return makeDefault()
    return JSON.parse(raw) as PlannerData
  } catch {
    return makeDefault()
  }
}

function saveData(date: Date, data: PlannerData) {
  if (typeof window === 'undefined') return
  localStorage.setItem(storageKey(date), JSON.stringify(data))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <span
        onClick={onChange}
        className={cn(
          'mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
          checked ? 'bg-emerald-500 border-emerald-500' : 'border-surface-500 group-hover:border-emerald-400'
        )}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={cn('text-sm leading-5', checked ? 'line-through text-slate-500' : 'text-slate-300')}>
        {label}
      </span>
    </label>
  )
}

function SectionCard({ title, icon, children, progress }: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  progress?: { done: number; total: number }
}) {
  return (
    <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-brand-400">{icon}</span>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        {progress && (
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', progress.done === progress.total && progress.total > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-700 text-slate-400')}>
            {progress.done}/{progress.total}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function PlannerClient() {
  const { trades } = useTradeStore()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [data, setData] = useState<PlannerData>(makeDefault)

  useEffect(() => {
    setData(loadData(selectedDate))
  }, [selectedDate])

  const update = useCallback((updater: (prev: PlannerData) => PlannerData) => {
    setData(prev => {
      const next = updater(prev)
      saveData(selectedDate, next)
      return next
    })
  }, [selectedDate])

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  const dateKey = format(selectedDate, 'yyyy-MM-dd')

  // ── Real trades for selected day ───────────────────────────────────────────
  const dayTrades = useMemo(() => {
    return trades.filter(t => {
      const d = t.exitDate ?? t.entryDate
      if (!d) return false
      try { return format(parseISO(d), 'yyyy-MM-dd') === dateKey } catch { return false }
    })
  }, [trades, dateKey])

  const dayPnl = dayTrades.filter(t => t.status === 'closed').reduce((s, t) => s + (t.netPnl ?? 0), 0)
  const dayWins = dayTrades.filter(t => (t.netPnl ?? 0) > 0).length
  const dayTotal = dayTrades.filter(t => t.status === 'closed').length

  // ── Checklist handlers ──────────────────────────────────────────────────────
  const togglePre = (id: string) => update(d => ({
    ...d, preMarket: d.preMarket.map(i => i.id === id ? { ...i, checked: !i.checked } : i)
  }))
  const togglePost = (id: string) => update(d => ({
    ...d, postMarket: d.postMarket.map(i => i.id === id ? { ...i, checked: !i.checked } : i)
  }))

  // ── Trade ideas ─────────────────────────────────────────────────────────────
  const [newSymbol, setNewSymbol] = useState('')
  const [newDirection, setNewDirection] = useState<'long' | 'short'>('long')
  const [newNotes, setNewNotes] = useState('')

  const addIdea = () => {
    if (!newSymbol.trim()) return
    const idea: TradeIdea = {
      id: crypto.randomUUID(),
      symbol: newSymbol.trim().toUpperCase(),
      direction: newDirection,
      notes: newNotes.trim(),
      traded: false,
    }
    update(d => ({ ...d, tradeIdeas: [...d.tradeIdeas, idea] }))
    setNewSymbol('')
    setNewNotes('')
  }
  const deleteIdea = (id: string) => update(d => ({ ...d, tradeIdeas: d.tradeIdeas.filter(i => i.id !== id) }))
  const toggleTraded = (id: string) => update(d => ({
    ...d, tradeIdeas: d.tradeIdeas.map(i => i.id === id ? { ...i, traded: !i.traded } : i)
  }))

  // ── Daily goals ─────────────────────────────────────────────────────────────
  const [newGoal, setNewGoal] = useState('')
  const addGoal = () => {
    if (!newGoal.trim()) return
    update(d => ({ ...d, goals: [...d.goals, { id: crypto.randomUUID(), text: newGoal.trim(), done: false }] }))
    setNewGoal('')
  }
  const toggleGoal = (id: string) => update(d => ({ ...d, goals: d.goals.map(g => g.id === id ? { ...g, done: !g.done } : g) }))
  const deleteGoal = (id: string) => update(d => ({ ...d, goals: d.goals.filter(g => g.id !== id) }))

  // ── Bias ────────────────────────────────────────────────────────────────────
  const setBias = (bias: Bias) => update(d => ({ ...d, bias }))
  const setBiasReason = (biasReason: string) => update(d => ({ ...d, biasReason }))

  const biasOptions: { value: Bias; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'bullish',   label: 'Haussier',  icon: <TrendingUp size={14} />,    color: 'emerald' },
    { value: 'bearish',   label: 'Baissier',  icon: <TrendingDown size={14} />,  color: 'red' },
    { value: 'neutral',   label: 'Neutre',    icon: <Minus size={14} />,         color: 'slate' },
    { value: 'uncertain', label: 'Incertain', icon: <HelpCircle size={14} />,    color: 'amber' },
  ]

  const biasColorMap: Record<Bias, string> = {
    bullish:   'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    bearish:   'bg-red-500/20 text-red-400 border-red-500/40',
    neutral:   'bg-slate-500/20 text-slate-400 border-slate-500/40',
    uncertain: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Planificateur journalier</h2>
          <p className="text-sm text-slate-500 mt-0.5">Prépare ta journée et révise tes performances</p>
        </div>

        {/* Date selector */}
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedDate(d => subDays(d, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-800 border border-surface-500 text-slate-400 hover:text-white hover:border-surface-400 transition-all">
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-2 bg-surface-800 border border-surface-500 rounded-xl px-4 py-2 min-w-[170px] justify-center">
            <span className="text-sm font-medium text-white capitalize">{format(selectedDate, 'EEE d MMM yyyy')}</span>
          </div>
          <button onClick={() => setSelectedDate(d => addDays(d, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-800 border border-surface-500 text-slate-400 hover:text-white hover:border-surface-400 transition-all">
            <ChevronRight size={16} />
          </button>
          {!isToday && (
            <button onClick={() => setSelectedDate(new Date())} className="px-3 py-2 text-xs font-medium rounded-lg bg-brand-600/20 text-brand-300 border border-brand-600/30 hover:bg-brand-600/30 transition-all">
              Aujourd&apos;hui
            </button>
          )}
        </div>
      </div>

      {/* Real performance banner */}
      {dayTotal > 0 && (
        <div className={cn(
          'rounded-2xl border p-4 flex items-center justify-between',
          dayPnl >= 0 ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-red-500/8 border-red-500/20'
        )}>
          <div className="flex items-center gap-4">
            {dayPnl >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Performance réelle · {dateKey}</div>
              <div className={cn('text-2xl font-bold font-mono', dayPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {formatPnl(dayPnl)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-white">{dayTotal} trade{dayTotal > 1 ? 's' : ''}</div>
            <div className="text-xs text-slate-400">{dayTotal > 0 ? `${dayWins}W / ${dayTotal - dayWins}L` : ''}</div>
          </div>
        </div>
      )}

      {/* Real trades list for the day */}
      {dayTrades.length > 0 && (
        <div className="bg-surface-800 border border-surface-500 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-500">
            <h3 className="text-sm font-semibold text-white">Trades de la journée</h3>
          </div>
          <div className="divide-y divide-surface-600">
            {dayTrades.map(t => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <Badge variant={t.direction === 'long' ? 'long' : 'short'}>{t.direction.toUpperCase()}</Badge>
                  <span className="text-sm font-semibold text-white">{t.symbol}</span>
                  {t.setupGrade && <span className="text-[11px] font-black text-brand-400">{t.setupGrade}</span>}
                  {t.status === 'open' && <Badge variant="open">OUVERT</Badge>}
                </div>
                <div className="flex items-center gap-4">
                  {t.rMultiple !== undefined && (
                    <span className={cn('text-xs font-mono', t.rMultiple >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {formatR(t.rMultiple)}
                    </span>
                  )}
                  <span className={cn('text-sm font-bold font-mono', (t.netPnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {t.netPnl !== undefined ? formatPnl(t.netPnl) : formatCurrency(t.entryPrice)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Pre-Market Checklist */}
        <SectionCard title="Checklist pré-marché" icon={<CheckCheck size={16} />} progress={{ done: data.preMarket.filter(i => i.checked).length, total: data.preMarket.length }}>
          <div className="space-y-3">
            {data.preMarket.map(item => (
              <Checkbox key={item.id} checked={item.checked} onChange={() => togglePre(item.id)} label={item.label} />
            ))}
          </div>
        </SectionCard>

        {/* Post-Market Checklist */}
        <SectionCard title="Checklist post-marché" icon={<CheckCheck size={16} />} progress={{ done: data.postMarket.filter(i => i.checked).length, total: data.postMarket.length }}>
          <div className="space-y-3">
            {data.postMarket.map(item => (
              <Checkbox key={item.id} checked={item.checked} onChange={() => togglePost(item.id)} label={item.label} />
            ))}
          </div>
        </SectionCard>

        {/* Trade Ideas / Watchlist */}
        <SectionCard title="Idées de trades / Watchlist" icon={<TrendingUp size={16} />}>
          <div className="bg-surface-700 rounded-xl p-3 space-y-2">
            <div className="flex gap-2">
              <input
                value={newSymbol}
                onChange={e => setNewSymbol(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addIdea()}
                placeholder="Symbole"
                className="flex-1 min-w-0 bg-surface-800 border border-surface-500 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500 uppercase"
              />
              <div className="flex rounded-lg overflow-hidden border border-surface-500">
                <button onClick={() => setNewDirection('long')} className={cn('px-3 py-2 text-xs font-medium transition-all', newDirection === 'long' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-800 text-slate-500 hover:text-slate-300')}>
                  Long
                </button>
                <button onClick={() => setNewDirection('short')} className={cn('px-3 py-2 text-xs font-medium border-l border-surface-500 transition-all', newDirection === 'short' ? 'bg-red-500/20 text-red-400' : 'bg-surface-800 text-slate-500 hover:text-slate-300')}>
                  Short
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addIdea()}
                placeholder="Notes (optionnel)"
                className="flex-1 bg-surface-800 border border-surface-500 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
              />
              <button onClick={addIdea} className="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-colors flex-shrink-0">
                <Plus size={16} />
              </button>
            </div>
          </div>

          {data.tradeIdeas.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-2">Aucune idée pour l&apos;instant</p>
          ) : (
            <div className="space-y-2">
              {data.tradeIdeas.map(idea => (
                <div key={idea.id} className={cn('flex items-start gap-3 bg-surface-700 rounded-xl px-3 py-2.5', idea.traded && 'opacity-60')}>
                  <button onClick={() => toggleTraded(idea.id)} className={cn('mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all', idea.traded ? 'bg-emerald-500 border-emerald-500' : 'border-surface-500 hover:border-emerald-400')}>
                    {idea.traded && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{idea.symbol}</span>
                      <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', idea.direction === 'long' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                        {idea.direction === 'long' ? 'Long' : 'Short'}
                      </span>
                    </div>
                    {idea.notes && <p className="text-xs text-slate-500 mt-0.5 truncate">{idea.notes}</p>}
                  </div>
                  <button onClick={() => deleteIdea(idea.id)} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Daily Goals */}
        <SectionCard title="Objectifs du jour" icon={<Plus size={16} />} progress={{ done: data.goals.filter(g => g.done).length, total: data.goals.length }}>
          <div className="flex gap-2">
            <input
              value={newGoal}
              onChange={e => setNewGoal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addGoal()}
              placeholder="Ajouter un objectif pour aujourd'hui…"
              className="flex-1 bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
            />
            <button onClick={addGoal} className="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-colors flex-shrink-0">
              <Plus size={16} />
            </button>
          </div>

          {data.goals.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-2">Aucun objectif — ajoutes-en un ci-dessus</p>
          ) : (
            <div className="space-y-2">
              {data.goals.map(goal => (
                <div key={goal.id} className="flex items-center gap-3 bg-surface-700 rounded-xl px-3 py-2.5">
                  <button onClick={() => toggleGoal(goal.id)} className={cn('flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all', goal.done ? 'bg-emerald-500 border-emerald-500' : 'border-surface-500 hover:border-emerald-400')}>
                    {goal.done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </button>
                  <span className={cn('text-sm flex-1', goal.done ? 'line-through text-slate-500' : 'text-slate-300')}>{goal.text}</span>
                  <button onClick={() => deleteGoal(goal.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Market Bias — full width */}
        <div className="lg:col-span-2">
          <SectionCard title="Biais de marché" icon={<TrendingUp size={16} />}>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {biasOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setBias(opt.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                      data.bias === opt.value ? biasColorMap[opt.value] : 'bg-surface-700 border-surface-500 text-slate-400 hover:text-slate-200 hover:border-surface-400'
                    )}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
              <textarea
                value={data.biasReason}
                onChange={e => setBiasReason(e.target.value)}
                placeholder="Explique ton raisonnement pour le biais de marché d'aujourd'hui…"
                rows={3}
                className="w-full bg-surface-700 border border-surface-500 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500 resize-none"
              />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
