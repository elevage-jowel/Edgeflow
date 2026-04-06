'use client'
import { useState } from 'react'
import { useGoals } from '@/lib/hooks/useGoals'
import { Goal } from '@/lib/types'
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
  monthly_pnl: 'Monthly P&L Target',
  win_rate: 'Win Rate Target',
  max_drawdown: 'Max Drawdown Limit',
  trade_count: 'Trade Count',
  risk_reward: 'Risk/Reward Ratio',
  daily_loss_limit: 'Daily Loss Limit',
  screenshot_rate: 'Screenshot Rate',
}

export default function GoalsClient() {
  const { goals, isLoading, createGoal, deleteGoal } = useGoals()
  const [isOpen, setIsOpen] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { period: 'monthly', type: 'monthly_pnl', unit: 'USD' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      await createGoal({ ...data, currentValue: 0, isActive: true, isCompleted: false, notes: data.notes ?? '' })
      toast.success('Goal created')
      setIsOpen(false)
      reset()
    } catch {
      toast.error('Failed to create goal')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this goal?')) return
    try { await deleteGoal(id); toast.success('Goal deleted') } catch { toast.error('Failed to delete') }
  }

  const active = goals.filter(g => g.isActive && !g.isCompleted)
  const completed = goals.filter(g => g.isCompleted)

  const getPct = (g: Goal) => Math.min(100, (g.currentValue / g.targetValue) * 100)
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
          <h2 className="text-lg font-bold text-white">Trading Goals</h2>
          <p className="text-sm text-slate-500">Set targets, track progress, stay disciplined</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsOpen(true)}>New Goal</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 bg-surface-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : active.length === 0 && completed.length === 0 ? (
        <EmptyState icon={Target} title="No goals yet" description="Set your first trading goal to track your progress and build discipline." action={{ label: 'Create Goal', onClick: () => setIsOpen(true) }} />
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Active Goals ({active.length})</h3>
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
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500">{goalTypeLabels[goal.type]}</span>
                        <span className="text-xs font-mono text-slate-300">
                          {goal.unit === 'USD' ? formatCurrency(goal.currentValue) : `${goal.currentValue}${goal.unit}`}
                          {' / '}
                          {goal.unit === 'USD' ? formatCurrency(goal.targetValue) : `${goal.targetValue}${goal.unit}`}
                        </span>
                      </div>
                      <ProgressBar value={goal.currentValue} max={goal.targetValue} color={getProgressColor(goal)} showLabel />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{goal.startDate} → {goal.endDate}</span>
                      <span className={cn('font-medium', getPct(goal) >= 75 ? 'text-emerald-400' : getPct(goal) >= 40 ? 'text-amber-400' : 'text-red-400')}>
                        {getPct(goal).toFixed(0)}% complete
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
              <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Completed ({completed.length})</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {completed.map(goal => (
                  <div key={goal.id} className="bg-surface-800/50 border border-emerald-500/20 rounded-2xl p-5 opacity-75">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">{goal.title}</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <ProgressBar value={100} max={100} color="emerald" />
                    <div className="text-xs text-slate-500 mt-2">Completed · {goal.period}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Create Goal" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Goal Title *</label>
            <input {...register('title')} placeholder="e.g. Monthly P&L Target" className={inputCls} />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Description</label>
            <input {...register('description')} placeholder="Short description" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Goal Type *</label>
              <select {...register('type')} className={inputCls}>
                {Object.entries(goalTypeLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Period *</label>
              <select {...register('period')} className={inputCls}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Target Value *</label>
              <input {...register('targetValue')} type="number" step="any" placeholder="5000" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Unit *</label>
              <input {...register('unit')} placeholder="USD or %" className={inputCls} />
            </div>
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
            <label className="text-xs font-medium text-slate-400 mb-1 block">Notes</label>
            <textarea {...register('notes')} rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>Create Goal</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
