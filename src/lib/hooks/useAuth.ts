'use client'
import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import { getUserProfile } from '@/lib/firebase/auth'
import { useAuthStore } from '@/lib/stores/authStore'
import { seedDemoData } from '@/data/seed'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { col } from '@/lib/firebase/collections'

export function useAuthListener() {
  const { setUser, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      if (user) {
        const profile = await getUserProfile(user.uid)
        setProfile(profile)
        if (profile && !profile.seeded) {
          try {
            await seedDemoData(user.uid)
            await updateDoc(doc(db, col.user(user.uid)), { seeded: true })
            const updated = await getUserProfile(user.uid)
            setProfile(updated)
          } catch (e) {
            console.error('Seed failed:', e)
          }
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [setUser, setProfile, setLoading])
}

export function useAuth() {
  return useAuthStore()
}
