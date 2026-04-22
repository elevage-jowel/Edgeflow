'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUIStore } from '@/lib/stores/uiStore'

const ROUTES: Record<string, string> = {
  d: '/dashboard',
  j: '/journal',
  a: '/analytics',
  o: '/goals',
  p: '/playbooks',
  c: '/calendar',
  b: '/backtest',
  i: '/import',
}

export function KeyboardShortcuts() {
  const router = useRouter()
  const pathname = usePathname()
  const { setCmdPalette, isCmdPaletteOpen } = useUIStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs/textareas/contenteditable
      const tag = (e.target as HTMLElement).tagName
      const editable = (e.target as HTMLElement).isContentEditable
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable) return
      // Ignore when modifier keys held (except for Cmd+K handled elsewhere)
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // Ignore if palette is open
      if (isCmdPaletteOpen) return

      const key = e.key.toLowerCase()

      // Page shortcuts
      if (ROUTES[key]) {
        e.preventDefault()
        router.push(ROUTES[key])
        return
      }

      // N → new trade (journal with param)
      if (key === 'n') {
        e.preventDefault()
        if (pathname === '/journal') {
          // Dispatch custom event so JournalClient can pick it up
          window.dispatchEvent(new CustomEvent('edgeflow:new-trade'))
        } else {
          router.push('/journal?new=1')
        }
      }

      // ? → show shortcuts help (open cmd palette)
      if (key === '?') {
        e.preventDefault()
        setCmdPalette(true)
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [router, pathname, setCmdPalette, isCmdPaletteOpen])

  return null
}
