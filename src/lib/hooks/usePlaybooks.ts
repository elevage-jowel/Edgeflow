'use client'
import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { col } from '@/lib/firebase/collections'
import { useAuthStore } from '@/lib/stores/authStore'
import { Playbook } from '@/lib/types'

export function usePlaybooks() {
  const { user } = useAuthStore()
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    const q = query(collection(db, col.playbooks(user.uid)), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    setPlaybooks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Playbook)))
    setIsLoading(false)
  }, [user])

  useEffect(() => { refetch() }, [refetch])

  const createPlaybook = useCallback(async (data: Omit<Playbook, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('Not authenticated')
    const id = `playbook_${Date.now()}`
    const playbook: Playbook = { ...data, id, userId: user.uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    await setDoc(doc(db, col.playbook(user.uid, id)), playbook)
    setPlaybooks(prev => [playbook, ...prev])
    return playbook
  }, [user])

  const updatePlaybook = useCallback(async (id: string, data: Partial<Playbook>) => {
    if (!user) return
    await updateDoc(doc(db, col.playbook(user.uid, id)), { ...data, updatedAt: new Date().toISOString() })
    setPlaybooks(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))
  }, [user])

  const deletePlaybook = useCallback(async (id: string) => {
    if (!user) return
    await deleteDoc(doc(db, col.playbook(user.uid, id)))
    setPlaybooks(prev => prev.filter(p => p.id !== id))
  }, [user])

  return { playbooks, isLoading, createPlaybook, updatePlaybook, deletePlaybook, refetch }
}
