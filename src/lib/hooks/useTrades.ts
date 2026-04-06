'use client'
import { useEffect, useCallback } from 'react'
import { collection, onSnapshot, orderBy, query, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { col } from '@/lib/firebase/collections'
import { useTradeStore } from '@/lib/stores/tradeStore'
import { useAuthStore } from '@/lib/stores/authStore'
import { Trade } from '@/lib/types'

export function useTradesSubscription() {
  const { user } = useAuthStore()
  const { setTrades, setLoading } = useTradeStore()

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const q = query(collection(db, col.trades(user.uid)), orderBy('entryDate', 'desc'))
    const unsub = onSnapshot(q, snap => {
      const trades = snap.docs.map(d => ({ id: d.id, ...d.data() } as Trade))
      setTrades(trades)
      setLoading(false)
    }, () => setLoading(false))
    return unsub
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
  const { user } = useAuthStore()
  const { upsertTrade, deleteTrade: removeFromStore } = useTradeStore()

  const createTrade = useCallback(async (data: Omit<Trade, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('Not authenticated')
    const id = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const trade: Trade = {
      ...data,
      id,
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await setDoc(doc(db, col.trade(user.uid, id)), trade)
    upsertTrade(trade)
    return trade
  }, [user, upsertTrade])

  const updateTrade = useCallback(async (id: string, data: Partial<Trade>) => {
    if (!user) throw new Error('Not authenticated')
    const updated = { ...data, updatedAt: new Date().toISOString() }
    await updateDoc(doc(db, col.trade(user.uid, id)), updated)
    const existing = useTradeStore.getState().trades.find(t => t.id === id)
    if (existing) upsertTrade({ ...existing, ...updated })
  }, [user, upsertTrade])

  const deleteTrade = useCallback(async (id: string) => {
    if (!user) throw new Error('Not authenticated')
    await deleteDoc(doc(db, col.trade(user.uid, id)))
    removeFromStore(id)
  }, [user, removeFromStore])

  return { createTrade, updateTrade, deleteTrade }
}
