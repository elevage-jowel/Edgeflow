'use client'
import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { useUIStore } from '@/lib/stores/uiStore'
import { useTradeStore } from '@/lib/stores/tradeStore'
import { formatPnl } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import {
  LayoutDashboard, BookOpen, BarChart2, Target, BookMarked,
  FlaskConical, Calendar, Settings, Upload, ClipboardList,
  Building2, Plus, TrendingUp, TrendingDown, Search, ArrowRight,
} from 'lucide-react'

const NAV = [
  { label: 'Tableau de bord',  href: '/dashboard',  icon: LayoutDashboard, group: 'Navigation' },
  { label: 'Journal',          href: '/journal',    icon: BookOpen,         group: 'Navigation' },
  { label: 'Planificateur',    href: '/planner',    icon: ClipboardList,    group: 'Navigation' },
  { label: 'Calendrier',       href: '/calendar',   icon: Calendar,         group: 'Navigation' },
  { label: 'Analytiques',      href: '/analytics',  icon: BarChart2,        group: 'Navigation' },
  { label: 'Objectifs',        href: '/goals',      icon: Target,           group: 'Navigation' },
  { label: 'Backtest',         href: '/backtest',   icon: FlaskConical,     group: 'Navigation' },
  { label: 'Prop Firm',        href: '/propfirm',   icon: Building2,        group: 'Navigation' },
  { label: 'Playbooks',        href: '/playbooks',  icon: BookMarked,       group: 'Navigation' },
  { label: 'Importer',         href: '/import',     icon: Upload,           group: 'Navigation' },
  { label: 'Paramètres',       href: '/settings',   icon: Settings,         group: 'Navigation' },
]

export function CommandPalette() {
  const router = useRouter()
  const { isCmdPaletteOpen, setCmdPalette } = useUIStore()
  const { trades } = useTradeStore()

  const close = useCallback(() => setCmdPalette(false), [setCmdPalette])

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdPalette(!isCmdPaletteOpen)
      }
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isCmdPaletteOpen, setCmdPalette, close])

  const go = (href: string) => {
    router.push(href)
    close()
  }

  const recentTrades = trades.slice(0, 5)

  if (!isCmdPaletteOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
      />

      {/* Palette */}
      <div className="relative z-10 w-full max-w-xl mx-4">
        <Command
          className="bg-surface-800 border border-surface-400 rounded-2xl shadow-2xl overflow-hidden"
          loop
        >
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-surface-600">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <Command.Input
              autoFocus
              placeholder="Chercher une page, un trade, une action…"
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            />
            <kbd className="text-[10px] text-slate-600 bg-surface-700 border border-surface-500 rounded px-1.5 py-0.5 font-mono">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[380px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-slate-500">
              Aucun résultat
            </Command.Empty>

            {/* Quick actions */}
            <Command.Group heading={<GroupLabel>Actions rapides</GroupLabel>}>
              <Item
                icon={Plus}
                label="Nouveau trade"
                sub="Ouvrir le journal + ajouter"
                onSelect={() => { router.push('/journal?new=1'); close() }}
                color="text-brand-400"
              />
            </Command.Group>

            {/* Navigation */}
            <Command.Group heading={<GroupLabel>Navigation</GroupLabel>}>
              {NAV.map(({ label, href, icon: Icon }) => (
                <Command.Item
                  key={href}
                  value={label}
                  onSelect={() => go(href)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-300 aria-selected:bg-surface-700 aria-selected:text-white transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-surface-700 group-aria-selected:bg-surface-600 flex items-center justify-center shrink-0 transition-colors">
                    <Icon className="w-3.5 h-3.5 text-slate-400 group-aria-selected:text-brand-400" />
                  </div>
                  <span className="text-sm flex-1">{label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 opacity-0 group-aria-selected:opacity-100 transition-opacity" />
                </Command.Item>
              ))}
            </Command.Group>

            {/* Recent trades */}
            {recentTrades.length > 0 && (
              <Command.Group heading={<GroupLabel>Trades récents</GroupLabel>}>
                {recentTrades.map(t => (
                  <Command.Item
                    key={t.id}
                    value={`${t.symbol} ${t.direction}`}
                    onSelect={() => go('/journal')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-300 aria-selected:bg-surface-700 aria-selected:text-white transition-colors group"
                  >
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                      (t.netPnl ?? 0) >= 0 ? 'bg-emerald-500/15' : 'bg-red-500/15'
                    )}>
                      {(t.netPnl ?? 0) >= 0
                        ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-white">{t.symbol}</span>
                      <span className="text-xs text-slate-500 ml-2">{t.direction}</span>
                    </div>
                    {t.netPnl !== undefined && (
                      <span className={cn('text-xs font-mono font-semibold', (t.netPnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {formatPnl(t.netPnl)}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer hint */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-surface-600 text-[11px] text-slate-600">
            <span><kbd className="font-mono bg-surface-700 border border-surface-500 rounded px-1">↑↓</kbd> naviguer</span>
            <span><kbd className="font-mono bg-surface-700 border border-surface-500 rounded px-1">↵</kbd> ouvrir</span>
            <span><kbd className="font-mono bg-surface-700 border border-surface-500 rounded px-1">Esc</kbd> fermer</span>
          </div>
        </Command>
      </div>
    </div>
  )
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
      {children}
    </div>
  )
}

function Item({ icon: Icon, label, sub, onSelect, color = 'text-slate-400' }: {
  icon: React.ElementType
  label: string
  sub?: string
  onSelect: () => void
  color?: string
}) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-300 aria-selected:bg-surface-700 aria-selected:text-white transition-colors group"
    >
      <div className="w-7 h-7 rounded-lg bg-surface-700 group-aria-selected:bg-surface-600 flex items-center justify-center shrink-0 transition-colors">
        <Icon className={cn('w-3.5 h-3.5', color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm">{label}</div>
        {sub && <div className="text-xs text-slate-500">{sub}</div>}
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-slate-600 opacity-0 group-aria-selected:opacity-100 transition-opacity" />
    </Command.Item>
  )
}
