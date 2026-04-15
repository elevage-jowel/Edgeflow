'use client'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'
import { Plus, Pencil, Trash2, AlertTriangle, Building2, X } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import { useTradeStore } from '@/lib/stores/tradeStore'
import { Trade } from '@/lib/types'

interface PropFirmAccount {
  id: string
  firmName: string
  accountSize: number
  phase: string
  profitTarget: number  // %
  maxDailyLoss: number  // %
  maxTotalLoss: number  // %
  currentPnl: number    // $
  startDate: string
  isActive: boolean
  notes?: string
}

type FormData = Omit<PropFirmAccount, 'id'>

const STORAGE_KEY = 'propfirm_accounts'
const PHASES = ['Challenge', 'Verification', 'Funded']

const phaseColors: Record<string, string> = {
  Challenge: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  Verification: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  Funded: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
}

function getDrawdownStatus(used: number, limit: number): 'ok' | 'warning' | 'breached' {
  if (limit === 0) return 'ok'
  const pct = used / limit
  if (pct >= 1) return 'breached'
  if (pct >= 0.8) return 'warning'
  return 'ok'
}

function StatusBadge({ status }: { status: 'ok' | 'warning' | 'breached' }) {
  const map = {
    ok: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    breached: 'bg-red-500/15 text-red-400 border border-red-500/20',
  }
  const labels = { ok: 'On Track', warning: 'Warning', breached: 'Breached' }
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', map[status])}>
      {labels[status]}
    </span>
  )
}

