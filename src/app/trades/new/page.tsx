import { TradeForm } from '@/components/trades/TradeForm'

export default function NewTradePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">New Trade</h1>
        <p className="text-sm text-slate-400">Record a trade manually</p>
      </div>
      <TradeForm />
    </div>
  )
}
