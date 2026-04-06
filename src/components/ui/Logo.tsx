import { cn } from '@/lib/utils/cn'

interface LogoProps {
  size?: number
  showText?: boolean
  textClassName?: string
  className?: string
}

export function Logo({ size = 32, showText = true, textClassName, className }: LogoProps) {
  // Unique IDs to avoid SVG gradient conflicts when multiple Logo instances are rendered
  const gL = `ef-gl-${size}`
  const gR = `ef-gr-${size}`
  const gS = `ef-gs-${size}`

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 92"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="EdgeFlow logo"
      >
        <defs>
          {/* Left page — indigo → violet */}
          <linearGradient id={gL} x1="16" y1="12" x2="50" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#818CF8" />
            <stop offset="55%"  stopColor="#9B6EF8" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
          {/* Right page — sky-blue → indigo */}
          <linearGradient id={gR} x1="84" y1="12" x2="50" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#60BFFF" />
            <stop offset="55%"  stopColor="#7B9EFB" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>
          {/* Spine highlight */}
          <linearGradient id={gS} x1="50" y1="10" x2="50" y2="68" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#C4B5FD" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ── Left page ─────────────────────────────────────────────────────── */}
        <path
          d="
            M 50,13
            L 24,19
            Q 16,19 16,27
            L 16,60
            Q 16,67 23,69
            Q 35,74 50,69
            Z
          "
          fill={`url(#${gL})`}
        />

        {/* ── Right page ────────────────────────────────────────────────────── */}
        <path
          d="
            M 50,13
            L 76,19
            Q 84,19 84,27
            L 84,60
            Q 84,67 77,69
            Q 65,74 50,69
            Z
          "
          fill={`url(#${gR})`}
        />

        {/* ── Spine centre highlight ────────────────────────────────────────── */}
        <path
          d="M 50,13 L 50,69"
          stroke={`url(#${gS})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* ── Trading chart line ────────────────────────────────────────────── */}
        {/* Equity-curve style: pullback then recovery */}
        <path
          d="
            M 24,46
            C 28,32 34,52 40,40
            C 46,28 54,52 62,36
            C 68,26 76,42 80,39
          "
          stroke="#1E0A3C"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.75"
        />
      </svg>

      {showText && (
        <span className={cn('font-bold text-white tracking-tight', textClassName ?? 'text-base')}>
          EdgeFlow
        </span>
      )}
    </div>
  )
}
