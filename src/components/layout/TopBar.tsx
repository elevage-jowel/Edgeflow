'use client'
import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, LogOut, User, Settings, ChevronDown, Search } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { signOut } from '@/lib/firebase/auth'
import { useUIStore } from '@/lib/stores/uiStore'
import toast from 'react-hot-toast'
import Link from 'next/link'

const pageInfo: Record<string, { title: string; sub: string }> = {
  '/dashboard':  { title: 'Tableau de bord',  sub: 'Vue d\'ensemble de ta performance' },
  '/journal':    { title: 'Journal',           sub: 'Tous tes trades enregistrés'       },
  '/analytics':  { title: 'Analytiques',       sub: 'Analyse approfondie de ta performance' },
  '/goals':      { title: 'Objectifs',         sub: 'Tes cibles de trading actives'     },
  '/playbooks':  { title: 'Playbooks',         sub: 'Tes setups documentés'             },
  '/backtest':   { title: 'Backtest',          sub: 'Teste tes stratégies sur l\'historique' },
  '/calendar':   { title: 'Calendrier',        sub: 'Revue journalière et suivi mensuel' },
  '/import':     { title: 'Importer',          sub: 'Importe des trades depuis CSV ou courtier' },
  '/planner':    { title: 'Planificateur',     sub: 'Prépare ta journée de trading'     },
  '/propfirm':   { title: 'Prop Firm',         sub: 'Suivi de tes comptes prop firm'    },
  '/settings':   { title: 'Paramètres',        sub: 'Compte, Notion, préférences'       },
}

function getPageInfo(pathname: string) {
  for (const [key, val] of Object.entries(pageInfo)) {
    if (pathname === key || (key !== '/dashboard' && pathname.startsWith(key))) return val
  }
  return { title: 'EdgeFlow', sub: '' }
}

export function TopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, userProfile } = useAuthStore()
  const { setMobileSidebar, setCmdPalette } = useUIStore()
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
      toast.success('À bientôt !')
    } catch {
      toast.error('Erreur de déconnexion')
    }
  }

  const initials = (userProfile?.displayName ?? user?.email ?? 'U')
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const { title, sub } = getPageInfo(pathname)

  return (
    <header className="h-14 bg-surface-800/80 backdrop-blur-sm border-b border-surface-500/70 flex items-center px-4 gap-4 shrink-0">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileSidebar(true)}
        className="lg:hidden text-slate-400 hover:text-white p-1 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <h1 className="text-sm font-semibold text-white truncate">{title}</h1>
          {sub && <span className="text-xs text-slate-600 truncate hidden sm:block">{sub}</span>}
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Cmd+K search trigger */}
        <button
          onClick={() => setCmdPalette(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-700/60 border border-surface-500/60 hover:border-surface-400 text-slate-500 hover:text-slate-300 text-xs transition-all"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:block">Rechercher</span>
          <kbd className="font-mono text-[10px] bg-surface-600 border border-surface-500 rounded px-1">⌘K</kbd>
        </button>

        {/* Profile menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-lg hover:bg-surface-700 transition-all group"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white shadow-glow-purple shrink-0">
              {initials}
            </div>
            <span className="text-sm text-slate-300 group-hover:text-white hidden sm:block max-w-28 truncate">
              {userProfile?.displayName ?? user?.email?.split('@')[0] ?? 'Trader'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-surface-700 border border-surface-500 rounded-xl shadow-card overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-surface-500">
                <div className="text-sm font-semibold text-white truncate">
                  {userProfile?.displayName ?? 'Trader'}
                </div>
                <div className="text-xs text-slate-500 truncate">{user?.email}</div>
              </div>
              <div className="py-1">
                <Link href="/settings" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-surface-600 transition-all">
                  <User className="w-4 h-4" /> Mon profil
                </Link>
                <Link href="/settings" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-surface-600 transition-all">
                  <Settings className="w-4 h-4" /> Paramètres
                </Link>
                <div className="border-t border-surface-500 mt-1 pt-1">
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
                    <LogOut className="w-4 h-4" /> Déconnexion
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
