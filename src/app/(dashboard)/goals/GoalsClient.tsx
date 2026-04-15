'use client'
import { useState } from 'react'
import { useGoals } from '@/lib/hooks/useGoals'
import { Goal, Trade } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Plus, Target, Trash2, CheckCircle2, Clock } from 'lucide-react'
import { useTradeStore } from '@/lib/stores/tradeStore'

const schema = z.object({
  title: z.string().min(1, 'Title required'),
  description: z.string().optional(),
  type: z.enum(['monthly_pnl', 'win_rate', 'max_drawdown', 'trade_count', 'risk_reward', 'daily_loss_limit', 'screenshot_rate']),
  period: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  targetValue: z.coerce.number().positive(),
  unit: z.string().min(1, 'Unit required'),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const goalTypeLabels: Record<string, string> = {
  monthly_pnl: 'Objectif P&L mensuel',
  win_rate: 'Objectif de taux de réussite',
  max_drawdown: 'Limite de drawdown max',
  trade_count: 'Nombre de trades',
  risk_reward: 'Ratio Risque/Récompense',
  daily_loss_limit: 'Limite de perte journalière',
  screenshot_rate: 'Taux de screenshots',
}

function computeGoalValue(goal: Goal, trades: Trade[]): number {
  const inRange = trades.filter(t => {
    if (t.entryDate < goal.startDate || t.entryDate > goal.endDate) return false
    return true
  })
  const closed = inRange.filter(t => t.status === 'closed')

  switch (goal.type) {
    case 'monthly_pnl':
      return closed.reduce((sum, t) => sum + (t.netPnl ?? 0), 0)

    case 'win_rate': {
      if (closed.length === 0) return 0
      const wins = closed.filter(t => (t.netPnl ?? 0) > 0).length
      return (wins / closed.length) * 100
    }

    case 'max_drawdown': {
      if (closed.length === 0) return 0
      const sorted = [...closed].sort((a, b) => a.entryDate.localeCompare(b.entryDate))
      let equity = 0
      let peak = 0
      let maxDD = 0
      for (const t of sorted) {
        equity += (t.netPnl ?? 0)
        if (equity > peak) peak = equity
        const dd = peak - equity
        if (dd > maxDD) maxDD = dd
      }
      return maxDD
    }

    case 'trade_count':
      return closed.length

    case 'risk_reward': {
      const withR = closed.filter(t => t.rMultiple !== undefined)
      if (withR.length === 0) return 0
      return withR.reduce((sum, t) => sum + (t.rMultiple ?? 0), 0) / withR.length
    }

    case 'daily_loss_limit': {
      const dailyMap: Record<string, number> = {}
      for (const t of closed) {
        const day = t.entryDate.slice(0, 10)
        dailyMap[day] = (dailyMap[day] ?? 0) + (t.netPnl ?? 0)
      }
      const losses = Object.values(dailyMap).filter(v => v < 0).map(v => Math.abs(v))
      return losses.length === 0 ? 0 : Math.max(...losses)
    }

    case 'screenshot_rate': {
      if (inRange.length === 0) return 0
      const withScreenshots = inRange.filter(t => t.screenshotUrls && t.screenshotUrls.length > 0)
      return (withScreenshots.length / inRange.length) * 100
    }

    default:
      return 0
  }
}

export default function GoalsClient() {
  const { goals, isLoading, createGoal, deleteGoal } = useGoals()
  const { trades } = useTradeStore()
  const [isOpen, setIsOpen] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { period: 'monthly', type: 'monthly_pnl', unit: 'USD' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      await createGoal({ ...data, currentValue: 0, isActive: true, isCompleted: false, notes: data.notes ?? '' })
      toast.success('Objectif créé')
      setIsOpen(false)
      reset()
    } catch {
      toast.error('Échec de la création de l\'objectif')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet objectif ?')) return
    try { await deleteGoal(id); toast.success('Objectif supprimé') } catch { toast.error('Échec de la suppression') }
  }

  const active = goals.filter(g => g.isActive && !g.isCompleted)
  const completed = goals.filter(g => g.isCompleted)

  const getLiveValue = (g: Goal) => computeGoalValue(g, trades)
  const getPct = (g: Goal) => {
    const live = getLiveValue(g)
    return g.targetValue === 0 ? 0 : Math.min(100, (live / g.targetValue) * 100)
  }
  const getProgressColor = (g: Goal): 'brand' | 'emerald' | 'amber' | 'red' => {
    const pct = getPct(g)
    if (pct >= 100) return 'emerald'
    if (pct >= 75) return 'brand'
    if (pct >= 40) return 'amber'
    return 'red'
  }

  const inputCls = "w-full px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Objectifs de trading</h2>
          <p className="text-sm text-slate-500">Fixe des cibles, suis ta progression, reste discipliné</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsOpen(true)}>Nouvel objectif</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 bg-surface-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : active.length === 0 && completed.length === 0 ? (
        <EmptyState icon={Target} title="Aucun objectif pour l'instant" description="Crée ton premier objectif de trading pour suivre ta progression et rester discipliné." action={{ label: 'Créer un objectif', onClick: () => setIsOpen(true) }} />
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Objectifs actifs ({active.length})</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {active.map(goal => (
                  <div key={goal.id} className="bg-surface-800 border border-surface-500 rounded-2xl p-5 hover:border-surface-400 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-white mb-1">{goal.title}</div>
                        {goal.description && <div className="text-xs text-slate-500">{goal.description}</div>}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Badge variant="brand" className="capitalize">{goal.period}</Badge>
                        <button onClick={() => handleDelete(goal.id)} className="w-6 h-6 rounded text-slate-600 hover:text-red-400 flex items-center justify-center transition-all ml-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">{goalTypeLabels[goal.type]}</span>
                        <span className="inline-flex items-center gap-1 text-xs bg-brand-500/15 text-brand-400 border border-brand-500/20 px-1.5 py-0.5 rounded-full font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                          Live
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn('text-sm font-bold font-mono', getLiveValue(goal) >= 0 && goal.type !== 'max_drawdown' && goal.type !== 'daily_loss_limit' ? 'text-emerald-400' : getLiveValue(goal) < 0 ? 'text-red-400' : 'text-slate-200')}>
                          {goal.unit === 'USD' ? formatCurrency(getLiveValue(goal)) : `${getLiveValue(goal).toFixed(goal.type === 'win_rate' || goal.type === 'screenshot_rate' ? 1 : goal.type === 'risk_reward' ? 2 : 0)}${goal.unit}`}
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                          {' / '}
                          {goal.unit === 'USD' ? formatCurrency(goal.targetValue) : `${goal.targetValue}${goal.unit}`}
                        </span>
                      </div>
                      <ProgressBar value={getLiveValue(goal)} max={goal.targetValue} color={getProgressColor(goal)} showLabel />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{goal.startDate} → {goal.endDate}</span>
                      <span className={cn('font-medium', getPct(goal) >= 75 ? 'text-emerald-400' : getPct(goal) >= 40 ? 'text-amber-400' : 'text-red-400')}>
                        {getPct(goal).toFixed(0)}% complété
                      </span>
                    </div>
                    {goal.notes && <p className="text-xs text-slate-500 mt-2 italic">{goal.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Complétés ({completed.length})</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {completed.map(goal => (
                  <div key={goal.id} className="bg-surface-800/50 border border-emerald-500/20 rounded-2xl p-5 opacity-75">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">{goal.title}</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <ProgressBar value={100} max={100} color="emerald" />
                    <div className="text-xs text-slate-500 mt-2">Complété · {goal.period}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Créer un objectif" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Titre de l&apos;objectif *</label>
            <input {...register('title')} placeholder="ex. Objectif P&L mensuel" className={inputCls} />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Description</label>
            <input {...register('description')} placeholder="Courte description" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Type d&apos;objectif *</label>
              <select {...register('type')} className={inputCls}>
                {Object.entries(goalTypeLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Période *</label>
              <select {...register('period')} className={inputCls}>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuel</option>
                <option value="quarterly">Trimestriel</option>
                <option value="yearly">Annuel</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Valeur cible *</label>
              <input {...register('targetValue')} type="number" step="any" placeholder="5000" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Unité *</label>
              <input {...register('unit')} placeholder="USD ou %" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Date de début *</label>
              <input {...register('startDate')} type="date" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Date de fin *</label>
              <input {...register('endDate')} type="date" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Notes</label>
            <textarea {...register('notes')} rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Annuler</Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>Créer l&apos;objectif</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
