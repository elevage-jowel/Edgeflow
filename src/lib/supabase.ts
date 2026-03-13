import { createClient } from '@supabase/supabase-js'
import type { Trade, BacktestSession, JournalEntry, UserSettings, Profile } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const isSupabaseConfigured =
  !!supabaseUrl && supabaseUrl !== 'https://your-project.supabase.co' &&
  !!supabaseAnonKey && supabaseAnonKey !== 'your-anon-key-here'

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// ─── Database Types ────────────────────────────────────────────────────────────
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at'>; Update: Partial<Profile> }
      trades: { Row: Trade; Insert: Omit<Trade, 'created_at'>; Update: Partial<Trade> }
      backtest_sessions: { Row: BacktestSession; Insert: Omit<BacktestSession, 'created_at' | 'updated_at'>; Update: Partial<BacktestSession> }
      journal_entries: { Row: JournalEntry; Insert: Omit<JournalEntry, 'created_at' | 'updated_at'>; Update: Partial<JournalEntry> }
      settings: { Row: UserSettings; Insert: Omit<UserSettings, 'created_at' | 'updated_at'>; Update: Partial<UserSettings> }
    }
  }
}

// ─── Supabase SQL Schema (for reference) ──────────────────────────────────────
export const SCHEMA_SQL = `
-- profiles
create table profiles (
  id uuid references auth.users primary key,
  email text not null,
  username text not null,
  role text not null default 'trader' check (role in ('admin', 'trader')),
  avatar_url text,
  created_at timestamptz default now()
);

-- trades
create table trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  symbol text not null,
  type text not null check (type in ('buy', 'sell')),
  entry_price numeric not null,
  exit_price numeric not null,
  quantity numeric not null,
  stop_loss numeric,
  take_profit numeric,
  pnl numeric not null,
  r_multiple numeric,
  status text not null check (status in ('win', 'loss', 'breakeven')),
  strategy text,
  timeframe text,
  emotion_before text,
  emotion_after text,
  notes text,
  screenshot_url text,
  entry_date timestamptz not null,
  exit_date timestamptz not null,
  backtest_session_id uuid references backtest_sessions(id) on delete set null,
  created_at timestamptz default now()
);

-- backtest_sessions
create table backtest_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  strategy text not null,
  description text,
  symbol text not null,
  timeframe text not null,
  start_date date not null,
  end_date date not null,
  initial_balance numeric not null,
  status text not null check (status in ('running', 'completed', 'paused')),
  total_trades integer default 0,
  win_rate numeric default 0,
  profit_factor numeric default 0,
  total_pnl numeric default 0,
  max_drawdown numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- journal_entries
create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  date date not null,
  title text,
  content text not null,
  mood integer not null check (mood between 1 and 5),
  goals text,
  lessons text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- settings
create table settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade unique,
  currency text not null default 'USD',
  initial_balance numeric not null default 10000,
  current_balance numeric not null default 10000,
  language text not null default 'en' check (language in ('fr', 'en')),
  theme text not null default 'dark',
  risk_per_trade numeric not null default 1,
  default_risk_reward numeric not null default 2,
  notifications_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table profiles enable row level security;
alter table trades enable row level security;
alter table backtest_sessions enable row level security;
alter table journal_entries enable row level security;
alter table settings enable row level security;

-- RLS Policies (users can only see their own data)
create policy "Users view own profile" on profiles for select using (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
create policy "Users manage own trades" on trades for all using (auth.uid() = user_id);
create policy "Users manage own sessions" on backtest_sessions for all using (auth.uid() = user_id);
create policy "Users manage own journal" on journal_entries for all using (auth.uid() = user_id);
create policy "Users manage own settings" on settings for all using (auth.uid() = user_id);
`
