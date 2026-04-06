'use client'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface ScoreGaugeProps {
  score: number      // 0-100
  size?: number      // px, default 120
  strokeWidth?: number
  animated?: boolean
  showLabel?: boolean
  className?: string
}

function getColor(score: number) {
  if (score >= 80) return { stroke: '#10b981', glow: 'rgba(16,185,129,0.4)', text: 'text-emerald-400' }
  if (score >= 60) return { stroke: '#f59e0b', glow: 'rgba(245,158,11,0.4)', text: 'text-amber-400' }
  return { stroke: '#ef4444', glow: 'rgba(239,68,68,0.4)', text: 'text-red-400' }
}

export function ScoreGauge({ score, size = 120, strokeWidth = 8, animated = true, showLabel = true, className }: ScoreGaugeProps) {
  const [displayed, setDisplayed] = useState(animated ? 0 : score)

  useEffect(() => {
    if (!animated) { setDisplayed(score); return }
    let frame: number
    const start = performance.now()
    const duration = 900
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)   // cubic ease-out
      setDisplayed(Math.round(ease * score))
      if (t < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [score, animated])

  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (displayed / 100) * circumference
  const cx = size / 2
  const cy = size / 2
  const { stroke, glow, text } = getColor(score)

  return (
    <div className={cn('relative flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Glow filter */}
        <defs>
          <filter id={`glow-${size}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Progress arc */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter={`url(#glow-${size})`}
          style={{ transition: 'stroke 0.4s ease' }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-black tabular-nums leading-none', text,
          size >= 120 ? 'text-3xl' : size >= 80 ? 'text-xl' : 'text-base'
        )}>
          {displayed}
        </span>
        {showLabel && (
          <span className="text-slate-500 text-xs mt-0.5">/100</span>
        )}
      </div>
    </div>
  )
}
