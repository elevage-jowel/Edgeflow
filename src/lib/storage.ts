// Local storage keys
const KEYS = {
  TRADES: 'edgeflow_trades',
  BACKTEST_SESSIONS: 'edgeflow_backtest_sessions',
  JOURNAL_ENTRIES: 'edgeflow_journal_entries',
  SETTINGS: 'edgeflow_settings',
  AUTH: 'edgeflow_auth',
  SYNC_QUEUE: 'edgeflow_sync_queue',
}

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    console.error(`[EdgeFlow] Failed to save ${key} to localStorage`)
  }
}

export const storage = {
  // Trades
  getTrades: () => getItem<import('../types').Trade[]>(KEYS.TRADES, []),
  setTrades: (trades: import('../types').Trade[]) => setItem(KEYS.TRADES, trades),

  // Backtest sessions
  getBacktestSessions: () =>
    getItem<import('../types').BacktestSession[]>(KEYS.BACKTEST_SESSIONS, []),
  setBacktestSessions: (sessions: import('../types').BacktestSession[]) =>
    setItem(KEYS.BACKTEST_SESSIONS, sessions),

  // Journal entries
  getJournalEntries: () =>
    getItem<import('../types').JournalEntry[]>(KEYS.JOURNAL_ENTRIES, []),
  setJournalEntries: (entries: import('../types').JournalEntry[]) =>
    setItem(KEYS.JOURNAL_ENTRIES, entries),

  // Settings
  getSettings: () =>
    getItem<Partial<import('../types').UserSettings>>(KEYS.SETTINGS, {}),
  setSettings: (settings: Partial<import('../types').UserSettings>) =>
    setItem(KEYS.SETTINGS, settings),

  // Auth (mock for offline mode)
  getAuth: () => getItem<{ user: import('../types').Profile | null }>(KEYS.AUTH, { user: null }),
  setAuth: (auth: { user: import('../types').Profile | null }) => setItem(KEYS.AUTH, auth),

  // Clear all (on logout)
  clear: () => {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k))
  },
}
