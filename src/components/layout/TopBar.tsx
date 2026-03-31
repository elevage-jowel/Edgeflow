'use client'
import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, Bell, LogOut, User, Settings, ChevronDown, TrendingUp } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { signOut } from 'next-auth/react'
import { useUIStore } from '@/lib/stores/uiStore'
import toast from 'react-hot-toast'
import Link from 'next/link'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/journal': 'Trade Journal',
  '/analytics': 'Analytics',
  '/goals': 'Goals',
  '/playbooks': 'Playbooks',
  '/backtest': 'Backtest',
  '/calendar': 'Calendar',
  '/import': 'Import Trades',
  '/settings': 'Settings',
}

function getTitle(pathname: string): string {
  for (const [key, val] of Object.entries(pageTitles)) {
    if (pathname === key || (key !== '/dashboard' && pathname.startsWith(key))) return val
  }
  return 'EdgeFlow'
}

export function TopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, userProfile } = useAuthStore()
  const { setMobileSidebar } = useUIStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/login')
      toast.success('Signed out successfully')
    } catch {
      toast.error('Sign out failed')
    }
  }

  const initials = (userProfile?.displayName ?? user?.email ?? user?.name ?? 'U')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <header className="h-14 bg-surface-800/80 backdrop-blur-sm border-b border-surface-500 flex items-center px-4 gap-4 shrink-0">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileSidebar(true)}
        className="lg:hidden text-slate-400 hover:text-white p-1"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      <h1 className="text-sm font-semibold text-white flex-1">{getTitle(pathname)}</h1>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button className="relative w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-surface-700 flex items-center justify-center transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-500 rounded-full" />
        </button>

        {/* Profile menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-surface-700 transition-all group"
          >
            <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center text-xs font-bold text-white">
              {initials}
            </div>
            <span className="text-sm text-slate-300 group-hover:text-white hidden sm:block max-w-24 truncate">
              {userProfile?.displayName ?? user?.name ?? user?.email?.split('@')[0] ?? 'Trader'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-surface-700 border border-surface-500 rounded-xl shadow-card overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-surface-500">
                <div className="text-sm font-medium text-white truncate">
                  {userProfile?.displayName ?? 'Trader'}
                </div>
                <div className="text-xs text-slate-500 truncate">{user?.email}</div>
              </div>
              <div className="py-1">
                <Link href="/settings" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-surface-600 transition-all">
                  <User className="w-4 h-4" /> Profile
                </Link>
                <Link href="/settings" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-surface-600 transition-all">
                  <Settings className="w-4 h-4" /> Settings
                </Link>
                <div className="border-t border-surface-500 mt-1 pt-1">
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
