'use client'
import { useEffect, useState } from 'react'
import { TradeVerification } from '@/lib/types'
import { ScoreCard } from './ScoreCard'
import { cn } from '@/lib/utils/cn'
import { X, ChevronRight } from 'lucide-react'

interface VerificationModalProps {
  verification: TradeVerification | null
  onClose: () => void
}

export function VerificationModal({ verification, onClose }: VerificationModalProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (verification) {
      // slight delay so entrance animation looks good
      const t = setTimeout(() => setVisible(true), 60)
      return () => clearTimeout(t)
    } else {
      setVisible(false)
    }
  }, [verification])

  if (!verification) return null

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-300',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className={cn(
        'relative w-full max-w-md transition-all duration-300',
        visible ? 'translate-y-0 scale-100' : 'translate-y-6 scale-95'
      )}>
        {/* Title bar */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="text-base font-bold text-white">Setup Verification</h3>
            <p className="text-xs text-slate-500">Automatic analysis of your trade</p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-700 hover:bg-surface-600 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ScoreCard verification={verification} />

        <button
          onClick={handleClose}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-surface-800 hover:bg-surface-700 border border-surface-500 rounded-xl text-sm text-slate-300 hover:text-white transition-all"
        >
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
