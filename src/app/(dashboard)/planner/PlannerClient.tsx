'use client'
import { useState, useEffect, useCallback } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { ChevronLeft, ChevronRight, Plus, Trash2, CheckCheck, TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react'

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

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PRE: Omit<CheckItem, 'checked'>[] = [
  { id: 'pre1', label: 'Check economic calendar for high-impact events' },
  { id: 'pre2', label: 'Review overnight price action and gaps' },
  { id: 'pre3', label: 'Mark key support/resistance levels' },
  { id: 'pre4', label: 'Define max risk for the day ($)' },
  { id: 'pre5', label: 'Review existing open positions' },
  { id: 'pre6', label: 'Set alerts on key levels' },
]

const DEFAULT_POST: Omit<CheckItem, 'checked'>[] = [
  { id: 'post1', label: 'Close all positions (or confirm overnight holds)' },
  { id: 'post2', label: 'Review each trade taken today' },
  { id: 'post3', label: 'Log emotions and discipline score' },
  { id: 'post4', label: 'Update trading journal' },
  { id: 'post5', label: 'Identify mistakes and lessons learned' },
  { id: 'post6', label: 'Set watchlist for tomorrow' },
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
          checked
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-surface-500 group-hover:border-emerald-400'
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [data, setData] = useState<PlannerData>(makeDefault)

  // Load data when date changes
  useEffect(() => {
    setData(loadData(selectedDate))
  }, [selectedDate])

  // Save data whenever it changes
  const update = useCallback((updater: (prev: PlannerData) => PlannerData) => {
    setData(prev => {
      const next = updater(prev)
      saveData(selectedDate, next)
      return next
    })
  }, [selectedDate])

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  // ── Checklist handlers ────────────────────────────────────────────────────
  const togglePre = (id: string) => update(d => ({
    ...d, preMarket: d.preMarket.map(i => i.id === id ? { ...i, checked: !i.checked } : i)
  }))
  const togglePost = (id: string) => update(d => ({
    ...d, postMarket: d.postMarket.map(i => i.id === id ? { ...i, checked: !i.checked } : i)
  }))

  // ── Trade ideas ───────────────────────────────────────────────────────────
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

  // ── Daily goals ───────────────────────────────────────────────────────────
  const [newGoal, setNewGoal] = useState('')

  const addGoal = () => {
    if (!newGoal.trim()) return
    const goal: DailyGoal = { id: crypto.randomUUID(), text: newGoal.trim(), done: false }
    update(d => ({ ...d, goals: [...d.goals, goal] }))
    setNewGoal('')
  }
  const toggleGoal = (id: string) => update(d => ({
    ...d, goals: d.goals.map(g => g.id === id ? { ...g, done: !g.done } : g)
  }))
  const deleteGoal = (id: string) => update(d => ({ ...d, goals: d.goals.filter(g => g.id !== id) }))

  // ── Bias ──────────────────────────────────────────────────────────────────
  const setBias = (bias: Bias) => update(d => ({ ...d, bias }))
  const setBiasReason = (biasReason: string) => update(d => ({ ...d, biasReason }))

  const biasOptions: { value: Bias; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'bullish', label: 'Bullish', icon: <TrendingUp size={14} />, color: 'emerald' },
    { value: 'bearish', label: 'Bearish', icon: <TrendingDown size={14} />, color: 'red' },
    { value: 'neutral', label: 'Neutral', icon: <Minus size={14} />, color: 'slate' },
    { value: 'uncertain', label: 'Uncertain', icon: <HelpCircle size={14} />, color: 'amber' },
  ]

  const biasColorMap: Record<Bias, string> = {
    bullish: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    bearish: 'bg-red-500/20 text-red-400 border-red-500/40',
    neutral: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
    uncertain: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Daily Planner</h2>
          <p className="text-sm text-slate-500 mt-0.5">Plan your trading day and review performance</p>
        </div>

        {/* Date selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(d => subDays(d, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-800 border border-surface-500 text-slate-400 hover:text-white hover:border-surface-400 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-2 bg-surface-800 border border-surface-500 rounded-xl px-4 py-2 min-w-[160px] justify-center">
            <span className="text-sm font-medium text-white">{format(selectedDate, 'EEE, MMM d, yyyy')}</span>
          </div>
          <button
            onClick={() => setSelectedDate(d => addDays(d, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-800 border border-surface-500 text-slate-400 hover:text-white hover:border-surface-400 transition-all"
          >
            <ChevronRight size={16} />
          </button>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-brand-600/20 text-brand-300 border border-brand-600/30 hover:bg-brand-600/30 transition-all"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Pre-Market Checklist */}
        <SectionCard
          title="Pre-Market Checklist"
          icon={<CheckCheck size={16} />}
          progress={{ done: data.preMarket.filter(i => i.checked).length, total: data.preMarket.length }}
        >
          <div className="space-y-3">
            {data.preMarket.map(item => (
              <Checkbox key={item.id} checked={item.checked} onChange={() => togglePre(item.id)} label={item.label} />
            ))}
          </div>
        </SectionCard>

        {/* Post-Market Checklist */}
        <SectionCard
          title="Post-Market Checklist"
          icon={<CheckCheck size={16} />}
          progress={{ done: data.postMarket.filter(i => i.checked).length, total: data.postMarket.length }}
        >
          <div className="space-y-3">
            {data.postMarket.map(item => (
              <Checkbox key={item.id} checked={item.checked} onChange={() => togglePost(item.id)} label={item.label} />
            ))}
          </div>
        </SectionCard>

        {/* Trade Ideas / Watchlist */}
        <SectionCard title="Trade Ideas / Watchlist" icon={<TrendingUp size={16} />}>
          {/* Add form */}
          <div className="bg-surface-700 rounded-xl p-3 space-y-2">
            <div className="flex gap-2">
              <input
                value={newSymbol}
                onChange={e => setNewSymbol(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addIdea()}
                placeholder="Symbol"
                className="flex-1 min-w-0 bg-surface-800 border border-surface-500 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500 transition-colors uppercase"
              />
              <div className="flex rounded-lg overflow-hidden border border-surface-500">
                <button
                  onClick={() => setNewDirection('long')}
                  className={cn('px-3 py-2 text-xs font-medium transition-all', newDirection === 'long' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-800 text-slate-500 hover:text-slate-300')}
                >
                  Long
                </button>
                <button
                  onClick={() => setNewDirection('short')}
                  className={cn('px-3 py-2 text-xs font-medium transition-all border-l border-surface-500', newDirection === 'short' ? 'bg-red-500/20 text-red-400' : 'bg-surface-800 text-slate-500 hover:text-slate-300')}
                >
                  Short
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addIdea()}
                placeholder="Notes (optional)"
                className="flex-1 bg-surface-800 border border-surface-500 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
              <button
                onClick={addIdea}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-colors flex-shrink-0"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Ideas list */}
          {data.tradeIdeas.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-2">No trade ideas yet</p>
          ) : (
            <div className="space-y-2">
              {data.tradeIdeas.map(idea => (
                <div key={idea.id} className={cn('flex items-start gap-3 bg-surface-700 rounded-xl px-3 py-2.5', idea.traded && 'opacity-60')}>
                  <button
                    onClick={() => toggleTraded(idea.id)}
                    title={idea.traded ? 'Mark as not traded' : 'Mark as traded'}
                    className={cn('mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all', idea.traded ? 'bg-emerald-500 border-emerald-500' : 'border-surface-500 hover:border-emerald-400')}
                  >
                    {idea.traded && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{idea.symbol}</span>
                      <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', idea.direction === 'long' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                        {idea.direction}
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
        <SectionCard
          title="Daily Goals"
          icon={<Plus size={16} />}
          progress={{ done: data.goals.filter(g => g.done).length, total: data.goals.length }}
        >
          {/* Add goal */}
          <div className="flex gap-2">
            <input
              value={newGoal}
              onChange={e => setNewGoal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addGoal()}
              placeholder="Add a goal for today…"
              className="flex-1 bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
            />
            <button
              onClick={addGoal}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-colors flex-shrink-0"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Goals list */}
          {data.goals.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-2">No goals yet — add one above</p>
          ) : (
            <div className="space-y-2">
              {data.goals.map(goal => (
                <div key={goal.id} className="flex items-center gap-3 bg-surface-700 rounded-xl px-3 py-2.5">
                  <button
                    onClick={() => toggleGoal(goal.id)}
                    className={cn('flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all', goal.done ? 'bg-emerald-500 border-emerald-500' : 'border-surface-500 hover:border-emerald-400')}
                  >
                    {goal.done && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
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
          <SectionCard title="Market Bias" icon={<TrendingUp size={16} />}>
            <div className="space-y-4">
              {/* Bias selector */}
              <div className="flex flex-wrap gap-2">
                {biasOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setBias(opt.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                      data.bias === opt.value
                        ? biasColorMap[opt.value]
                        : 'bg-surface-700 border-surface-500 text-slate-400 hover:text-slate-200 hover:border-surface-400'
                    )}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Reasoning textarea */}
              <textarea
                value={data.biasReason}
                onChange={e => setBiasReason(e.target.value)}
                placeholder="Write your reasoning for today's market bias…"
                rows={3}
                className="w-full bg-surface-700 border border-surface-500 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
              />
            </div>
          </SectionCard>
        </div>

      </div>
    </div>
  )
}
