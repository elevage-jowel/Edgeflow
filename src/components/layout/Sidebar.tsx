'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { useUIStore } from '@/lib/stores/uiStore'
import {
  LayoutDashboard, BookOpen, BarChart2, Target, BookMarked,
  FlaskConical, Calendar, Settings, ChevronLeft, ChevronRight, Upload, X
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/journal', icon: BookOpen, label: 'Journal' },
  { href: '/analytics', icon: BarChart2, label: 'Analytics' },
  { href: '/goals', icon: Target, label: 'Goals' },
  { href: '/playbooks', icon: BookMarked, label: 'Playbooks' },
  { href: '/backtest', icon: FlaskConical, label: 'Backtest' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/import', icon: Upload, label: 'Import' },
]

interface SidebarProps {
  mobile?: boolean
  onClose?: () => void
}

export function Sidebar({ mobile = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { isSidebarCollapsed, toggleSidebar } = useUIStore()

  const collapsed = !mobile && isSidebarCollapsed

  return (
    <aside className={cn(
      'flex flex-col bg-surface-800 border-r border-surface-500 transition-all duration-300 h-full',
      mobile ? 'w-64' : collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-2.5 px-4 py-5 border-b border-surface-500',
        collapsed && 'justify-center px-0'
      )}>
        <Logo
          size={collapsed && !mobile ? 30 : 28}
          showText={!collapsed || mobile}
          textClassName="text-base"
        />
        {mobile && (
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={mobile ? onClose : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                active
                  ? 'bg-brand-600/20 text-brand-300 border border-brand-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-700',
                collapsed && !mobile && 'justify-center px-0 py-2.5 mx-auto w-10 h-10'
              )}
              title={collapsed && !mobile ? label : undefined}
            >
              <Icon className={cn('w-4.5 h-4.5 shrink-0', active ? 'text-brand-400' : '')} size={18} />
              {(!collapsed || mobile) && <span>{label}</span>}
              {(!collapsed || mobile) && active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 space-y-0.5 border-t border-surface-500 pt-2">
        <Link
          href="/settings"
          onClick={mobile ? onClose : undefined}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
            pathname.startsWith('/settings') ? 'bg-brand-600/20 text-brand-300' : 'text-slate-400 hover:text-slate-200 hover:bg-surface-700',
            collapsed && !mobile && 'justify-center px-0 w-10 h-10 mx-auto'
          )}
          title={collapsed && !mobile ? 'Settings' : undefined}
        >
          <Settings size={18} />
          {(!collapsed || mobile) && <span>Settings</span>}
        </Link>

        {!mobile && (
          <button
            onClick={toggleSidebar}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-surface-700 transition-all w-full"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight size={18} /> : (
              <>
                <ChevronLeft size={18} />
                <span>Collapse</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  )
}
