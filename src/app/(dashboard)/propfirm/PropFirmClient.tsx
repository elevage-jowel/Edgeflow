'use client'
import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'
import { Plus, Pencil, Trash2, AlertTriangle, Building2, X, TrendingUp, Calendar, Target } from 'lucide-react'
import { differenceInDays, parseISO, format, isToday } from 'date-fns'
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
const PHASES = ['Challenge', 'Vérification', 'Funded']

const phaseColors: Record<string, string> = {
  Challenge:    'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  Vérification: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  Funded:       'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
}

const phaseLabels: Record<string, string> = {
  Challenge:    'Challenge',
  Vérification: 'Vérification',
  Funded:       'Financé',
}

function statusLabel(s: 'ok' | 'warning' | 'breached') {
  return { ok: 'En règle', warning: 'Attention', breached: 'Dépassé' }[s]
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
    ok:       'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    warning:  'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    breached: 'bg-red-500/15 text-red-400 border border-red-500/20',
  }
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', map[status])}>
      {statusLabel(status)}
    </span>
  )
}

function GaugeBar({ value, max, color }: { value: number; max: number; color: 'emerald' | 'red' | 'amber' }) {
  const pct = Math.min(100, max === 0 ? 0 : (value / max) * 100)
  const barColor = {
    emerald: 'bg-emerald-500',
    red:     'bg-red-500',
    amber:   'bg-amber-500',
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
    return t.status === 'closed'
  })
  if (matching.length === 0) return 0
  return matching.reduce((sum, t) => sum + (t.netPnl ?? 0), 0)
}

function computeDailyPnl(account: PropFirmAccount, trades: Trade[]): number {
  const firmLower = account.firmName.toLowerCase()
  const matching = trades.filter(t => {
    const tFirm = (t.propFirm ?? '').toLowerCase()
    const nameMatch = tFirm.includes(firmLower) || firmLower.includes(tFirm)
    if (!nameMatch || tFirm === '') return false
    if (t.status !== 'closed') return false
    try {
      return isToday(parseISO(t.exitDate ?? t.entryDate))
    } catch { return false }
  })
  if (matching.length === 0) return 0
  return matching.reduce((sum, t) => sum + (t.netPnl ?? 0), 0)
}

