'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTradeActions } from '@/lib/hooks/useTrades'
import { Trade } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

const schema = z.object({
  symbol: z.string().min(1, 'Symbol required').toUpperCase(),
  assetClass: z.enum(['stocks', 'options', 'futures', 'forex', 'crypto']),
  direction: z.enum(['long', 'short']),
  status: z.enum(['open', 'closed', 'partial']),
  entryDate: z.string().min(1, 'Entry date required'),
  exitDate: z.string().optional(),
  entryPrice: z.coerce.number().positive('Must be positive'),
  exitPrice: z.coerce.number().positive().optional().or(z.literal('')),
  quantity: z.coerce.number().positive('Must be positive'),
  commission: z.coerce.number().min(0).default(0),
  stopLoss: z.coerce.number().positive().optional().or(z.literal('')),
  takeProfit: z.coerce.number().positive().optional().or(z.literal('')),
  strategy: z.string().optional(),
  session: z.string().optional(),
  tags: z.string().optional(),
  notes: z.string().optional(),
  setupRating: z.coerce.number().min(1).max(5).optional().or(z.literal('')),
  executionRating: z.coerce.number().min(1).max(5).optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

interface TradeFormProps {
  trade?: Trade
  onClose: () => void
}

const sessions = ['NYSE Open', 'NYSE Mid', 'NYSE Afternoon', 'Futures Open', 'Futures Afternoon', 'London Open', 'Asian', 'Crypto 24h']
const strategies = ['Momentum Breakout', 'Trend Follow', 'Opening Range Breakout', 'VWAP Rejection', 'Support Bounce', 'Options Flow', 'Mean Reversion']

function calcPnl(data: FormData) {
  if (!data.exitPrice || data.status === 'open') return { gross: undefined, net: undefined, r: undefined }
  const dir = data.direction === 'long' ? 1 : -1
  const gross = parseFloat(((Number(data.exitPrice) - data.entryPrice) * data.quantity * dir).toFixed(2))
  const net = parseFloat((gross - data.commission).toFixed(2))
  const risk = data.stopLoss ? Math.abs(data.entryPrice - Number(data.stopLoss)) * data.quantity : 0
  const r = risk > 0 ? parseFloat((net / risk).toFixed(2)) : undefined
  return { gross, net, r }
}

export function TradeForm({ trade, onClose }: TradeFormProps) {
  const { createTrade, updateTrade } = useTradeActions()

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: trade ? {
      symbol: trade.symbol,
      assetClass: trade.assetClass,
      direction: trade.direction,
      status: trade.status,
      entryDate: trade.entryDate.slice(0, 16),
      exitDate: trade.exitDate?.slice(0, 16) ?? '',
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice ?? '',
      quantity: trade.quantity,
      commission: trade.commission ?? 0,
      stopLoss: trade.stopLoss ?? '',
      takeProfit: trade.takeProfit ?? '',
      strategy: trade.strategy ?? '',
      session: trade.session ?? '',
      tags: trade.tags.join(', '),
      notes: trade.notes ?? '',
      setupRating: trade.setupRating ?? '',
      executionRating: trade.executionRating ?? '',
    } : {
      assetClass: 'stocks',
      direction: 'long',
      status: 'closed',
      commission: 5,
    },
  })

  const onSubmit = async (data: FormData) => {
    try {
      const { gross, net, r } = calcPnl(data)
      const payload: any = {
        symbol: data.symbol.toUpperCase(),
        assetClass: data.assetClass,
        direction: data.direction,
        status: data.status,
        entryDate: new Date(data.entryDate).toISOString(),
        exitDate: data.exitDate ? new Date(data.exitDate).toISOString() : undefined,
        entryPrice: data.entryPrice,
        exitPrice: data.exitPrice ? Number(data.exitPrice) : undefined,
        quantity: data.quantity,
        commission: data.commission,
        stopLoss: data.stopLoss ? Number(data.stopLoss) : undefined,
        takeProfit: data.takeProfit ? Number(data.takeProfit) : undefined,
        grossPnl: gross,
        netPnl: net,
        rMultiple: r,
        strategy: data.strategy || undefined,
        session: data.session || undefined,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        notes: data.notes || '',
        screenshotUrls: trade?.screenshotUrls ?? [],
        setupRating: data.setupRating ? Number(data.setupRating) : undefined,
        executionRating: data.executionRating ? Number(data.executionRating) : undefined,
        outcome: net !== undefined ? (net > 0 ? 'win' : net < 0 ? 'loss' : 'breakeven') : undefined,
      }

      if (trade) {
        await updateTrade(trade.id, payload)
        toast.success('Trade updated')
      } else {
        await createTrade(payload)
        toast.success('Trade added')
      }
      onClose()
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save trade')
    }
  }

  const inputCls = "w-full px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
  const labelCls = "block text-xs font-medium text-slate-400 mb-1"
  const errorCls = "text-red-400 text-xs mt-1"

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
      {/* Row 1 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Symbol *</label>
          <input {...register('symbol')} placeholder="NVDA" className={inputCls} />
          {errors.symbol && <p className={errorCls}>{errors.symbol.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Asset Class *</label>
          <select {...register('assetClass')} className={inputCls}>
            <option value="stocks">Stocks</option>
            <option value="options">Options</option>
            <option value="futures">Futures</option>
            <option value="forex">Forex</option>
            <option value="crypto">Crypto</option>
          </select>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Direction *</label>
          <select {...register('direction')} className={inputCls}>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Status *</label>
          <select {...register('status')} className={inputCls}>
            <option value="closed">Closed</option>
            <option value="open">Open</option>
            <option value="partial">Partial</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Quantity *</label>
          <input {...register('quantity')} type="number" step="any" placeholder="100" className={inputCls} />
          {errors.quantity && <p className={errorCls}>{errors.quantity.message}</p>}
        </div>
      </div>

      {/* Row 3 - dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Entry Date *</label>
          <input {...register('entryDate')} type="datetime-local" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Exit Date</label>
          <input {...register('exitDate')} type="datetime-local" className={inputCls} />
        </div>
      </div>

      {/* Row 4 - prices */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className={labelCls}>Entry Price *</label>
          <input {...register('entryPrice')} type="number" step="any" placeholder="100.00" className={inputCls} />
          {errors.entryPrice && <p className={errorCls}>{errors.entryPrice.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Exit Price</label>
          <input {...register('exitPrice')} type="number" step="any" placeholder="105.00" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Stop Loss</label>
          <input {...register('stopLoss')} type="number" step="any" placeholder="95.00" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Take Profit</label>
          <input {...register('takeProfit')} type="number" step="any" placeholder="115.00" className={inputCls} />
        </div>
      </div>

      {/* Row 5 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Strategy</label>
          <select {...register('strategy')} className={inputCls}>
            <option value="">Select strategy</option>
            {strategies.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Session</label>
          <select {...register('session')} className={inputCls}>
            <option value="">Select session</option>
            {sessions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Commission ($)</label>
          <input {...register('commission')} type="number" step="any" placeholder="5.00" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Tags (comma separated)</label>
          <input {...register('tags')} placeholder="momentum, breakout, tech" className={inputCls} />
        </div>
      </div>

      {/* Ratings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Setup Rating (1–5)</label>
          <input {...register('setupRating')} type="number" min="1" max="5" placeholder="5" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Execution Rating (1–5)</label>
          <input {...register('executionRating')} type="number" min="1" max="5" placeholder="4" className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Notes</label>
        <textarea {...register('notes')} rows={3} placeholder="Describe the trade, what you saw, how you managed it..."
          className={`${inputCls} resize-none`} />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {trade ? 'Update Trade' : 'Add Trade'}
        </Button>
      </div>
    </form>
  )
}
