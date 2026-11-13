'use client';
import { useEffect, useRef, useState } from 'react';
import { formatEur } from '@/lib/money';
import type { Locale } from '@/lib/i18n';

/** Montant qui « roule » vers sa nouvelle valeur et pulse quand il change. */
export function AnimatedPrice({ cents, locale, className }: { cents: number; locale: Locale; className?: string }) {
  const [shown, setShown] = useState(cents);
  const [pulse, setPulse] = useState(false);
  const from = useRef(cents);
  useEffect(() => {
    const start = from.current;
    if (start === cents) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setShown(cents);
      from.current = cents;
      return;
    }
    setPulse(false);
    requestAnimationFrame(() => setPulse(true));
    const t0 = performance.now();
    const d = 550;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / d);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(start + (cents - start) * e));
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = cents;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = cents;
    };
  }, [cents]);
  return (
    <span className={`${className ?? ''} ${pulse ? 'pulse' : ''}`} aria-live="polite" onAnimationEnd={() => setPulse(false)}>
      {formatEur(shown, locale, { decimals: false })}
    </span>
  );
}
