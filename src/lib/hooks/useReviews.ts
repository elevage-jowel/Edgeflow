'use client'
import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { col } from '@/lib/firebase/collections'
import { useAuthStore } from '@/lib/stores/authStore'
import { Review } from '@/lib/types'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export function useReviews(month?: Date) {
  const { user } = useAuthStore()
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    const ref = collection(db, col.reviews(user.uid))
    let q
    if (month) {
      const from = format(startOfMonth(month), 'yyyy-MM-dd')
      const to = format(endOfMonth(month), 'yyyy-MM-dd')
      q = query(ref, where('date', '>=', from), where('date', '<=', to), orderBy('date', 'desc'))
    } else {
      q = query(ref, orderBy('date', 'desc'))
    }
    const snap = await getDocs(q)
    setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() } as Review)))
    setIsLoading(false)
  }, [user, month])

  useEffect(() => { fetch() }, [fetch])

  const saveReview = useCallback(async (data: Omit<Review, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('Not authenticated')
    const id = `review_${data.date}_${data.type}`
    const review: Review = { ...data, id, userId: user.uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    await setDoc(doc(db, col.review(user.uid, id)), review, { merge: true })
    setReviews(prev => {
      const idx = prev.findIndex(r => r.id === id)
      if (idx >= 0) { const u = [...prev]; u[idx] = review; return u }
      return [review, ...prev]
    })
    return review
  }, [user])

  return { reviews, isLoading, saveReview, refetch: fetch }
}
