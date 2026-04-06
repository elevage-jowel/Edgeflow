'use client'
import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { col } from '@/lib/firebase/collections'
import { SetupPlan } from '@/lib/types'
import { DEFAULT_PLANS } from '@/lib/scoring/defaultPlans'
import { useAuthStore } from '@/lib/stores/authStore'

export function useSetupPlans() {
  const { user } = useAuthStore()
  const [plans, setPlans] = useState<SetupPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const seedDefaultPlans = useCallback(async (uid: string) => {
    const batch = DEFAULT_PLANS.map(p => {
      const plan: SetupPlan = { ...p, userId: uid }
      return setDoc(doc(db, col.setupPlan(uid, p.id)), plan)
    })
    await Promise.all(batch)
    return DEFAULT_PLANS.map(p => ({ ...p, userId: uid }))
  }, [])

  const load = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const q = query(collection(db, col.setupPlans(user.uid)), orderBy('name'))
      const snap = await getDocs(q)
      let loaded = snap.docs.map(d => d.data() as SetupPlan)
      if (loaded.length === 0) {
        loaded = await seedDefaultPlans(user.uid)
      }
      setPlans(loaded)
    } finally {
      setIsLoading(false)
    }
  }, [user, seedDefaultPlans])

  useEffect(() => { load() }, [load])

  const savePlan = async (plan: SetupPlan) => {
    if (!user) return
    await setDoc(doc(db, col.setupPlan(user.uid, plan.id)), {
      ...plan,
      updatedAt: new Date().toISOString(),
    })
    setPlans(prev => {
      const idx = prev.findIndex(p => p.id === plan.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = plan; return next }
      return [...prev, plan]
    })
  }

  const deletePlan = async (planId: string) => {
    if (!user) return
    await deleteDoc(doc(db, col.setupPlan(user.uid, planId)))
    setPlans(prev => prev.filter(p => p.id !== planId))
  }

  const resetToDefaults = async () => {
    if (!user) return
    const seeded = await seedDefaultPlans(user.uid)
    setPlans(seeded)
  }

  return { plans, isLoading, savePlan, deletePlan, resetToDefaults, reload: load }
}
