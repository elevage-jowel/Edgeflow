'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { useUIStore } from '@/lib/stores/uiStore'
import { useAuthStore } from '@/lib/stores/authStore'
import {
  LayoutDashboard, BookOpen, BarChart2, Target, BookMarked,
  FlaskConical, Calendar, Settings, ChevronLeft, ChevronRight,
  Upload, X, ClipboardList, Building2, LogOut
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { signOut } from '@/lib/firebase/auth'
import { useRouter } from 'next/navigation'

const navGroups = [
  {
    label: 'Trading',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
      { href: '/journal',   icon: BookOpen,         label: 'Journal'         },
      { href: '/planner',   icon: ClipboardList,    label: 'Planificateur'   },
      { href: '/calendar',  icon: Calendar,         label: 'Calendrier'      },
    ],
  },
  {
    label: 'Analyse',
    items: [
      { href: '/analytics', icon: BarChart2,    label: 'Analytiques' },
      { href: '/goals',     icon: Target,       label: 'Objectifs'   },
      { href: '/backtest',  icon: FlaskConical, label: 'Backtest'    },
    ],
  },
  {
    label: 'Outils',
    items: [
      { href: '/propfirm',  icon: Building2,  label: 'Prop Firm' },
      { href: '/playbooks', icon: BookMarked, label: 'Playbooks' },
      { href: '/import',    icon: Upload,     label: 'Importer'  },
    ],
  },
]

interface SidebarProps {
  mobile?: boolean
  onClose?: () => void
}

export function Sidebar({ mobile = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { isSidebarCollapsed, toggleSidebar } = useUIStore()
  const { user, userProfile } = useAuthStore()
  const router = useRouter()

  const collapsed = !mobile && isSidebarCollapsed

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  const initials = (userProfile?.displayName ?? user?.email ?? 'U')
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <aside className={cn(
      'flex flex-col border-r border-surface-500 transition-all duration-300 h-full',
      'bg-gradient-to-b from-surface-800 to-surface-900',
      mobile ? 'w-64' : collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo area */}
      <div className={cn(
        'flex items-center border-b border-surface-500/60',
        collapsed && !mobile ? 'justify-center px-0 py-4' : 'px-4 py-4 gap-2.5'
      )}>
        <Logo
          size={collapsed && !mobile ? 28 : 26}
          showText={!collapsed || mobile}
          textClassName="text-[15px] font-bold"
        />
        {(!collapsed || mobile) && (
          <span className="ml-auto text-[9px] font-bold tracking-widest text-brand-500/80 uppercase bg-brand-500/10 border border-brand-500/20 px-1.5 py-0.5 rounded">
            Beta
          </span>
        )}
        {mobile && (
          <button onClick={onClose} className="ml-2 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto no-scrollbar space-y-4">
        {navGroups.map(group => (
          <div key={group.label}>
            {(!collapsed || mobile) && (
              <div className="px-3 mb-1.5">
                <span className="text-[10px] font-semibold tracking-widest text-slate-600 uppercase">
                  {group.label}
                </span>
              </div>
            )}
            {collapsed && !mobile && (
              <div className="w-5 h-px bg-surface-600 mx-auto mb-1.5" />
            )}

            <div className="space-y-0.5">
              {group.items.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={mobile ? onClose : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg text-sm font-medium transition-all group relative',
                      active
                        ? 'bg-brand-600/15 text-brand-300'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-surface-700/60',
                      collapsed && !mobile
                        ? 'justify-center w-10 h-10 mx-auto px-0 py-0'
                        : 'px-3 py-2'
                    )}
                    title={collapsed && !mobile ? label : undefined}
                  >
                    {active && !collapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-r-full" />
                    )}
                    <Icon
                      size={16}
                      className={cn('shrink-0', active ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300')}
                    />
                    {(!collapsed || mobile) && (
                      <span className="flex-1 truncate">{label}</span>
                    )}
                    {(!collapsed || mobile) && active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400/70 shrink-0" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-surface-500/60 px-2 pt-2 pb-3 space-y-0.5">
        <Link
          href="/settings"
          onClick={mobile ? onClose : undefined}
          className={cn(
            'flex items-center gap-3 rounded-lg text-sm font-medium transition-all',
            pathname.startsWith('/settings') ? 'bg-brand-600/15 text-brand-300' : 'text-slate-400 hover:text-slate-200 hover:bg-surface-700/60',
            collapsed && !mobile ? 'justify-center w-10 h-10 mx-auto px-0' : 'px-3 py-2'
          )}
          title={collapsed && !mobile ? 'Paramètres' : undefined}
        >
          <Settings size={16} className="shrink-0 text-slate-500" />
          {(!collapsed || mobile) && <span>Paramètres</span>}
        </Link>

        {!mobile && (
          <button
            onClick={toggleSidebar}
            className={cn(
              'flex items-center gap-3 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-surface-700/60 transition-all w-full',
              collapsed ? 'justify-center w-10 h-10 mx-auto px-0' : 'px-3 py-2'
            )}
            title={collapsed ? 'Développer' : 'Réduire'}
          >
            {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Réduire</span></>}
          </button>
        )}

        {/* User profile row */}
        {(!collapsed || mobile) && (
          <div className="mt-1.5 pt-2 border-t border-surface-500/40">
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg group cursor-default">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-glow-purple">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-200 truncate">
                  {userProfile?.displayName ?? 'Trader'}
                </div>
                <div className="text-[10px] text-slate-600 truncate">{user?.email}</div>
              </div>
              <button
                onClick={handleLogout}
                title="Déconnexion"
                className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
