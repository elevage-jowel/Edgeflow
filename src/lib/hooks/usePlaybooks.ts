'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import { Playbook } from '@/lib/types'

export function usePlaybooks() {
  const { user } = useAuthStore()
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    const res = await fetch('/api/playbooks')
    const data: Playbook[] = await res.json()
    setPlaybooks(data)
    setIsLoading(false)
  }, [user])

  useEffect(() => { refetch() }, [refetch])

  const createPlaybook = useCallback(async (data: Omit<Playbook, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const res = await fetch('/api/playbooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to create playbook')
    const playbook: Playbook = await res.json()
    setPlaybooks(prev => [playbook, ...prev])
    return playbook
  }, [])

  const updatePlaybook = useCallback(async (id: string, data: Partial<Playbook>) => {
    const existing = playbooks.find(p => p.id === id)
    if (!existing) return
    const res = await fetch(`/api/playbooks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...existing, ...data }),
    })
    if (!res.ok) throw new Error('Failed to update playbook')
    const playbook: Playbook = await res.json()
    setPlaybooks(prev => prev.map(p => p.id === id ? playbook : p))
  }, [playbooks])

  const deletePlaybook = useCallback(async (id: string) => {
    const res = await fetch(`/api/playbooks/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete playbook')
    setPlaybooks(prev => prev.filter(p => p.id !== id))
  }, [])

  return { playbooks, isLoading, createPlaybook, updatePlaybook, deletePlaybook, refetch }
}
