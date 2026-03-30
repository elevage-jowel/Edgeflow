import { create } from 'zustand'
import { Trade, TradeFilters } from '@/lib/types'

interface TradeState {
  trades: Trade[]
  selectedTradeId: string | null
  filters: TradeFilters
  isLoading: boolean
  setTrades: (trades: Trade[]) => void
  upsertTrade: (trade: Trade) => void
  deleteTrade: (id: string) => void
  setSelectedTrade: (id: string | null) => void
  setFilters: (filters: Partial<TradeFilters>) => void
  resetFilters: () => void
  setLoading: (loading: boolean) => void
}

const defaultFilters: TradeFilters = {
  search: '',
  assetClass: 'all',
  direction: 'all',
  outcome: 'all',
}

export const useTradeStore = create<TradeState>((set) => ({
  trades: [],
  selectedTradeId: null,
  filters: defaultFilters,
  isLoading: false,
  setTrades: (trades) => set({ trades }),
  upsertTrade: (trade) => set(state => {
    const idx = state.trades.findIndex(t => t.id === trade.id)
    if (idx >= 0) {
      const updated = [...state.trades]
      updated[idx] = trade
      return { trades: updated }
    }
    return { trades: [trade, ...state.trades] }
  }),
  deleteTrade: (id) => set(state => ({ trades: state.trades.filter(t => t.id !== id) })),
  setSelectedTrade: (selectedTradeId) => set({ selectedTradeId }),
  setFilters: (filters) => set(state => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: defaultFilters }),
  setLoading: (isLoading) => set({ isLoading }),
}))
