'use client'
import { useEffect, useCallback } from 'react'
import { useTradeStore } from '@/lib/stores/tradeStore'
import { useAuthStore } from '@/lib/stores/authStore'
import { Trade } from '@/lib/types'

export function useTradesSubscription() {
  const { user } = useAuthStore()
  const { setTrades, setLoading } = useTradeStore()

  useEffect(() => {
    if (!user) return
    setLoading(true)
    fetch('/api/trades')
      .then(r => r.json())
      .then((trades: Trade[]) => {
        setTrades(trades)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user, setTrades, setLoading])
}

export function useTrades() {
  const { trades, filters, isLoading } = useTradeStore()

  const filtered = trades.filter(t => {
    if (filters.search && !t.symbol.toLowerCase().includes(filters.search.toLowerCase()) && !t.notes.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.assetClass && filters.assetClass !== 'all' && t.assetClass !== filters.assetClass) return false
    if (filters.direction && filters.direction !== 'all' && t.direction !== filters.direction) return false
    if (filters.outcome && filters.outcome !== 'all') {
      if (filters.outcome === 'win' && (t.netPnl ?? 0) <= 0) return false
      if (filters.outcome === 'loss' && (t.netPnl ?? 0) >= 0) return false
      if (filters.outcome === 'breakeven' && (t.netPnl ?? 0) !== 0) return false
    }
    if (filters.strategy && t.strategy !== filters.strategy) return false
    if (filters.session && t.session !== filters.session) return false
    if (filters.dateFrom && t.entryDate < filters.dateFrom) return false
    if (filters.dateTo && t.entryDate > filters.dateTo) return false
    return true
  })

  return { trades: filtered, allTrades: trades, isLoading }
}

export function useTradeActions() {
  const { upsertTrade, deleteTrade: removeFromStore } = useTradeStore()

  const createTrade = useCallback(async (data: Omit<Trade, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const res = await fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to create trade')
    const trade: Trade = await res.json()
    upsertTrade(trade)
    return trade
  }, [upsertTrade])

  const updateTrade = useCallback(async (id: string, data: Partial<Trade>) => {
    const existing = useTradeStore.getState().trades.find(t => t.id === id)
    if (!existing) throw new Error('Trade not found')
    const res = await fetch(`/api/trades/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...existing, ...data }),
    })
    if (!res.ok) throw new Error('Failed to update trade')
    const trade: Trade = await res.json()
    upsertTrade(trade)
  }, [upsertTrade])

  const deleteTrade = useCallback(async (id: string) => {
    const res = await fetch(`/api/trades/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete trade')
    removeFromStore(id)
  }, [removeFromStore])

  return { createTrade, updateTrade, deleteTrade }
}
