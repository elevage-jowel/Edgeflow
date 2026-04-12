import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storage } from '../lib/storage'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { generateId } from '../lib/stats'
import type {
  Trade,
  BacktestSession,
  JournalEntry,
  UserSettings,
  Profile,
  SyncStatus,
  Currency,
  AppLanguage,
  AppTheme,
  MoodLevel,
} from '../types'

interface StoreState {
  // Auth
  user: Profile | null
  isAuthenticated: boolean
  isOfflineMode: boolean

  // Data
  trades: Trade[]
  backtestSessions: BacktestSession[]
  journalEntries: JournalEntry[]
  settings: Partial<UserSettings>

  // UI
  syncStatus: SyncStatus
  isLoading: boolean

  // Auth actions
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string) => Promise<void>
  logout: () => Promise<void>
  continueOffline: () => void

  // Trade actions
  addTrade: (trade: Omit<Trade, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  updateTrade: (id: string, updates: Partial<Trade>) => Promise<void>
  deleteTrade: (id: string) => Promise<void>
  clearAllTrades: () => Promise<void>

  // Backtest actions
  addBacktestSession: (session: Omit<BacktestSession, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateBacktestSession: (id: string, updates: Partial<BacktestSession>) => Promise<void>
  deleteBacktestSession: (id: string) => Promise<void>

  // Journal actions
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => Promise<void>
  deleteJournalEntry: (id: string) => Promise<void>

  // Settings actions
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>

  // Sync
  syncWithCloud: () => Promise<void>
}

const DEFAULT_SETTINGS: Partial<UserSettings> = {
  currency: 'USD',
  initial_balance: 10000,
  current_balance: 10000,
  language: 'en',
  theme: 'dark',
  risk_per_trade: 1,
  default_risk_reward: 2,
  notifications_enabled: true,
}

const DEMO_USER_ID = 'local-user'

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isOfflineMode: false,
      trades: [],
      backtestSessions: [],
      journalEntries: [],
      settings: DEFAULT_SETTINGS,
      syncStatus: 'local',
      isLoading: false,

      // ─── Auth ──────────────────────────────────────────────────────────────
      login: async (email, password) => {
        set({ isLoading: true })
        try {
          if (isSupabaseConfigured && supabase) {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) throw error

            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single()

            set({ user: profile, isAuthenticated: true, isOfflineMode: false })
            await get().syncWithCloud()
          } else {
            // Mock login for offline mode
            const user: Profile = {
              id: DEMO_USER_ID,
              email,
              username: email.split('@')[0],
              role: 'trader',
              created_at: new Date().toISOString(),
            }
            set({ user, isAuthenticated: true, isOfflineMode: true, syncStatus: 'local' })
          }
        } finally {
          set({ isLoading: false })
        }
      },

      register: async (email, password, username) => {
        set({ isLoading: true })
        try {
          if (isSupabaseConfigured && supabase) {
            const { data, error } = await supabase.auth.signUp({ email, password })
            if (error) throw error

            if (data.user) {
              await supabase.from('profiles').insert({
                id: data.user.id,
                email,
                username,
                role: 'trader',
              })
              await supabase.from('settings').insert({
                id: generateId(),
                user_id: data.user.id,
                ...DEFAULT_SETTINGS,
              })
            }
            const user: Profile = {
              id: data.user!.id,
              email,
              username,
              role: 'trader',
              created_at: new Date().toISOString(),
            }
            set({ user, isAuthenticated: true, isOfflineMode: false })
          } else {
            const user: Profile = {
              id: DEMO_USER_ID,
              email,
              username,
              role: 'trader',
              created_at: new Date().toISOString(),
            }
            set({ user, isAuthenticated: true, isOfflineMode: true, syncStatus: 'local' })
          }
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        if (isSupabaseConfigured && supabase) {
          await supabase.auth.signOut()
        }
        storage.clear()
        set({
          user: null,
          isAuthenticated: false,
          isOfflineMode: false,
          trades: [],
          backtestSessions: [],
          journalEntries: [],
          settings: DEFAULT_SETTINGS,
          syncStatus: 'local',
        })
      },

      continueOffline: () => {
        const user: Profile = {
          id: DEMO_USER_ID,
          email: 'local@edgeflow.app',
          username: 'Trader',
          role: 'trader',
          created_at: new Date().toISOString(),
        }
        set({ user, isAuthenticated: true, isOfflineMode: true, syncStatus: 'local' })
      },

      // ─── Trades ────────────────────────────────────────────────────────────
      addTrade: async (tradeData) => {
        const { user } = get()
        const trade: Trade = {
          ...tradeData,
          id: generateId(),
          user_id: user?.id ?? DEMO_USER_ID,
          created_at: new Date().toISOString(),
        }
        set(s => ({ trades: [trade, ...s.trades] }))

        if (isSupabaseConfigured && supabase && !get().isOfflineMode) {
          try {
            set({ syncStatus: 'syncing' })
            await supabase.from('trades').insert(trade)
            set({ syncStatus: 'synced' })
          } catch {
            set({ syncStatus: 'error' })
          }
        }
      },

      updateTrade: async (id, updates) => {
        set(s => ({
          trades: s.trades.map(t => t.id === id ? { ...t, ...updates } : t),
        }))

        if (isSupabaseConfigured && supabase && !get().isOfflineMode) {
          try {
            set({ syncStatus: 'syncing' })
            await supabase.from('trades').update(updates).eq('id', id)
            set({ syncStatus: 'synced' })
          } catch {
            set({ syncStatus: 'error' })
          }
        }
      },

      deleteTrade: async (id) => {
        set(s => ({ trades: s.trades.filter(t => t.id !== id) }))

        if (isSupabaseConfigured && supabase && !get().isOfflineMode) {
          try {
            await supabase.from('trades').delete().eq('id', id)
          } catch {
            set({ syncStatus: 'error' })
          }
        }
      },

      clearAllTrades: async () => {
        const { user } = get()
        set({ trades: [] })

        if (isSupabaseConfigured && supabase && !get().isOfflineMode && user) {
          try {
            await supabase.from('trades').delete().eq('user_id', user.id)
          } catch {
            set({ syncStatus: 'error' })
          }
        }
      },

      // ─── Backtest ──────────────────────────────────────────────────────────
      addBacktestSession: async (sessionData) => {
        const { user } = get()
        const session: BacktestSession = {
          ...sessionData,
          id: generateId(),
          user_id: user?.id ?? DEMO_USER_ID,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        set(s => ({ backtestSessions: [session, ...s.backtestSessions] }))

        if (isSupabaseConfigured && supabase && !get().isOfflineMode) {
          try {
            set({ syncStatus: 'syncing' })
            await supabase.from('backtest_sessions').insert(session)
            set({ syncStatus: 'synced' })
          } catch {
            set({ syncStatus: 'error' })
          }
        }
      },

      updateBacktestSession: async (id, updates) => {
        const updated = { ...updates, updated_at: new Date().toISOString() }
        set(s => ({
          backtestSessions: s.backtestSessions.map(s =>
            s.id === id ? { ...s, ...updated } : s
          ),
        }))

        if (isSupabaseConfigured && supabase && !get().isOfflineMode) {
          try {
            await supabase.from('backtest_sessions').update(updated).eq('id', id)
          } catch {
            set({ syncStatus: 'error' })
          }
        }
      },

      deleteBacktestSession: async (id) => {
        set(s => ({
          backtestSessions: s.backtestSessions.filter(s => s.id !== id),
          trades: s.trades.filter(t => t.backtest_session_id !== id),
        }))

        if (isSupabaseConfigured && supabase && !get().isOfflineMode) {
          try {
            await supabase.from('backtest_sessions').delete().eq('id', id)
          } catch {
            set({ syncStatus: 'error' })
          }
        }
      },

      // ─── Journal ───────────────────────────────────────────────────────────
      addJournalEntry: async (entryData) => {
        const { user } = get()
        const entry: JournalEntry = {
          ...entryData,
          id: generateId(),
          user_id: user?.id ?? DEMO_USER_ID,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        set(s => ({ journalEntries: [entry, ...s.journalEntries] }))

        if (isSupabaseConfigured && supabase && !get().isOfflineMode) {
          try {
            set({ syncStatus: 'syncing' })
            await supabase.from('journal_entries').insert(entry)
            set({ syncStatus: 'synced' })
          } catch {
            set({ syncStatus: 'error' })
          }
        }
      },

      updateJournalEntry: async (id, updates) => {
        const updated = { ...updates, updated_at: new Date().toISOString() }
        set(s => ({
          journalEntries: s.journalEntries.map(e => e.id === id ? { ...e, ...updated } : e),
        }))

        if (isSupabaseConfigured && supabase && !get().isOfflineMode) {
          try {
            await supabase.from('journal_entries').update(updated).eq('id', id)
          } catch {
            set({ syncStatus: 'error' })
          }
        }
      },

      deleteJournalEntry: async (id) => {
        set(s => ({ journalEntries: s.journalEntries.filter(e => e.id !== id) }))

        if (isSupabaseConfigured && supabase && !get().isOfflineMode) {
          try {
            await supabase.from('journal_entries').delete().eq('id', id)
          } catch {
            set({ syncStatus: 'error' })
          }
        }
      },

      // ─── Settings ──────────────────────────────────────────────────────────
      updateSettings: async (updates) => {
        set(s => ({ settings: { ...s.settings, ...updates } }))

        if (isSupabaseConfigured && supabase && !get().isOfflineMode) {
          const { user } = get()
          if (user) {
            try {
              await supabase
                .from('settings')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('user_id', user.id)
            } catch {
              set({ syncStatus: 'error' })
            }
          }
        }
      },

      // ─── Sync ──────────────────────────────────────────────────────────────
      syncWithCloud: async () => {
        if (!isSupabaseConfigured || !supabase) {
          set({ syncStatus: 'local' })
          return
        }

        const { user } = get()
        if (!user) return

        set({ syncStatus: 'syncing' })
        try {
          const [tradesRes, sessionsRes, entriesRes, settingsRes] = await Promise.all([
            supabase.from('trades').select('*').eq('user_id', user.id),
            supabase.from('backtest_sessions').select('*').eq('user_id', user.id),
            supabase.from('journal_entries').select('*').eq('user_id', user.id),
            supabase.from('settings').select('*').eq('user_id', user.id).single(),
          ])

          set({
            trades: tradesRes.data ?? [],
            backtestSessions: sessionsRes.data ?? [],
            journalEntries: entriesRes.data ?? [],
            settings: settingsRes.data ?? DEFAULT_SETTINGS,
            syncStatus: 'synced',
          })
        } catch {
          set({ syncStatus: 'error' })
        }
      },
    }),
    {
      name: 'edgeflow_store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isOfflineMode: state.isOfflineMode,
        trades: state.trades,
        backtestSessions: state.backtestSessions,
        journalEntries: state.journalEntries,
        settings: state.settings,
      }),
    }
  )
)
