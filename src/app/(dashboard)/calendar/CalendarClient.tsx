'use client'
import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, subMonths, addMonths, parseISO, isSameMonth } from 'date-fns'
import { useTradeStore } from '@/lib/stores/tradeStore'
import { useReviews } from '@/lib/hooks/useReviews'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatPnl, formatR } from '@/lib/utils/formatters'
import { ChevronLeft, ChevronRight, PenLine, TrendingUp, TrendingDown } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { EmotionalState, Review, Trade } from '@/lib/types'
import toast from 'react-hot-toast'

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const emotions: { value: EmotionalState; label: string; icon: string }[] = [
  { value: 'excellent', label: 'Excellent', icon: '😄' },
  { value: 'good', label: 'Bien', icon: '🙂' },
  { value: 'neutral', label: 'Neutre', icon: '😐' },
  { value: 'stressed', label: 'Stressé', icon: '😰' },
  { value: 'anxious', label: 'Anxieux', icon: '😟' },
  { value: 'fear', label: 'Peur', icon: '😱' },
  { value: 'greed', label: 'Avidité', icon: '🤑' },
]

function pnlBg(pnl: number, maxAbs: number): string {
  if (pnl === 0 || maxAbs === 0) return ''
  const intensity = Math.min(Math.abs(pnl) / maxAbs, 1)
  if (pnl > 0) {
    if (intensity < 0.25) return 'bg-emerald-900/20'
    if (intensity < 0.5)  return 'bg-emerald-900/35'
    if (intensity < 0.75) return 'bg-emerald-900/50'
    return 'bg-emerald-900/65'
  } else {
    if (intensity < 0.25) return 'bg-red-900/20'
    if (intensity < 0.5)  return 'bg-red-900/35'
    if (intensity < 0.75) return 'bg-red-900/50'
    return 'bg-red-900/65'
  }
}

