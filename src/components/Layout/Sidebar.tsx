import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  BookOpen,
  FlaskConical,
  NotebookPen,
  CalendarDays,
  Settings,
  TrendingUp,
  LogOut,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useI18n } from '../../i18n'
import { SyncBadge } from './SyncBadge'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/journal', icon: BookOpen, key: 'nav.journal' },
  { to: '/backtest', icon: FlaskConical, key: 'nav.backtest' },
  { to: '/diary', icon: NotebookPen, key: 'nav.diary' },
  { to: '/calendar', icon: CalendarDays, key: 'nav.calendar' },
  { to: '/settings', icon: Settings, key: 'nav.settings' },
]

export function Sidebar() {
  const { t } = useI18n()
  const { user, logout, syncStatus } = useStore()

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      className="fixed left-0 top-0 h-screen w-64 bg-surface-900 border-r border-surface-700 flex flex-col z-40"
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b border-surface-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500/10 border border-brand-500/30 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="font-mono font-bold text-lg text-white tracking-tight">
              Edge<span className="text-brand-400">Flow</span>
            </h1>
            <p className="text-xs text-surface-500 font-mono">v2.5</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
              ${isActive
                ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                : 'text-surface-400 hover:text-white hover:bg-surface-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-brand-400' : ''}`} size={18} />
                <span>{t(key)}</span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-surface-700 space-y-3">
        <SyncBadge status={syncStatus} />

        {user && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-800">
            <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-400 text-xs font-bold font-mono uppercase">
                {user.username.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user.username}</p>
              <p className="text-xs text-surface-500 truncate capitalize">{user.role}</p>
            </div>
            <button
              onClick={() => logout()}
              className="text-surface-500 hover:text-red-400 transition-colors"
              title={t('auth.logout')}
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  )
}
