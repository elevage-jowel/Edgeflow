'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { TradeSchema, TradeFormData } from '@/lib/validations'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { Trade } from '@/types'

interface Props {
  trade?: Trade
}

export function TradeForm({ trade }: Props) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TradeFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(TradeSchema) as any,
    defaultValues: trade
      ? {
          symbol: trade.symbol,
          direction: trade.direction,
          entryPrice: trade.entryPrice,
          exitPrice: trade.exitPrice,
          quantity: trade.quantity,
          entryDate: trade.entryDate.slice(0, 16),
          exitDate: trade.exitDate.slice(0, 16),
          pnl: trade.pnl,
          fees: trade.fees,
          commission: trade.commission,
          swap: trade.swap,
          setupType: trade.setupType ?? '',
          notes: trade.notes ?? '',
          tagIds: [],
        }
      : { direction: 'LONG', fees: 0, commission: 0, swap: 0, tagIds: [] },
  })

  const entryPrice = watch('entryPrice')
  const exitPrice = watch('exitPrice')
  const quantity = watch('quantity')
  const direction = watch('direction')

  const calcPnl = () => {
    if (!entryPrice || !exitPrice || !quantity) return
    const raw =
      direction === 'LONG'
        ? (exitPrice - entryPrice) * quantity
        : (entryPrice - exitPrice) * quantity
    setValue('pnl', Math.round(raw * 100) / 100)
  }

  const onSubmit = async (data: TradeFormData) => {
    const url = trade ? `/api/trades/${trade.id}` : '/api/trades'
    const method = trade ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      router.push('/trades')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Symbol"
          placeholder="EURUSD"
          error={errors.symbol?.message}
          {...register('symbol')}
        />
        <Select label="Direction" error={errors.direction?.message} {...register('direction')}>
          <option value="LONG">LONG</option>
          <option value="SHORT">SHORT</option>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Entry Price"
          type="number"
          step="any"
          error={errors.entryPrice?.message}
          {...register('entryPrice', { valueAsNumber: true, onBlur: calcPnl })}
        />
        <Input
          label="Exit Price"
          type="number"
          step="any"
          error={errors.exitPrice?.message}
          {...register('exitPrice', { valueAsNumber: true, onBlur: calcPnl })}
        />
        <Input
          label="Quantity"
          type="number"
          step="any"
          error={errors.quantity?.message}
          {...register('quantity', { valueAsNumber: true, onBlur: calcPnl })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Entry Date"
          type="datetime-local"
          error={errors.entryDate?.message}
          {...register('entryDate')}
        />
        <Input
          label="Exit Date"
          type="datetime-local"
          error={errors.exitDate?.message}
          {...register('exitDate')}
        />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Input
          label="P&L"
          type="number"
          step="any"
          error={errors.pnl?.message}
          {...register('pnl', { valueAsNumber: true })}
        />
        <Input label="Fees" type="number" step="any" {...register('fees', { valueAsNumber: true })} />
        <Input label="Commission" type="number" step="any" {...register('commission', { valueAsNumber: true })} />
        <Input label="Swap" type="number" step="any" {...register('swap', { valueAsNumber: true })} />
      </div>

      <Input label="Setup Type" placeholder="Breakout, Reversal..." {...register('setupType')} />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-300">Notes</label>
        <textarea
          className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-24 resize-y"
          placeholder="Trade rationale, observations..."
          {...register('notes')}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : trade ? 'Update Trade' : 'Add Trade'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