function GaugeBar({ value, max, color }: { value: number; max: number; color: 'emerald' | 'red' | 'amber' }) {
  const pct = Math.min(100, max === 0 ? 0 : (value / max) * 100)
  const barColor = {
    emerald: 'bg-emerald-500',
    red: 'bg-red-500',
    amber: 'bg-amber-500',
  }[color]
  return (
    <div className="w-full h-1.5 bg-surface-600 rounded-full overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all', barColor)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function computeAccountPnl(account: PropFirmAccount, trades: Trade[]): number {
  const firmLower = account.firmName.toLowerCase()
  const matching = trades.filter(t => {
    const tFirm = (t.propFirm ?? '').toLowerCase()
    const nameMatch = tFirm.includes(firmLower) || firmLower.includes(tFirm)
    if (!nameMatch || tFirm === '') return false
    if (t.entryDate < account.startDate) return false
    if (t.status !== 'closed') return false
    return true
  })
  if (matching.length === 0) return 0
  return matching.reduce((sum, t) => sum + (t.netPnl ?? 0), 0)
}

function AccountCard({ account, onEdit, onDelete, computedPnl }: {
  account: PropFirmAccount
  onEdit: (a: PropFirmAccount) => void
  onDelete: (id: string) => void
  computedPnl: number
}) {
  const displayPnl = computedPnl !== 0 ? computedPnl : account.currentPnl
  const isAutoComputed = computedPnl !== 0

  const targetDollar = (account.profitTarget / 100) * account.accountSize
  const maxDailyDollar = (account.maxDailyLoss / 100) * account.accountSize
  const maxTotalDollar = (account.maxTotalLoss / 100) * account.accountSize

  // Use absolute loss value for drawdown gauges
  const lossAmount = displayPnl < 0 ? Math.abs(displayPnl) : 0

  const profitPct = targetDollar === 0 ? 0 : Math.min(100, (displayPnl / targetDollar) * 100)
  const dailyStatus = getDrawdownStatus(lossAmount, maxDailyDollar)
  const totalStatus = getDrawdownStatus(lossAmount, maxTotalDollar)
  const overallStatus: 'ok' | 'warning' | 'breached' =
    dailyStatus === 'breached' || totalStatus === 'breached' ? 'breached'
    : dailyStatus === 'warning' || totalStatus === 'warning' ? 'warning' : 'ok'

  let daysElapsed = 0
  try {
    daysElapsed = differenceInDays(new Date(), parseISO(account.startDate))
  } catch {}

  return (
    <div className={cn(
      'bg-surface-800 border rounded-2xl p-5 transition-all hover:border-surface-400 space-y-4',
      overallStatus === 'breached' ? 'border-red-500/30' : overallStatus === 'warning' ? 'border-amber-500/30' : 'border-surface-600'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-white truncate">{account.firmName}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', phaseColors[account.phase] ?? 'bg-surface-600 text-slate-300')}>
              {account.phase}
            </span>
          </div>
          <div className="text-sm text-slate-400 mt-0.5">
            {formatCurrency(account.accountSize, 'USD', true)} account
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <StatusBadge status={overallStatus} />
          <button
            onClick={() => onEdit(account)}
            className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-surface-700 flex items-center justify-center transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(account.id)}
            className="w-7 h-7 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Profit Progress */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500">Profit Target ({account.profitTarget}%)</span>
          <div className="flex items-center gap-1.5">
            {isAutoComputed && (
              <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Auto
              </span>
            )}
            <span className={cn('text-xs font-mono font-medium', displayPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {formatCurrency(displayPnl)} / {formatCurrency(targetDollar)}
            </span>
          </div>
        </div>
        <GaugeBar value={Math.max(0, displayPnl)} max={targetDollar} color="emerald" />
        <div className="text-xs text-slate-600 mt-1 text-right">{profitPct.toFixed(1)}% of target</div>
      </div>

      {/* Daily Loss */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500">Daily Loss Limit ({account.maxDailyLoss}%)</span>
          <span className={cn('text-xs font-mono', dailyStatus === 'ok' ? 'text-slate-400' : dailyStatus === 'warning' ? 'text-amber-400' : 'text-red-400')}>
            {formatCurrency(lossAmount)} / {formatCurrency(maxDailyDollar)}
          </span>
        </div>
        <GaugeBar
          value={lossAmount}
          max={maxDailyDollar}
          color={dailyStatus === 'ok' ? 'emerald' : dailyStatus === 'warning' ? 'amber' : 'red'}
        />
      </div>

      {/* Total Drawdown */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500">Total Drawdown ({account.maxTotalLoss}%)</span>
          <span className={cn('text-xs font-mono', totalStatus === 'ok' ? 'text-slate-400' : totalStatus === 'warning' ? 'text-amber-400' : 'text-red-400')}>
            {formatCurrency(lossAmount)} / {formatCurrency(maxTotalDollar)}
          </span>
        </div>
        <GaugeBar
          value={lossAmount}
          max={maxTotalDollar}
          color={totalStatus === 'ok' ? 'emerald' : totalStatus === 'warning' ? 'amber' : 'red'}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-surface-700">
        <span>Started {account.startDate}</span>
        <span>{daysElapsed} day{daysElapsed !== 1 ? 's' : ''} elapsed</span>
      </div>
      {account.notes && (
        <p className="text-xs text-slate-500 italic border-t border-surface-700 pt-2">{account.notes}</p>
      )}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors'
const labelCls = 'text-xs font-medium text-slate-400 mb-1 block'

export default function PropFirmClient() {
  const [accounts, setAccounts] = useState<PropFirmAccount[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { trades } = useTradeStore()

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setAccounts(JSON.parse(raw))
    } catch {}
  }, [])

  const persist = (next: PropFirmAccount[]) => {
    setAccounts(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm<FormData>({
    defaultValues: {
      firmName: '',
      accountSize: 100000,
      phase: 'Challenge',
      profitTarget: 10,
      maxDailyLoss: 5,
      maxTotalLoss: 10,
      currentPnl: 0,
      startDate: new Date().toISOString().slice(0, 10),
      isActive: true,
      notes: '',
    },
  })

  const openAdd = () => {
    setEditingId(null)
    reset({
      firmName: '',
      accountSize: 100000,
      phase: 'Challenge',
      profitTarget: 10,
      maxDailyLoss: 5,
      maxTotalLoss: 10,
      currentPnl: 0,
      startDate: new Date().toISOString().slice(0, 10),
      isActive: true,
      notes: '',
    })
    setIsOpen(true)
  }

  const openEdit = (account: PropFirmAccount) => {
    setEditingId(account.id)
    const { id, ...fields } = account
    reset(fields)
    setIsOpen(true)
  }

  const closeModal = () => { setIsOpen(false); setEditingId(null) }

  const onSubmit = (data: FormData) => {
    const coerced: FormData = {
      ...data,
      accountSize: Number(data.accountSize),
      profitTarget: Number(data.profitTarget),
      maxDailyLoss: Number(data.maxDailyLoss),
      maxTotalLoss: Number(data.maxTotalLoss),
      currentPnl: Number(data.currentPnl),
      isActive: Boolean(data.isActive),
    }
    if (editingId) {
      persist(accounts.map(a => a.id === editingId ? { ...coerced, id: editingId } : a))
    } else {
      persist([...accounts, { ...coerced, id: crypto.randomUUID() }])
    }
    closeModal()
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this prop firm account?')) return
    persist(accounts.filter(a => a.id !== id))
  }

  // Drawdown alerts: within 20% of daily or total loss limit (>=80% used)
  const alerts = accounts.filter(a => {
    const maxDaily = (a.maxDailyLoss / 100) * a.accountSize
    const maxTotal = (a.maxTotalLoss / 100) * a.accountSize
    const computed = computeAccountPnl(a, trades)
    const pnl = computed !== 0 ? computed : a.currentPnl
    const loss = pnl < 0 ? Math.abs(pnl) : 0
    return (maxDaily > 0 && loss / maxDaily >= 0.8) || (maxTotal > 0 && loss / maxTotal >= 0.8)
  })

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Prop Firm Tracker</h2>
          <p className="text-sm text-slate-500">Monitor challenges, drawdown limits, and funding progress</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={openAdd}>Add Account</Button>
      </div>

      {/* Drawdown Alert Banner */}
      {alerts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300 mb-1">Drawdown Alert</p>
            <ul className="text-xs text-red-400 space-y-0.5">
              {alerts.map(a => {
                const maxDaily = (a.maxDailyLoss / 100) * a.accountSize
                const maxTotal = (a.maxTotalLoss / 100) * a.accountSize
                const computed = computeAccountPnl(a, trades)
                const pnl = computed !== 0 ? computed : a.currentPnl
                const loss = pnl < 0 ? Math.abs(pnl) : 0
                const dailyPct = maxDaily > 0 ? ((loss / maxDaily) * 100).toFixed(0) : '0'
                const totalPct = maxTotal > 0 ? ((loss / maxTotal) * 100).toFixed(0) : '0'
                return (
                  <li key={a.id}>
                    <span className="font-medium">{a.firmName}</span> — Daily: {dailyPct}% used, Total: {totalPct}% used
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Empty State */}
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-700 flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7 text-slate-500" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">No accounts yet</h3>
          <p className="text-sm text-slate-500 mb-5 max-w-xs">
            Add your first prop firm account to track challenges, drawdown limits, and progress toward funding.
          </p>
          <Button variant="primary" icon={Plus} onClick={openAdd}>Add Account</Button>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {accounts.map(a => (
            <AccountCard key={a.id} account={a} onEdit={openEdit} onDelete={handleDelete} computedPnl={computeAccountPnl(a, trades)} />
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-lg bg-surface-800 border border-surface-600 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
              <h3 className="text-base font-bold text-white">
                {editingId ? 'Edit Account' : 'Add Prop Firm Account'}
              </h3>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg text-slate-500 hover:text-white hover:bg-surface-700 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
              {/* Firm Name + Phase */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Firm Name *</label>
                  <input
                    {...register('firmName', { required: 'Required' })}
                    placeholder="FTMO, MyForexFunds…"
                    className={inputCls}
                  />
                  {errors.firmName && <p className="text-red-400 text-xs mt-1">{errors.firmName.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Phase *</label>
                  <select {...register('phase')} className={inputCls}>
                    {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Account Size + Start Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Account Size ($) *</label>
                  <input
                    {...register('accountSize', { required: 'Required', valueAsNumber: true, min: { value: 1, message: 'Must be > 0' } })}
                    type="number"
                    step="1000"
                    placeholder="100000"
                    className={inputCls}
                  />
                  {errors.accountSize && <p className="text-red-400 text-xs mt-1">{errors.accountSize.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Start Date *</label>
                  <input {...register('startDate', { required: 'Required' })} type="date" className={inputCls} />
                  {errors.startDate && <p className="text-red-400 text-xs mt-1">{errors.startDate.message}</p>}
                </div>
              </div>

              {/* Profit Target */}
              <div>
                <label className={labelCls}>Profit Target (%)</label>
                <input
                  {...register('profitTarget', { required: 'Required', valueAsNumber: true, min: { value: 0.1, message: 'Must be > 0' } })}
                  type="number"
                  step="0.1"
                  placeholder="10"
                  className={inputCls}
                />
                {errors.profitTarget && <p className="text-red-400 text-xs mt-1">{errors.profitTarget.message}</p>}
              </div>

              {/* Daily + Total Loss */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Max Daily Loss (%)</label>
                  <input
                    {...register('maxDailyLoss', { required: 'Required', valueAsNumber: true, min: { value: 0.1, message: 'Must be > 0' } })}
                    type="number"
                    step="0.1"
                    placeholder="5"
                    className={inputCls}
                  />
                  {errors.maxDailyLoss && <p className="text-red-400 text-xs mt-1">{errors.maxDailyLoss.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Max Total Loss (%)</label>
                  <input
                    {...register('maxTotalLoss', { required: 'Required', valueAsNumber: true, min: { value: 0.1, message: 'Must be > 0' } })}
                    type="number"
                    step="0.1"
                    placeholder="10"
                    className={inputCls}
                  />
                  {errors.maxTotalLoss && <p className="text-red-400 text-xs mt-1">{errors.maxTotalLoss.message}</p>}
                </div>
              </div>

              {/* Current PnL */}
              <div>
                <label className={labelCls}>Current P&amp;L ($)</label>
                <input
                  {...register('currentPnl', { required: 'Required', valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  placeholder="0"
                  className={inputCls}
                />
                {errors.currentPnl && <p className="text-red-400 text-xs mt-1">{errors.currentPnl.message}</p>}
              </div>

              {/* Notes */}
              <div>
                <label className={labelCls}>Notes</label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  placeholder="Optional notes…"
                  className={cn(inputCls, 'resize-none')}
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <input
                  {...register('isActive')}
                  type="checkbox"
                  id="isActive"
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <label htmlFor="isActive" className="text-sm text-slate-300 cursor-pointer">Account is active</label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-surface-700">
                <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                <Button type="submit" variant="primary" loading={isSubmitting}>
                  {editingId ? 'Save Changes' : 'Add Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
