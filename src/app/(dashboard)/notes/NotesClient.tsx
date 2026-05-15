'use client'
import { useState, useMemo, useEffect } from 'react'
import {
  format, subDays, addDays, parseISO, isToday,
  startOfWeek, endOfWeek, eachDayOfInterval,
} from 'date-fns'
import { useTradeStore } from '@/lib/stores/tradeStore'
import { useReviews } from '@/lib/hooks/useReviews'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatPnl, formatR } from '@/lib/utils/formatters'
import { Trade, Review, EmotionalState } from '@/lib/types'
import {
  Save, BookOpen, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import toast from 'react-hot-toast'

type ViewMode = 'daily' | 'weekly'

const EMOTIONS: { value: EmotionalState; label: string; icon: string }[] = [
  { value: 'excellent', label: 'Excellent', icon: '😄' },
  { value: 'good',      label: 'Bien',      icon: '🙂' },
  { value: 'neutral',   label: 'Neutre',    icon: '😐' },
  { value: 'stressed',  label: 'Stressé',   icon: '😰' },
  { value: 'anxious',   label: 'Anxieux',   icon: '😟' },
  { value: 'fear',      label: 'Peur',      icon: '😱' },
  { value: 'greed',     label: 'Avidité',   icon: '🤑' },
]

// ─── Stats helpers ─────────────────────────────────────────────────────────────

function dayStats(trades: Trade[], dateStr: string) {
  const list = trades.filter(t => {
    const d = t.exitDate ?? t.entryDate
    return d?.startsWith(dateStr) && t.status === 'closed'
  })
  const pnl = list.reduce((s, t) => s + (t.netPnl ?? 0), 0)
  const wins = list.filter(t => t.outcome === 'win').length
  const winRate = list.length > 0 ? (wins / list.length) * 100 : 0
  const avgR = list.length > 0
    ? list.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / list.length
    : 0
  return { list, pnl, winRate, avgR, count: list.length }
}

function weekStats(trades: Trade[], weekStart: Date) {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const list = trades.filter(t => {
    const d = t.exitDate ?? t.entryDate
    if (!d || t.status !== 'closed') return false
    const dt = parseISO(d)
    return dt >= weekStart && dt <= weekEnd
  })
  const pnl = list.reduce((s, t) => s + (t.netPnl ?? 0), 0)
  const wins = list.filter(t => t.outcome === 'win').length
  const winRate = list.length > 0 ? (wins / list.length) * 100 : 0
  const avgR = list.length > 0
    ? list.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / list.length
    : 0
  return { list, pnl, winRate, avgR, count: list.length }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function JournalBlock({
  icon, title, value, onChange, placeholder, rows = 3,
}: {
  icon: string
  title: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  rows?: number
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div className={cn(
      'rounded-xl border transition-all',
      focused ? 'border-brand-500/40 bg-surface-700/60' : 'border-surface-500/50 bg-surface-800/50',
    )}>
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-1">
        <span className="text-base leading-none">{icon}</span>
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{title}</span>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 pb-3.5 pt-1.5 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none resize-none leading-relaxed"
      />
    </div>
  )
}

function StatCard({
  label, value, color,
}: { label: string; value: string; color: string }) {
  return (
    <div className="bg-surface-800 border border-surface-500/70 rounded-xl p-3.5 text-center">
      <div className={cn('text-xl font-bold font-mono leading-tight', color)}>{value}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function NotesClient() {
  const { trades } = useTradeStore()
  const { reviews, saveReview } = useReviews()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('daily')
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [emotion, setEmotion]           = useState<EmotionalState | undefined>()
  const [discipline, setDiscipline]     = useState<number | undefined>()
  const [marketNotes, setMarketNotes]   = useState('')
  const [wins, setWins]                 = useState('')
  const [improvements, setImprovements] = useState('')
  const [freeNotes, setFreeNotes]       = useState('')

  const selectedKey = format(selectedDate, 'yyyy-MM-dd')
  const wStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate])

  // Find existing review
  const existingReview = useMemo(() => {
    if (viewMode === 'daily')
      return reviews.find(r => r.date === selectedKey && r.type === 'daily')
    return reviews.find(r => r.date === format(wStart, 'yyyy-MM-dd') && r.type === 'weekly')
  }, [reviews, selectedKey, viewMode, wStart])

  // Populate form when review/date changes
  useEffect(() => {
    if (existingReview) {
      setEmotion(existingReview.emotionalState)
      setDiscipline(existingReview.disciplineScore)
      setMarketNotes(existingReview.losses ?? '')
      setWins(existingReview.wins ?? '')
      setImprovements(existingReview.improvements ?? '')
      setFreeNotes(existingReview.notes ?? '')
    } else {
      setEmotion(undefined)
      setDiscipline(undefined)
      setMarketNotes('')
      setWins('')
      setImprovements('')
      setFreeNotes('')
    }
  }, [existingReview])

  // Stats
  const dStats = useMemo(() => dayStats(trades, selectedKey), [trades, selectedKey])
  const wStats = useMemo(() => weekStats(trades, wStart), [trades, wStart])
  const stats = viewMode === 'daily' ? dStats : wStats

  // Sidebar date list: last 60 days
  const dateList = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 60 }, (_, i) => {
      const d = subDays(now, i)
      const key = format(d, 'yyyy-MM-dd')
      const s = dayStats(trades, key)
      const hasReview = reviews.some(r => r.date === key)
      return { date: d, key, s, hasReview }
    })
  }, [trades, reviews])

  // Week days for weekly view
  const weekDays = useMemo(() =>
    eachDayOfInterval({ start: wStart, end: endOfWeek(wStart, { weekStartsOn: 1 }) }),
    [wStart])

  const emotionInfo = emotion ? EMOTIONS.find(e => e.value === emotion) : null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const date = viewMode === 'daily' ? selectedKey : format(wStart, 'yyyy-MM-dd')
      const type  = viewMode === 'daily' ? 'daily' : 'weekly'
      await saveReview({
        type,
        date,
        emotionalState: emotion,
        disciplineScore: discipline,
        losses: marketNotes || undefined,
        wins: wins || undefined,
        improvements: improvements || undefined,
        notes: freeNotes || undefined,
        habits: existingReview?.habits ?? [],
        tradeCount: stats.count,
        dayPnl: stats.pnl,
      })
      toast.success('Note sauvegardée ✓')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }

  const navigate = (dir: -1 | 1) =>
    setSelectedDate(d => (viewMode === 'daily' ? addDays : (d: Date) => addDays(d, dir * 7))(d, dir))

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-4 items-start">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-52 shrink-0 flex flex-col border border-surface-500 bg-surface-800/60 rounded-2xl overflow-hidden max-h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-surface-600 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-400" />
            <span className="text-sm font-semibold text-white">Notes</span>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex p-2 gap-1 border-b border-surface-600 shrink-0">
          {(['daily', 'weekly'] as ViewMode[]).map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all',
                viewMode === m
                  ? 'bg-brand-600/20 text-brand-300'
                  : 'text-slate-500 hover:text-slate-300',
              )}
            >
              {m === 'daily' ? 'Jour' : 'Semaine'}
            </button>
          ))}
        </div>

        {/* Today */}
        <button
          onClick={() => setSelectedDate(new Date())}
          className="mx-3 mt-2.5 mb-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-brand-300 bg-brand-600/10 hover:bg-brand-600/20 transition-all text-left shrink-0"
        >
          Aujourd'hui
        </button>

        {/* Date list */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-2 min-h-0">
          {dateList.map(({ date, key, s, hasReview }) => {
            const active = key === selectedKey
            return (
              <button
                key={key}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all mb-0.5 group',
                  active
                    ? 'bg-brand-600/15 text-white'
                    : 'text-slate-400 hover:bg-surface-700/70 hover:text-slate-200',
                )}
              >
                <div>
                  <div className={cn(
                    'text-xs font-medium',
                    isToday(date) && !active ? 'text-brand-300' : '',
                  )}>
                    {format(date, 'EEE d MMM')}
                  </div>
                  {s.count > 0 && (
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {s.count} trade{s.count > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {s.count > 0 && (
                    <span className={cn(
                      'text-[10px] font-mono font-bold',
                      s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400',
                    )}>
                      {s.pnl >= 0 ? '+' : ''}{formatCurrency(s.pnl, 'USD', true)}
                    </span>
                  )}
                  {hasReview && (
                    <div className="w-1.5 h-1.5 bg-brand-500 rounded-full" title="Revue existante" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Journal content ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4 pb-10">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              {emotionInfo && (
                <span className="text-2xl leading-none">{emotionInfo.icon}</span>
              )}
              <h1 className="text-xl font-bold text-white leading-tight">
                {viewMode === 'daily'
                  ? format(selectedDate, 'EEEE d MMMM yyyy')
                  : `Semaine du ${format(wStart, 'd MMM')} au ${format(endOfWeek(wStart, { weekStartsOn: 1 }), 'd MMM yyyy')}`}
              </h1>
            </div>
            {existingReview && (
              <div className="text-xs text-slate-600 mt-1">
                Modifié le {format(parseISO(existingReview.updatedAt), 'd MMM à HH:mm')}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-surface-700 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-surface-700 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="P&L Net"
            value={stats.count > 0 ? formatPnl(stats.pnl) : '—'}
            color={stats.pnl > 0 ? 'text-emerald-400' : stats.pnl < 0 ? 'text-red-400' : 'text-slate-400'}
          />
          <StatCard
            label="Trades"
            value={String(stats.count || '—')}
            color="text-white"
          />
          <StatCard
            label="Win Rate"
            value={stats.count > 0 ? `${stats.winRate.toFixed(0)}%` : '—'}
            color={stats.winRate >= 50 ? 'text-emerald-400' : stats.count > 0 ? 'text-red-400' : 'text-slate-400'}
          />
          <StatCard
            label="Avg R"
            value={stats.count > 0 ? formatR(stats.avgR) : '—'}
            color={stats.avgR > 0 ? 'text-emerald-400' : stats.avgR < 0 ? 'text-red-400' : 'text-slate-400'}
          />
        </div>

        {/* Weekly day breakdown */}
        {viewMode === 'weekly' && (
          <div className="bg-surface-800 border border-surface-500/70 rounded-xl p-4">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Détail par journée
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map(d => {
                const key = format(d, 'yyyy-MM-dd')
                const s = dayStats(trades, key)
                return (
                  <button
                    key={key}
                    onClick={() => { setSelectedDate(d); setViewMode('daily') }}
                    className={cn(
                      'flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-lg transition-all hover:bg-surface-700',
                      isToday(d) ? 'bg-brand-600/10 border border-brand-500/20' : '',
                    )}
                  >
                    <div className="text-[10px] text-slate-500 uppercase">{format(d, 'EEE')}</div>
                    <div className="text-xs font-bold text-slate-300">{format(d, 'd')}</div>
                    {s.count > 0 ? (
                      <>
                        <div className={cn(
                          'text-[10px] font-mono font-bold mt-0.5',
                          s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400',
                        )}>
                          {s.pnl >= 0 ? '+' : ''}{formatCurrency(s.pnl, 'USD', true)}
                        </div>
                        <div className="text-[9px] text-slate-600">{s.count}T</div>
                      </>
                    ) : (
                      <div className="text-[9px] text-slate-700 mt-0.5">—</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Emotion + discipline */}
        <div className="bg-surface-800 border border-surface-500/70 rounded-xl p-4 space-y-4">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">
              État émotionnel
            </div>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map(e => (
                <button
                  key={e.value}
                  onClick={() => setEmotion(prev => prev === e.value ? undefined : e.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    emotion === e.value
                      ? 'bg-brand-600/25 border-brand-500/50 text-white shadow-glow-purple/10'
                      : 'bg-surface-700/60 border-surface-600 text-slate-400 hover:border-surface-400 hover:text-slate-200',
                  )}
                >
                  <span className="text-sm">{e.icon}</span>
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">
              Score de discipline (1 – 10)
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setDiscipline(prev => prev === n ? undefined : n)}
                  className={cn(
                    'w-9 h-9 rounded-lg text-xs font-bold border transition-all',
                    discipline === n
                      ? n >= 7
                        ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300'
                        : n >= 4
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-red-500/20 border-red-500/30 text-red-300'
                      : 'bg-surface-700/60 border-surface-600 text-slate-500 hover:border-surface-400 hover:text-slate-300',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Journal blocks */}
        <JournalBlock
          icon="📊"
          title="Conditions de marché"
          value={marketNotes}
          onChange={setMarketNotes}
          placeholder="Tendance générale, volatilité, news importantes, niveau clés à surveiller..."
        />
        <JournalBlock
          icon="✅"
          title="Ce qui a bien fonctionné"
          value={wins}
          onChange={setWins}
          placeholder="Setups bien exécutés, décisions solides, règles respectées..."
        />
        <JournalBlock
          icon="🔧"
          title="À améliorer"
          value={improvements}
          onChange={setImprovements}
          placeholder="Erreurs d'exécution, sorties prématurées, règles non respectées..."
        />
        <JournalBlock
          icon="📝"
          title="Notes libres"
          value={freeNotes}
          onChange={setFreeNotes}
          placeholder="Idées, observations, réflexions sur le marché ou sur toi-même..."
          rows={4}
        />

        {/* Trades list */}
        {stats.list.length > 0 && (
          <div className="bg-surface-800 border border-surface-500/70 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Trades ({stats.list.length})
              </div>
              <div className={cn(
                'text-sm font-bold font-mono',
                stats.pnl >= 0 ? 'text-emerald-400' : 'text-red-400',
              )}>
                {formatPnl(stats.pnl)}
              </div>
            </div>
            <div className="space-y-1.5">
              {stats.list.map(t => {
                const pnl = t.netPnl ?? 0
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between bg-surface-700/50 rounded-lg px-3 py-2.5 gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0',
                        t.direction === 'long'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-red-500/15 text-red-400',
                      )}>
                        {t.direction.toUpperCase()}
                      </span>
                      <span className="text-sm font-semibold text-white truncate">{t.symbol}</span>
                      {t.setupGrade && (
                        <span className="text-[10px] font-black text-brand-400 shrink-0">{t.setupGrade}</span>
                      )}
                      {t.strategy && (
                        <span className="text-[10px] text-slate-500 truncate hidden sm:block">{t.strategy}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {t.rMultiple !== undefined && (
                        <span className={cn(
                          'text-xs font-mono',
                          t.rMultiple >= 0 ? 'text-emerald-400' : 'text-red-400',
                        )}>
                          {formatR(t.rMultiple)}
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        {pnl > 0
                          ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                          : pnl < 0
                            ? <TrendingDown className="w-3 h-3 text-red-500" />
                            : <Minus className="w-3 h-3 text-slate-500" />
                        }
                        <span className={cn(
                          'text-sm font-bold font-mono',
                          pnl >= 0 ? 'text-emerald-400' : 'text-red-400',
                        )}>
                          {formatPnl(pnl)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end">
          <Button
            variant="primary"
            icon={Save}
            onClick={handleSave}
            loading={isSaving}
          >
            {existingReview ? 'Mettre à jour' : 'Sauvegarder la note'}
          </Button>
        </div>
      </div>
    </div>
  )
}