function AccountCard({ account, onEdit, onDelete, computedPnl, dailyPnl }: {
  account: PropFirmAccount
  onEdit: (a: PropFirmAccount) => void
  onDelete: (id: string) => void
  computedPnl: number
  dailyPnl: number
}) {
  const displayPnl = computedPnl !== 0 ? computedPnl : account.currentPnl
  const isAutoComputed = computedPnl !== 0

  const targetDollar = (account.profitTarget / 100) * account.accountSize
  const maxDailyDollar = (account.maxDailyLoss / 100) * account.accountSize
  const maxTotalDollar = (account.maxTotalLoss / 100) * account.accountSize

  // Cumulative loss for total drawdown
  const totalLoss = displayPnl < 0 ? Math.abs(displayPnl) : 0
  // Today's loss (only negative = loss)
  const todayLoss = dailyPnl < 0 ? Math.abs(dailyPnl) : 0

  const profitPct = targetDollar === 0 ? 0 : Math.min(100, (displayPnl / targetDollar) * 100)
  const dailyStatus = getDrawdownStatus(todayLoss, maxDailyDollar)
  const totalStatus = getDrawdownStatus(totalLoss, maxTotalDollar)
  const overallStatus: 'ok' | 'warning' | 'breached' =
    dailyStatus === 'breached' || totalStatus === 'breached' ? 'breached'
    : dailyStatus === 'warning' || totalStatus === 'warning' ? 'warning' : 'ok'

  let daysElapsed = 0
  try {
    daysElapsed = differenceInDays(new Date(), parseISO(account.startDate))
  } catch {}

  const todayStr = format(new Date(), 'dd/MM')

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
              {phaseLabels[account.phase] ?? account.phase}
            </span>
          </div>
          <div className="text-sm text-slate-400 mt-0.5">
            Compte {formatCurrency(account.accountSize, 'USD', true)}
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
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-500">Objectif profit ({account.profitTarget}%)</span>
          </div>
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
        <div className="text-xs text-slate-600 mt-1 text-right">{profitPct.toFixed(1)}% de l'objectif</div>
      </div>

      {/* Daily Loss — based on today's closed trades */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-500">Perte journalière max ({account.maxDailyLoss}%) — {todayStr}</span>
          </div>
          <span className={cn('text-xs font-mono', dailyStatus === 'ok' ? 'text-slate-400' : dailyStatus === 'warning' ? 'text-amber-400' : 'text-red-400')}>
            {formatCurrency(todayLoss)} / {formatCurrency(maxDailyDollar)}
          </span>
        </div>
        <GaugeBar
          value={todayLoss}
          max={maxDailyDollar}
          color={dailyStatus === 'ok' ? 'emerald' : dailyStatus === 'warning' ? 'amber' : 'red'}
        />
        {dailyPnl > 0 && (
          <div className="text-xs text-emerald-500 mt-1 text-right">
            +{formatCurrency(dailyPnl)} aujourd'hui
          </div>
        )}
      </div>

      {/* Total Drawdown */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-500">Drawdown total max ({account.maxTotalLoss}%)</span>
          </div>
          <span className={cn('text-xs font-mono', totalStatus === 'ok' ? 'text-slate-400' : totalStatus === 'warning' ? 'text-amber-400' : 'text-red-400')}>
            {formatCurrency(totalLoss)} / {formatCurrency(maxTotalDollar)}
          </span>
        </div>
        <GaugeBar
          value={totalLoss}
          max={maxTotalDollar}
          color={totalStatus === 'ok' ? 'emerald' : totalStatus === 'warning' ? 'amber' : 'red'}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        {[
          {
            label: "P&L total",
            value: formatCurrency(displayPnl),
            color: displayPnl >= 0 ? 'text-emerald-400' : 'text-red-400',
          },
          {
            label: "Aujourd'hui",
            value: dailyPnl !== 0 ? formatCurrency(dailyPnl) : '—',
            color: dailyPnl > 0 ? 'text-emerald-400' : dailyPnl < 0 ? 'text-red-400' : 'text-slate-400',
          },
          {
            label: "Jours écoulés",
            value: `${daysElapsed}j`,
            color: 'text-slate-300',
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface-700/50 rounded-xl p-2.5 text-center">
            <div className={cn('text-sm font-bold font-mono', color)}>{value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-xs text-slate-600 pt-1 border-t border-surface-700">
        Démarré le {account.startDate}
        {account.notes && <p className="text-slate-500 italic mt-1">{account.notes}</p>}
      </div>
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

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
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
    if (!confirm('Supprimer ce compte prop firm ?')) return
    persist(accounts.filter(a => a.id !== id))
  }

  const computedPnls = useMemo(() =>
    Object.fromEntries(accounts.map(a => [a.id, computeAccountPnl(a, trades)])),
    [accounts, trades]
  )

  const dailyPnls = useMemo(() =>
    Object.fromEntries(accounts.map(a => [a.id, computeDailyPnl(a, trades)])),
    [accounts, trades]
  )

  // Alert: ≥80% of daily or total loss limit used
  const alerts = accounts.filter(a => {
    const maxDaily = (a.maxDailyLoss / 100) * a.accountSize
    const maxTotal = (a.maxTotalLoss / 100) * a.accountSize
    const pnl = computedPnls[a.id] !== 0 ? computedPnls[a.id] : a.currentPnl
    const todayLoss = dailyPnls[a.id] < 0 ? Math.abs(dailyPnls[a.id]) : 0
    const totalLoss = pnl < 0 ? Math.abs(pnl) : 0
    return (maxDaily > 0 && todayLoss / maxDaily >= 0.8) || (maxTotal > 0 && totalLoss / maxTotal >= 0.8)
  })

  // Summary stats
  const totalFunded = accounts.filter(a => a.phase === 'Funded').length
  const totalPnl = accounts.reduce((s, a) => {
    const pnl = computedPnls[a.id] !== 0 ? computedPnls[a.id] : a.currentPnl
    return s + pnl
  }, 0)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Prop Firm Tracker</h2>
          <p className="text-sm text-slate-500">Suivi des challenges, limites de drawdown et progression vers le financement</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={openAdd}>Ajouter un compte</Button>
      </div>

      {/* Summary bar */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Comptes actifs',
              value: String(accounts.filter(a => a.isActive).length),
              icon: Building2,
              color: 'text-brand-400',
            },
            {
              label: 'Comptes financés',
              value: String(totalFunded),
              icon: TrendingUp,
              color: 'text-emerald-400',
            },
            {
              label: 'P&L total cumulé',
              value: formatCurrency(totalPnl),
              icon: Target,
              color: totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-surface-800 border border-surface-500 rounded-xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-700 flex items-center justify-center shrink-0">
                <Icon className={cn('w-4 h-4', color)} />
              </div>
              <div>
                <div className={cn('text-lg font-bold font-mono', color)}>{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawdown Alert Banner */}
      {alerts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300 mb-1">Alerte drawdown</p>
            <ul className="text-xs text-red-400 space-y-0.5">
              {alerts.map(a => {
                const maxDaily = (a.maxDailyLoss / 100) * a.accountSize
                const maxTotal = (a.maxTotalLoss / 100) * a.accountSize
                const pnl = computedPnls[a.id] !== 0 ? computedPnls[a.id] : a.currentPnl
                const todayLoss = dailyPnls[a.id] < 0 ? Math.abs(dailyPnls[a.id]) : 0
                const totalLoss = pnl < 0 ? Math.abs(pnl) : 0
                const dailyPct = maxDaily > 0 ? ((todayLoss / maxDaily) * 100).toFixed(0) : '0'
                const totalPct = maxTotal > 0 ? ((totalLoss / maxTotal) * 100).toFixed(0) : '0'
                return (
                  <li key={a.id}>
                    <span className="font-medium">{a.firmName}</span> — Journalier : {dailyPct}% utilisé, Total : {totalPct}% utilisé
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
          <h3 className="text-base font-semibold text-white mb-1">Aucun compte pour l'instant</h3>
          <p className="text-sm text-slate-500 mb-5 max-w-xs">
            Ajoute ton premier compte prop firm pour suivre tes challenges, limites de drawdown et progresser vers le financement.
          </p>
          <Button variant="primary" icon={Plus} onClick={openAdd}>Ajouter un compte</Button>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {accounts.map(a => (
            <AccountCard
              key={a.id}
              account={a}
              onEdit={openEdit}
              onDelete={handleDelete}
              computedPnl={computedPnls[a.id]}
              dailyPnl={dailyPnls[a.id]}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-lg bg-surface-800 border border-surface-600 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
              <h3 className="text-base font-bold text-white">
                {editingId ? 'Modifier le compte' : 'Ajouter un compte prop firm'}
              </h3>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg text-slate-500 hover:text-white hover:bg-surface-700 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nom de la firm *</label>
                  <input
                    {...register('firmName', { required: 'Requis' })}
                    placeholder="FTMO, MyForexFunds…"
                    className={inputCls}
                  />
                  {errors.firmName && <p className="text-red-400 text-xs mt-1">{errors.firmName.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Phase *</label>
                  <select {...register('phase')} className={inputCls}>
                    {PHASES.map(p => <option key={p} value={p}>{phaseLabels[p] ?? p}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Taille du compte ($) *</label>
                  <input
                    {...register('accountSize', { required: 'Requis', valueAsNumber: true, min: { value: 1, message: 'Doit être > 0' } })}
                    type="number"
                    step="1000"
                    placeholder="100000"
                    className={inputCls}
                  />
                  {errors.accountSize && <p className="text-red-400 text-xs mt-1">{errors.accountSize.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Date de début *</label>
                  <input {...register('startDate', { required: 'Requis' })} type="date" className={inputCls} />
                  {errors.startDate && <p className="text-red-400 text-xs mt-1">{errors.startDate.message}</p>}
                </div>
              </div>

              <div>
                <label className={labelCls}>Objectif de profit (%)</label>
                <input
                  {...register('profitTarget', { required: 'Requis', valueAsNumber: true, min: { value: 0.1, message: 'Doit être > 0' } })}
                  type="number"
                  step="0.1"
                  placeholder="10"
                  className={inputCls}
                />
                {errors.profitTarget && <p className="text-red-400 text-xs mt-1">{errors.profitTarget.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Perte journalière max (%)</label>
                  <input
                    {...register('maxDailyLoss', { required: 'Requis', valueAsNumber: true, min: { value: 0.1, message: 'Doit être > 0' } })}
                    type="number"
                    step="0.1"
                    placeholder="5"
                    className={inputCls}
                  />
                  {errors.maxDailyLoss && <p className="text-red-400 text-xs mt-1">{errors.maxDailyLoss.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Drawdown total max (%)</label>
                  <input
                    {...register('maxTotalLoss', { required: 'Requis', valueAsNumber: true, min: { value: 0.1, message: 'Doit être > 0' } })}
                    type="number"
                    step="0.1"
                    placeholder="10"
                    className={inputCls}
                  />
                  {errors.maxTotalLoss && <p className="text-red-400 text-xs mt-1">{errors.maxTotalLoss.message}</p>}
                </div>
              </div>

              <div>
                <label className={labelCls}>P&L actuel ($) <span className="text-slate-600">(si pas de trades liés)</span></label>
                <input
                  {...register('currentPnl', { required: 'Requis', valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  placeholder="0"
                  className={inputCls}
                />
                {errors.currentPnl && <p className="text-red-400 text-xs mt-1">{errors.currentPnl.message}</p>}
              </div>

              <div>
                <label className={labelCls}>Notes</label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  placeholder="Notes optionnelles…"
                  className={cn(inputCls, 'resize-none')}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  {...register('isActive')}
                  type="checkbox"
                  id="isActive"
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <label htmlFor="isActive" className="text-sm text-slate-300 cursor-pointer">Compte actif</label>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-surface-700">
                <Button type="button" variant="ghost" onClick={closeModal}>Annuler</Button>
                <Button type="submit" variant="primary" loading={isSubmitting}>
                  {editingId ? 'Enregistrer' : 'Ajouter le compte'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
