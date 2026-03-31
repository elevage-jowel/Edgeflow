'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import { Review } from '@/lib/types'
import { format } from 'date-fns'

export function useReviews(month?: Date) {
  const { user } = useAuthStore()
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    const params = month ? `?month=${format(month, 'yyyy-MM')}` : ''
    const res = await fetch(`/api/reviews${params}`)
    const data: Review[] = await res.json()
    setReviews(data)
    setIsLoading(false)
  }, [user, month])

  useEffect(() => { refetch() }, [refetch])

  const saveReview = useCallback(async (data: Omit<Review, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to save review')
    const review: Review = await res.json()
    setReviews(prev => {
      const idx = prev.findIndex(r => r.date === review.date && r.type === review.type)
      if (idx >= 0) { const u = [...prev]; u[idx] = review; return u }
      return [review, ...prev]
    })
    return review
  }, [])

  return { reviews, isLoading, saveReview, refetch }
}
