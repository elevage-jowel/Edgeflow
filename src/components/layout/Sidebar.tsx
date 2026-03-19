'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/trades', label: 'Trades', icon: '⇅' },
  { href: '/import', label: 'Import CSV', icon: '⇧' },
  { href: '/stats', label: 'Statistics', icon: '◎' },
  { href: '/calendar', label: 'Calendar', icon: '▦' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-slate-700 bg-slate-900 px-3 py-6">
      <div className="mb-8 px-2">
        <span className="text-xl font-bold text-indigo-400">Edgeflow</span>
        <p className="text-xs text-slate-500 mt-0.5">Trading Journal</p>
      </div>
      <nav className="flex flex-col gap-1">
        {nav.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-indigo-600/20 text-indigo-400'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            )}
          >
            <span className="text-base">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