export default function CalendarClient() {
  const { trades } = useTradeStore()
  const [month, setMonth] = useState(new Date())
  const { reviews, saveReview } = useReviews(month)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)

  const { register, handleSubmit, watch, setValue, reset, formState: { isSubmitting } } = useForm<Partial<Review>>()

  const days = useMemo(() => {
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const all = eachDayOfInterval({ start, end })
    const prefix = getDay(start)
    const blanks = Array.from({ length: prefix })
    return { all, blanks }
  }, [month])

  // Build daily data map (pnl + trades list)
  const dailyData = useMemo(() => {
    const map = new Map<string, { pnl: number; tradeList: Trade[] }>()
    trades.filter(t => t.status === 'closed').forEach(t => {
      const dateStr = t.exitDate ?? t.entryDate
      if (!dateStr) return
      const key = format(parseISO(dateStr), 'yyyy-MM-dd')
      const prev = map.get(key) ?? { pnl: 0, tradeList: [] }
      map.set(key, { pnl: prev.pnl + (t.netPnl ?? 0), tradeList: [...prev.tradeList, t] })
    })
    return map
  }, [trades])

  // Max abs P&L this month for intensity normalization
  const maxAbsPnl = useMemo(() => {
    const entries = Array.from(dailyData.entries()) as [string, { pnl: number; tradeList: Trade[] }][]
    const vals = entries
      .filter(([k]) => isSameMonth(parseISO(k), month))
      .map(([, v]) => Math.abs(v.pnl))
    return vals.length > 0 ? Math.max(...vals) : 1
  }, [dailyData, month])

  const openDay = (day: Date) => {
    setSelectedDay(day)
    const key = format(day, 'yyyy-MM-dd')
    const existing = reviews.find(r => r.date === key && r.type === 'daily')
    reset(existing ?? { habits: [] })
    setShowReviewForm(!!existing)
    setModalOpen(true)
  }

  const onSubmit = async (data: Partial<Review>) => {
    if (!selectedDay) return
    try {
      await saveReview({ ...data, type: 'daily', date: format(selectedDay, 'yyyy-MM-dd'), habits: [] })
      toast.success('Revue sauvegardée')
      setModalOpen(false)
    } catch { toast.error('Échec de la sauvegarde') }
  }

  const allEntries = Array.from(dailyData.entries()) as [string, { pnl: number; tradeList: Trade[] }][]
  const thisMonthEntries = allEntries.filter(([k]) => isSameMonth(parseISO(k), month))

  const monthPnl = thisMonthEntries.reduce((s, [, v]) => s + v.pnl, 0)
  const monthTrades = thisMonthEntries.reduce((s, [, v]) => s + v.tradeList.length, 0)
  const tradingDaysThisMonth = thisMonthEntries.length
  const greenDays = thisMonthEntries.filter(([, v]) => v.pnl > 0).length

  // Selected day data
  const selectedKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null
  const selectedData = selectedKey ? dailyData.get(selectedKey) : null
  const selectedReview = selectedKey ? reviews.find(r => r.date === selectedKey && r.type === 'daily') : null

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Calendrier de trading</h2>
          <p className="text-sm text-slate-500">Revois ton trading jour après jour</p>
        </div>
        <div className={cn('text-xl font-bold font-mono', monthPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          {formatPnl(monthPnl)} <span className="text-sm font-normal text-slate-500">ce mois</span>
        </div>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between bg-surface-800 border border-surface-500 rounded-xl px-4 py-3">
        <button onClick={() => setMonth(m => subMonths(m, 1))} className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-surface-700 flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-base font-semibold text-white capitalize">{format(month, 'MMMM yyyy')}</span>
        <button onClick={() => setMonth(m => addMonths(m, 1))} className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-surface-700 flex items-center justify-center">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-surface-800 border border-surface-500 rounded-2xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-surface-500">
          {DAYS.map(d => (
            <div key={d} className="py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.blanks.map((_, i) => <div key={`b${i}`} className="border-b border-r border-surface-600 h-20 sm:h-24" />)}
          {days.all.map(day => {
            const key = format(day, 'yyyy-MM-dd')
            const data = dailyData.get(key)
            const isToday = isSameDay(day, new Date())
            const hasReview = reviews.some(r => r.date === key)
            const isWeekend = [0, 6].includes(getDay(day))
            const bg = data ? pnlBg(data.pnl, maxAbsPnl) : ''

            return (
              <button
                key={key}
                onClick={() => openDay(day)}
                className={cn(
                  'border-b border-r border-surface-600 h-20 sm:h-24 p-2 text-left hover:opacity-90 hover:brightness-110 transition-all relative',
                  isWeekend && !data && 'opacity-40',
                  isToday && !data && 'bg-brand-600/10 border-brand-500/30',
                  bg
                )}
              >
                <div className={cn('text-xs font-medium mb-1', isToday ? 'text-brand-300' : 'text-slate-400')}>
                  {format(day, 'd')}
                </div>
                {data && (
                  <>
                    <div className={cn('text-xs font-bold font-mono leading-tight', data.pnl >= 0 ? 'text-emerald-300' : 'text-red-300')}>
                      {data.pnl >= 0 ? '+' : ''}{formatCurrency(data.pnl, 'USD', true)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                      {data.tradeList.length} trade{data.tradeList.length > 1 ? 's' : ''}
                    </div>
                  </>
                )}
                {/* Indicator dots */}
                <div className="absolute bottom-1.5 right-1.5 flex gap-0.5">
                  {hasReview && <div className="w-1.5 h-1.5 bg-brand-500 rounded-full" title="Revue écrite" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Monthly summary */}
      <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Résumé mensuel</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Jours de trading', value: String(tradingDaysThisMonth) },
            { label: 'P&L total', value: formatPnl(monthPnl), color: monthPnl >= 0 ? 'text-emerald-400' : 'text-red-400' },
            { label: 'Jours verts', value: tradingDaysThisMonth > 0 ? `${greenDays}/${tradingDaysThisMonth}` : '—', color: 'text-emerald-400' },
            { label: 'Total trades', value: String(monthTrades) },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface-700/50 rounded-xl p-3 text-center">
              <div className={cn('text-lg font-bold font-mono', color ?? 'text-white')}>{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Day detail modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setShowReviewForm(false) }}
        title={selectedDay ? format(selectedDay, 'EEEE d MMMM yyyy') : ''}
        size="md"
      >
        <div className="p-6 space-y-5">
          {/* P&L summary header */}
          {selectedData && (
            <div className={cn(
              'rounded-xl p-4 flex items-center justify-between',
              selectedData.pnl >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
            )}>
              <div className="flex items-center gap-3">
                {selectedData.pnl >= 0
                  ? <TrendingUp className="w-5 h-5 text-emerald-400" />
                  : <TrendingDown className="w-5 h-5 text-red-400" />}
                <div>
                  <div className="text-xs text-slate-400">{selectedData.tradeList.length} trade{selectedData.tradeList.length > 1 ? 's' : ''} ce jour</div>
                  <div className={cn('text-xl font-bold font-mono', selectedData.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {formatPnl(selectedData.pnl)}
                  </div>
                </div>
              </div>
              <Badge variant={selectedData.pnl >= 0 ? 'long' : 'short'}>
                {selectedData.pnl >= 0 ? 'Jour vert' : 'Jour rouge'}
              </Badge>
            </div>
          )}

          {/* Trade list */}
          {selectedData && selectedData.tradeList.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-400 mb-2">Trades du jour</div>
              <div className="space-y-1.5">
                {selectedData.tradeList.map(t => (
                  <div key={t.id} className="flex items-center justify-between bg-surface-700/60 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={t.direction === 'long' ? 'long' : 'short'} className="text-[10px]">{t.direction.toUpperCase()}</Badge>
                      <span className="text-sm font-semibold text-white">{t.symbol}</span>
                      {t.setupGrade && (
                        <span className="text-[10px] font-black text-brand-400">{t.setupGrade}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {t.rMultiple !== undefined && (
                        <span className={cn('text-xs font-mono', t.rMultiple >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {formatR(t.rMultiple)}
                        </span>
                      )}
                      <span className={cn('text-sm font-bold font-mono', (t.netPnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {formatPnl(t.netPnl ?? 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review section */}
          {selectedReview && !showReviewForm ? (
            <div className="bg-surface-700/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-brand-400">Revue journalière</div>
                <button onClick={() => setShowReviewForm(true)} className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                  <PenLine className="w-3 h-3" /> Modifier
                </button>
              </div>
              {selectedReview.emotionalState && <div className="text-sm text-slate-300">État : {emotions.find(e => e.value === selectedReview.emotionalState)?.icon} {emotions.find(e => e.value === selectedReview.emotionalState)?.label}</div>}
              {selectedReview.disciplineScore && <div className="text-sm text-slate-300">Discipline : {selectedReview.disciplineScore}/10</div>}
              {selectedReview.wins && <div className="text-xs text-slate-400 italic">✅ {selectedReview.wins}</div>}
              {selectedReview.improvements && <div className="text-xs text-slate-400 italic">🔧 {selectedReview.improvements}</div>}
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="flex items-center gap-2 text-xs text-brand-400 hover:text-brand-300 transition-colors mb-3"
              >
                <PenLine className="w-3.5 h-3.5" />
                {showReviewForm ? 'Masquer la revue' : 'Écrire une revue journalière'}
              </button>

              {showReviewForm && (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-400 mb-2 block">État émotionnel</label>
                    <div className="grid grid-cols-4 gap-2">
                      {emotions.map(e => (
                        <button
                          key={e.value}
                          type="button"
                          onClick={() => setValue('emotionalState', e.value)}
                          className={cn('py-2 px-1 rounded-lg text-center transition-all border', watch('emotionalState') === e.value ? 'bg-brand-600/20 border-brand-500/40 text-white' : 'bg-surface-700 border-surface-500 text-slate-400 hover:border-surface-400')}
                        >
                          <div className="text-lg">{e.icon}</div>
                          <div className="text-xs mt-0.5">{e.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 mb-1 block">Score de discipline (1–10)</label>
                    <input {...register('disciplineScore')} type="number" min="1" max="10" placeholder="7"
                      className="w-full px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 mb-1 block">Ce qui a bien fonctionné</label>
                    <textarea {...register('wins')} rows={2} placeholder="Aujourd'hui j'ai suivi mon plan sur..."
                      className="w-full px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 mb-1 block">À améliorer</label>
                    <textarea {...register('improvements')} rows={2} placeholder="La prochaine fois je devrais..."
                      className="w-full px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 mb-1 block">Notes générales</label>
                    <textarea {...register('notes')} rows={2} placeholder="Conditions de marché, réflexions..."
                      className="w-full px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 resize-none" />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={() => setShowReviewForm(false)}>Annuler</Button>
                    <Button type="submit" variant="primary" loading={isSubmitting}>Sauvegarder</Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Empty day message */}
          {!selectedData && !showReviewForm && (
            <div className="text-center text-slate-500 text-sm py-4">Aucun trade ce jour</div>
          )}
        </div>
      </Modal>
    </div>
  )
}
