'use client'
import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { col } from '@/lib/firebase/collections'
import { useAuthStore } from '@/lib/stores/authStore'
import { Goal } from '@/lib/types'

export function useGoals() {
  const { user } = useAuthStore()
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    const q = query(collection(db, col.goals(user.uid)), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Goal)))
    setIsLoading(false)
  }, [user])

  useEffect(() => { refetch() }, [refetch])

  const createGoal = useCallback(async (data: Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('Not authenticated')
    const id = `goal_${Date.now()}`
    const goal: Goal = { ...data, id, userId: user.uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    await setDoc(doc(db, col.goal(user.uid, id)), goal)
    setGoals(prev => [goal, ...prev])
    return goal
  }, [user])

  const updateGoal = useCallback(async (id: string, data: Partial<Goal>) => {
    if (!user) return
    await updateDoc(doc(db, col.goal(user.uid, id)), { ...data, updatedAt: new Date().toISOString() })
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...data } : g))
  }, [user])

  const deleteGoal = useCallback(async (id: string) => {
    if (!user) return
    await deleteDoc(doc(db, col.goal(user.uid, id)))
    setGoals(prev => prev.filter(g => g.id !== id))
  }, [user])

  return { goals, isLoading, createGoal, updateGoal, deleteGoal, refetch }
}
