import { Cloud, CloudOff, Loader2, AlertCircle, HardDrive } from 'lucide-react'
import type { SyncStatus } from '../../types'
import { useI18n } from '../../i18n'

interface SyncBadgeProps {
  status: SyncStatus
  compact?: boolean
}

const configs: Record<SyncStatus, { icon: typeof Cloud; color: string; bg: string; key: string }> = {
  synced:  { icon: Cloud,        color: 'text-brand-400', bg: 'bg-brand-500/10',  key: 'sync.synced' },
  syncing: { icon: Loader2,      color: 'text-blue-400',  bg: 'bg-blue-500/10',   key: 'sync.syncing' },
  local:   { icon: HardDrive,    color: 'text-amber-400', bg: 'bg-amber-500/10',  key: 'sync.local' },
  error:   { icon: AlertCircle,  color: 'text-red-400',   bg: 'bg-red-500/10',    key: 'sync.error' },
  offline: { icon: CloudOff,     color: 'text-surface-500', bg: 'bg-surface-800', key: 'sync.offline' },
}

export function SyncBadge({ status, compact = false }: SyncBadgeProps) {
  const { t } = useI18n()
  const { icon: Icon, color, bg, key } = configs[status]

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${bg}`}>
        <Icon size={12} className={`${color} ${status === 'syncing' ? 'animate-spin' : ''}`} />
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${bg}`}>
      <Icon size={14} className={`${color} ${status === 'syncing' ? 'animate-spin' : ''} flex-shrink-0`} />
      <span className={`text-xs font-medium ${color}`}>{t(key)}</span>
    </div>
  )
}
