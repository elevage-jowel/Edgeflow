'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import { Goal } from '@/lib/types'

export function useGoals() {
  const { user } = useAuthStore()
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    const res = await fetch('/api/goals')
    const data: Goal[] = await res.json()
    setGoals(data)
    setIsLoading(false)
  }, [user])

  useEffect(() => { refetch() }, [refetch])

  const createGoal = useCallback(async (data: Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to create goal')
    const goal: Goal = await res.json()
    setGoals(prev => [goal, ...prev])
    return goal
  }, [])

  const updateGoal = useCallback(async (id: string, data: Partial<Goal>) => {
    const existing = goals.find(g => g.id === id)
    if (!existing) return
    const res = await fetch(`/api/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...existing, ...data }),
    })
    if (!res.ok) throw new Error('Failed to update goal')
    const goal: Goal = await res.json()
    setGoals(prev => prev.map(g => g.id === id ? goal : g))
  }, [goals])

  const deleteGoal = useCallback(async (id: string) => {
    const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete goal')
    setGoals(prev => prev.filter(g => g.id !== id))
  }, [])

  return { goals, isLoading, createGoal, updateGoal, deleteGoal, refetch }
}
