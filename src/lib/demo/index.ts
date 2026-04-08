import { getSeedTrades } from '@/data/seedTrades'
import { Trade, UserProfile } from '@/lib/types'
import { defaultUserPoints } from '@/lib/scoring/planEngine'

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO === 'true'

export const DEMO_UID = 'demo_user_001'

// Fake Firebase User-like object
export const DEMO_USER = {
  uid: DEMO_UID,
  email: 'demo@edgeflow.app',
  displayName: 'Demo Trader',
  emailVerified: true,
  isAnonymous: false,
  providerData: [],
  metadata: {},
  tenantId: null,
  phoneNumber: null,
  photoURL: null,
  providerId: 'demo',
  refreshToken: '',
  delete: async () => {},
  getIdToken: async () => 'demo_token',
  getIdTokenResult: async () => ({} as any),
  reload: async () => {},
  toJSON: () => ({}),
}

export const DEMO_PROFILE: UserProfile = {
  uid: DEMO_UID,
  email: 'demo@edgeflow.app',
  displayName: 'Demo Trader',
  currency: 'USD',
  timezone: 'Europe/Paris',
  riskUnit: 'dollar',
  seeded: true,
  createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
  points: defaultUserPoints(),
}

const DEMO_TRADES_KEY = 'edgeflow_demo_trades'

export function getDemoTrades(): Trade[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(DEMO_TRADES_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  // First time: generate seed trades with real IDs
  const seed = getSeedTrades(DEMO_UID).map((t, i) => ({
    ...t,
    id: `demo_trade_${i + 1}`,
  })) as Trade[]
  saveDemoTrades(seed)
  return seed
}

export function saveDemoTrades(trades: Trade[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(DEMO_TRADES_KEY, JSON.stringify(trades))
}

export function clearDemoTrades() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DEMO_TRADES_KEY)
}
