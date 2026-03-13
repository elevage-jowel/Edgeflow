import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  color?: 'brand' | 'red' | 'amber' | 'blue' | 'purple'
  index?: number
}

const colorMap = {
  brand:  { icon: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/20' },
  red:    { icon: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/20' },
  amber:  { icon: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  blue:   { icon: 'text-blue-400',  bg: 'bg-blue-500/10',  border: 'border-blue-500/20' },
  purple: { icon: 'text-purple-400',bg: 'bg-purple-500/10',border: 'border-purple-500/20' },
}

export function StatCard({ label, value, sub, icon: Icon, trend, color = 'brand', index = 0 }: StatCardProps) {
  const c = colorMap[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`
        relative bg-surface-850 border ${c.border} rounded-xl p-4
        hover:border-opacity-50 transition-all duration-200
        hover:shadow-lg hover:shadow-black/20
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-surface-400 uppercase tracking-wider truncate">{label}</p>
          <p className={`mt-1.5 text-2xl font-bold font-mono tracking-tight ${
            trend === 'up' ? 'text-brand-400' :
            trend === 'down' ? 'text-red-400' :
            'text-white'
          }`}>
            {value}
          </p>
          {sub && <p className="mt-0.5 text-xs text-surface-500">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center flex-shrink-0 ml-3`}>
          <Icon size={16} className={c.icon} />
        </div>
      </div>
    </motion.div>
  )
}
