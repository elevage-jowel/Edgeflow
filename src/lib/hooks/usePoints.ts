'use client'
import { useCallback } from 'react'
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { col } from '@/lib/firebase/collections'
import {
  Trade,
  SetupPlan,
  TradeVerification,
  UserPoints,
} from '@/lib/types'
import {
  verifyTrade,
  applyVerificationToPoints,
  defaultUserPoints,
} from '@/lib/scoring/planEngine'
import { useAuthStore } from '@/lib/stores/authStore'

export function usePoints() {
  const { user, userProfile, setProfile } = useAuthStore()

  const getPoints = useCallback(async (): Promise<UserPoints> => {
    if (!user) return defaultUserPoints()
    return userProfile?.points ?? defaultUserPoints()
  }, [user, userProfile])

  const getVerifications = useCallback(async (): Promise<TradeVerification[]> => {
    if (!user) return []
    const snap = await getDocs(collection(db, col.verifications(user.uid)))
    return snap.docs.map(d => d.data() as TradeVerification)
  }, [user])

  /**
   * Runs plan verification for a trade and saves everything to Firestore.
   * Returns the verification result so the UI can display the score card.
   */
  const runVerification = useCallback(async (
    trade: Trade,
    plan: SetupPlan,
    tradeType: 'live' | 'backtest'
  ): Promise<TradeVerification | null> => {
    if (!user) return null

    // Load current points and previous verifications
    const [currentPoints, allVerifications] = await Promise.all([
      getPoints(),
      getVerifications(),
    ])

    const verification = verifyTrade(trade, plan, tradeType, currentPoints.currentStreak)
    const newPoints = applyVerificationToPoints(currentPoints, verification, [
      ...allVerifications,
      verification,
    ])

    // Save verification
    await setDoc(doc(db, col.verification(user.uid, trade.id)), verification)

    // Save updated points to user profile
    const updatedProfile = { ...userProfile!, points: newPoints, updatedAt: new Date().toISOString() }
    await setDoc(doc(db, col.user(user.uid)), updatedProfile, { merge: true })
    setProfile(updatedProfile)

    return verification
  }, [user, userProfile, getPoints, getVerifications, setProfile])

  const getVerificationForTrade = useCallback(async (tradeId: string): Promise<TradeVerification | null> => {
    if (!user) return null
    const snap = await getDoc(doc(db, col.verification(user.uid, tradeId)))
    return snap.exists() ? (snap.data() as TradeVerification) : null
  }, [user])

  return {
    runVerification,
    getPoints,
    getVerificationForTrade,
    getVerifications,
  }
}
