'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import { collection, getDocs, doc, setDoc, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { col } from '@/lib/firebase/collections'
import { Backtest } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { EquityCurveChart } from '@/components/charts/EquityCurveChart'
import { formatCurrency, formatPnl, formatDate } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Plus, FlaskConical, TrendingUp } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1),
  strategy: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  initialCapital: z.coerce.number().positive(),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function BacktestClient() {
  const { user } = useAuthStore()
  const [backtests, setBacktests] = useState<Backtest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<Backtest | null>(null)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const q = query(collection(db, col.backtests(user.uid)), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setBacktests(snap.docs.map(d => ({ id: d.id, ...d.data() } as Backtest)))
      setIsLoading(false)
    }
    load()
  }, [user])

  const { register, handleSubmit, formState: { isSubmitting }, reset } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    if (!user) return
    try {
      const id = `backtest_${Date.now()}`
      const bt: Backtest = {
        ...data, id, userId: user.uid, trades: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }
      await setDoc(doc(db, col.backtest(user.uid, id)), bt)
      setBacktests(prev => [bt, ...prev])
      toast.success('Backtest created')
      setIsOpen(false)
      reset()
    } catch { toast.error('Failed') }
  }

  const inputCls = "w-full px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Backtesting</h2>
          <p className="text-sm text-slate-500">Log and analyze manual backtest sessions</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsOpen(true)}>New Session</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-surface-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : backtests.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No backtests yet" description="Create a backtest session to test your strategies on historical data." action={{ label: 'New Session', onClick: () => setIsOpen(true) }} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {backtests.map(bt => (
            <button key={bt.id} onClick={() => setSelected(bt)}
              className="bg-surface-800 border border-surface-500 rounded-2xl p-5 text-left hover:border-brand-500/40 transition-all">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm font-bold text-white mb-0.5">{bt.name}</div>
                  <div className="text-xs text-slate-500">{bt.strategy}</div>
                </div>
                <div className={cn('text-sm font-bold font-mono', (bt.totalPnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {bt.totalPnl !== undefined ? formatPnl(bt.totalPnl) : 'No trades yet'}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>{formatDate(bt.startDate, 'MMM d')} — {formatDate(bt.endDate, 'MMM d, yyyy')}</span>
                <span>Initial: {formatCurrency(bt.initialCapital)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* New session modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="New Backtest Session" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Session Name *</label>
              <input {...register('name')} placeholder="NVDA Momentum Jan" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Strategy *</label>
              <input {...register('strategy')} placeholder="Momentum Breakout" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Description</label>
            <textarea {...register('description')} rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Start Date *</label>
              <input {...register('startDate')} type="date" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">End Date *</label>
              <input {...register('endDate')} type="date" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Initial Capital ($) *</label>
            <input {...register('initialCapital')} type="number" placeholder="10000" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Notes</label>
            <textarea {...register('notes')} rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>Create Session</Button>
          </div>
        </form>
      </Modal>

      {/* Detail modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? 'Session'} size="lg">
        {selected && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Strategy', value: selected.strategy },
                { label: 'Period', value: `${formatDate(selected.startDate, 'MMM d')}–${formatDate(selected.endDate, 'MMM d')}` },
                { label: 'Capital', value: formatCurrency(selected.initialCapital) },
                { label: 'Total P&L', value: selected.totalPnl !== undefined ? formatPnl(selected.totalPnl) : '—', color: (selected.totalPnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-surface-700/50 rounded-xl p-3 text-center">
                  <div className={cn('text-sm font-bold', color ?? 'text-white')}>{value}</div>
                  <div className="text-xs text-slate-500">{label}</div>
                </div>
              ))}
            </div>
            {selected.notes && <p className="text-sm text-slate-400 bg-surface-700/40 rounded-xl p-3">{selected.notes}</p>}
            <div className="text-center py-8 text-slate-500 text-sm">
              Manual trade entry for backtests coming soon. Use the Import feature to add historical trades.
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
