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
import { DEMO_MODE } from '@/lib/demo'

const DEMO_VERIF_KEY = 'edgeflow_demo_verifications'

function getDemoVerifications(): TradeVerification[] {
  try { const s = localStorage.getItem(DEMO_VERIF_KEY); if (s) return JSON.parse(s) } catch {}
  return []
}

export function usePoints() {
  const { user, userProfile, setProfile } = useAuthStore()

  const getPoints = useCallback(async (): Promise<UserPoints> => {
    if (!user) return defaultUserPoints()
    return userProfile?.points ?? defaultUserPoints()
  }, [user, userProfile])

  const getVerifications = useCallback(async (): Promise<TradeVerification[]> => {
    if (DEMO_MODE) return getDemoVerifications()
    if (!user) return []
    const snap = await getDocs(collection(db, col.verifications(user.uid)))
    return snap.docs.map(d => d.data() as TradeVerification)
  }, [user])

  /**
   * Runs plan verification for a trade and saves everything to Firestore (or localStorage in demo).
   */
  const runVerification = useCallback(async (
    trade: Trade,
    plan: SetupPlan,
    tradeType: 'live' | 'backtest'
  ): Promise<TradeVerification | null> => {
    if (!DEMO_MODE && !user) return null

    const [currentPoints, allVerifications] = await Promise.all([
      getPoints(),
      getVerifications(),
    ])

    const verification = verifyTrade(trade, plan, tradeType, currentPoints.currentStreak)
    const newPoints = applyVerificationToPoints(currentPoints, verification, [
      ...allVerifications,
      verification,
    ])

    if (DEMO_MODE) {
      // Save to localStorage
      const prev = getDemoVerifications().filter(v => v.tradeId !== trade.id)
      localStorage.setItem(DEMO_VERIF_KEY, JSON.stringify([...prev, verification]))
      const updatedProfile = { ...userProfile!, points: newPoints, updatedAt: new Date().toISOString() }
      setProfile(updatedProfile)
    } else {
      await setDoc(doc(db, col.verification(user!.uid, trade.id)), verification)
      const updatedProfile = { ...userProfile!, points: newPoints, updatedAt: new Date().toISOString() }
      await setDoc(doc(db, col.user(user!.uid)), updatedProfile, { merge: true })
      setProfile(updatedProfile)
    }

    return verification
  }, [user, userProfile, getPoints, getVerifications, setProfile])

  const getVerificationForTrade = useCallback(async (tradeId: string): Promise<TradeVerification | null> => {
    if (DEMO_MODE) return getDemoVerifications().find(v => v.tradeId === tradeId) ?? null
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
