'use client'
import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, subMonths, addMonths, parseISO, isSameMonth } from 'date-fns'
import { useTradeStore } from '@/lib/stores/tradeStore'
import { useReviews } from '@/lib/hooks/useReviews'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatPnl } from '@/lib/utils/formatters'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { EmotionalState, Review } from '@/lib/types'
import toast from 'react-hot-toast'

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const emotions: { value: EmotionalState; label: string; icon: React.ReactNode }[] = [
  { value: 'excellent', label: 'Excellent', icon: '😄' },
  { value: 'good', label: 'Bien', icon: '🙂' },
  { value: 'neutral', label: 'Neutre', icon: '😐' },
  { value: 'stressed', label: 'Stressé', icon: '😰' },
  { value: 'anxious', label: 'Anxieux', icon: '😟' },
  { value: 'fear', label: 'Peur', icon: '😱' },
  { value: 'greed', label: 'Avidité', icon: '🤑' },
]

export default function CalendarClient() {
  const { trades } = useTradeStore()
  const [month, setMonth] = useState(new Date())
  const { reviews, saveReview } = useReviews(month)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const { register, handleSubmit, watch, setValue, reset, formState: { isSubmitting } } = useForm<Partial<Review>>()

  const days = useMemo(() => {
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const all = eachDayOfInterval({ start, end })
    const prefix = getDay(start)
    const blanks = Array.from({ length: prefix })
    return { all, blanks }
  }, [month])

  // Build daily PnL map
  const dailyData = useMemo(() => {
    const map = new Map<string, { pnl: number; trades: number }>()
    trades.filter(t => t.status === 'closed').forEach(t => {
      const key = format(parseISO(t.exitDate ?? t.entryDate), 'yyyy-MM-dd')
      const prev = map.get(key) ?? { pnl: 0, trades: 0 }
      map.set(key, { pnl: prev.pnl + (t.netPnl ?? 0), trades: prev.trades + 1 })
    })
    return map
  }, [trades])

  const openReview = (day: Date) => {
    setSelectedDay(day)
    const key = format(day, 'yyyy-MM-dd')
    const existing = reviews.find(r => r.date === key && r.type === 'daily')
    reset(existing ?? { habits: [] })
    setModalOpen(true)
  }

  const onSubmit = async (data: any) => {
    if (!selectedDay) return
    try {
      await saveReview({ ...data, type: 'daily', date: format(selectedDay, 'yyyy-MM-dd'), habits: [] })
      toast.success('Revue sauvegardée')
      setModalOpen(false)
    } catch { toast.error('Échec de la sauvegarde') }
  }

  // Monthly summary
  const monthPnl = Array.from(dailyData.entries())
    .filter(([k]) => isSameMonth(parseISO(k), month))
    .reduce((s, [, v]) => s + v.pnl, 0)

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
        <span className="text-base font-semibold text-white">{format(month, 'MMMM yyyy')}</span>
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

            return (
              <button
                key={key}
                onClick={() => openReview(day)}
                className={cn(
                  'border-b border-r border-surface-600 h-20 sm:h-24 p-2 text-left hover:bg-surface-700/60 transition-all relative',
                  isWeekend && 'opacity-50',
                  isToday && 'bg-brand-600/10 border-brand-500/30'
                )}
              >
                <div className={cn('text-xs font-medium mb-1', isToday ? 'text-brand-300' : 'text-slate-400')}>
                  {format(day, 'd')}
                </div>
                {data && (
                  <div className={cn('text-xs font-bold font-mono', data.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {data.pnl >= 0 ? '+' : ''}{formatCurrency(data.pnl, 'USD', true)}
                    <div className="text-slate-500 font-normal">{data.trades}t</div>
                  </div>
                )}
                {hasReview && (
                  <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 bg-brand-500 rounded-full" />
                )}
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
            { label: 'Jours de trading', value: String(Array.from(dailyData.entries()).filter(([k]) => isSameMonth(parseISO(k), month)).length) },
            { label: 'P&L total', value: formatPnl(monthPnl), color: monthPnl >= 0 ? 'text-emerald-400' : 'text-red-400' },
            { label: 'Revues écrites', value: String(reviews.length) },
            { label: 'Total trades', value: String(Array.from(dailyData.entries()).filter(([k]) => isSameMonth(parseISO(k), month)).reduce((s, [, v]) => s + v.trades, 0)) },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface-700/50 rounded-xl p-3 text-center">
              <div className={cn('text-lg font-bold font-mono', color ?? 'text-white')}>{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Review modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedDay ? `Revue : ${format(selectedDay, 'MMM d, yyyy')}` : 'Revue journalière'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
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
            <label className="text-xs font-medium text-slate-400 mb-1 block">Ce qui a bien fonctionné ?</label>
            <textarea {...register('wins')} rows={2} placeholder="Aujourd'hui j'ai suivi mon plan sur..."
              className="w-full px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Ce à améliorer ?</label>
            <textarea {...register('improvements')} rows={2} placeholder="La prochaine fois je devrais..."
              className="w-full px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Notes générales</label>
            <textarea {...register('notes')} rows={2} placeholder="Conditions de marché, réflexions..."
              className="w-full px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>Sauvegarder la revue</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
