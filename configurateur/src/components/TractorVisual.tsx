'use client';
/**
 * Visuel du tracteur configuré. Ordre de priorité :
 *  1. modèle 3D GLB (model-viewer)         → produit.modele3d_url, {variant} remplacé
 *  2. séquence 360° de N photos            → produit.vue360_url avec {frame} (et {variant})
 *  3. photo (celle de la variante de pneus choisie si elle existe)
 *  4. illustration vectorielle de secours (cabine / arceau / chargeur / machine)
 * La « variante » est la combinaison triée des mots-clés visuels choisis,
 * ex. « arceau-chargeur-gazon » (voir docs/GUIDE-ADMIN.md).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { optimized } from '@/lib/image';

type Props = {
  name: string;
  images: string[];
  photo?: string | null;
  spinUrl?: string | null;
  spinFrames?: number;
  modelUrl?: string | null;
  variant?: string;
  tags?: string[];
  autoRotate?: boolean;
  hint?: string;
  priority?: boolean;
};


const fillVariant = (pattern: string, variant: string) => pattern.replace(/\{variant\}/g, variant);

export function TractorVisual(p: Props) {
  if (p.modelUrl) return <ModelView {...p} modelUrl={p.modelUrl} />;
  if (p.spinUrl) return <Spin {...p} spinUrl={p.spinUrl} />;
  const src = p.photo || p.images[0];
  if (src) return <Photo key={src} src={src} alt={p.name} tags={p.tags} priority={p.priority} />;
  return <Illustration tags={p.tags ?? []} />;
}

function Photo({ src, alt, tags, priority }: { src: string; alt: string; tags?: string[]; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Illustration tags={tags ?? []} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="step-anim"
      src={optimized(src)}
      alt={alt}
      fetchPriority={priority ? 'high' : undefined}
      onError={() => setFailed(true)}
      style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 30px 30px rgba(0,0,0,.5))' }}
    />
  );
}

function Spin({ spinUrl, spinFrames = 36, variant = 'base', name, hint, tags, autoRotate = true }: Props & { spinUrl: string }) {
  const frames = useMemo(() => {
    const pattern = fillVariant(spinUrl, variant);
    return Array.from({ length: spinFrames }, (_, i) => optimized(pattern.replace(/\{frame\}/g, String(i + 1)), 1080, 70));
  }, [spinUrl, spinFrames, variant]);
  const [frame, setFrame] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [failed, setFailed] = useState(false);
  const drag = useRef<{ x: number; f: number } | null>(null);
  const idle = useRef(true);

  // Préchargement progressif des images.
  useEffect(() => {
    let alive = true;
    setLoaded(0);
    setFailed(false);
    frames.forEach((src, i) => {
      const img = new Image();
      img.onload = () => alive && setLoaded((n) => n + 1);
      img.onerror = () => alive && i === 0 && setFailed(true);
      img.src = src;
    });
    return () => {
      alive = false;
    };
  }, [frames]);

  // Rotation lente automatique tant que l'utilisateur ne manipule pas.
  useEffect(() => {
    if (!autoRotate || loaded < frames.length * 0.6) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => idle.current && setFrame((f) => (f + 1) % frames.length), 140);
    return () => window.clearInterval(id);
  }, [autoRotate, loaded, frames.length]);

  if (failed) return <Illustration tags={tags ?? []} />;

  const onDown = (e: React.PointerEvent) => {
    idle.current = false;
    drag.current = { x: e.clientX, f: frame };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const step = Math.round((e.clientX - drag.current.x) / 9);
    setFrame((((drag.current.f - step) % frames.length) + frames.length) % frames.length);
  };
  const onUp = () => {
    drag.current = null;
    window.setTimeout(() => (idle.current = true), 4000);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      idle.current = false;
      setFrame((f) => (f + (e.key === 'ArrowLeft' ? 1 : -1) + frames.length) % frames.length);
    }
  };

  return (
    <div
      role="img"
      aria-label={`${name}, vue 360°`}
      tabIndex={0}
      onKeyDown={onKey}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{ position: 'relative', width: '100%', height: '100%', touchAction: 'pan-y', cursor: 'grab' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={frames[frame]} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      {loaded < frames.length && (
        <div style={{ position: 'absolute', left: '20%', right: '20%', bottom: 4, height: 2, background: 'var(--line)' }}>
          <div style={{ height: '100%', width: `${(loaded / frames.length) * 100}%`, background: 'var(--accent)', transition: 'width .2s' }} />
        </div>
      )}
      {hint && <div className="spin-hint">{hint} · 360°</div>}
    </div>
  );
}

let mvLoading: Promise<unknown> | null = null;

function ModelView({ modelUrl, variant = 'base', name, tags }: Props & { modelUrl: string }) {
  const [ready, setReady] = useState(false);
  const [src, setSrc] = useState(() => fillVariant(modelUrl, variant));
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    mvLoading ??= import('@google/model-viewer');
    mvLoading.then(() => setReady(true)).catch(() => setFailed(true));
  }, []);
  useEffect(() => setSrc(fillVariant(modelUrl, variant)), [modelUrl, variant]);
  if (failed) return <Illustration tags={tags ?? []} />;
  if (!ready) return <Illustration tags={tags ?? []} />;
  return (
    <model-viewer
      src={src}
      alt={name}
      camera-controls=""
      auto-rotate=""
      auto-rotate-delay="1500"
      rotation-per-second="12deg"
      shadow-intensity="1"
      exposure="1.05"
      interaction-prompt="none"
      onError={() => (src !== fillVariant(modelUrl, 'base') ? setSrc(fillVariant(modelUrl, 'base')) : setFailed(true))}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    />
  );
}

/** Illustration de secours, mise à jour selon les choix (cabine, chargeur, machine, pneus). */
export function Illustration({ tags }: { tags: string[] }) {
  const has = (t: string) => tags.includes(t);
  const cab = has('cabine');
  const loader = has('chargeur');
  const impl = has('machine');
  const turf = has('gazon') || has('galaxy');
  const ind = has('industriel');
  return (
    <svg className="tractor-svg float" viewBox="0 0 440 270" role="img" aria-label="Illustration">
      <ellipse cx="225" cy="250" rx="200" ry="12" fill="#000" opacity=".35" />
      <g className="part" style={{ opacity: loader ? 1 : 0 }}>
        <path d="M242 128 L130 118 L62 168 L72 176 L136 132 L242 142 Z" fill="#2a332d" />
        <path d="M14 162 L66 160 L80 210 L24 218 Z" fill="#2a332d" />
      </g>
      <g className="part" style={{ opacity: cab ? 1 : 0 }}>
        <path d="M246 30 L340 30 L350 112 L242 112 Z" fill="rgba(160,200,190,.18)" stroke="#2a332d" strokeWidth="7" strokeLinejoin="round" />
        <rect x="236" y="22" width="120" height="12" rx="4" fill="#2a332d" />
      </g>
      <g className="part" style={{ opacity: cab ? 0 : 1 }}>
        <rect x="328" y="26" width="9" height="104" rx="3" fill="#2a332d" />
        <rect x="310" y="22" width="44" height="9" rx="4" fill="#2a332d" />
      </g>
      <rect x="82" y="150" width="214" height="20" rx="4" fill="#1d241f" />
      <path d="M72 156 L82 116 Q86 104 102 104 L234 104 L250 156 Z" fill="var(--green-2)" />
      <rect x="68" y="118" width="16" height="34" rx="3" fill="#1d241f" />
      <rect x="206" y="58" width="6" height="48" rx="2" fill="#1d241f" />
      <path d="M276 92 Q286 80 306 88 L304 112 L280 112 Z" fill="#1d241f" />
      <path d="M236 156 A78 78 0 0 1 388 156 L374 156 A64 64 0 0 0 250 156 Z" fill="var(--green-2)" />
      <circle cx="312" cy="180" r="64" fill="#0b0d0b" />
      <circle cx="312" cy="180" r="64" fill="none" stroke="#3b443e" strokeWidth={turf ? 1 : 3} strokeDasharray={turf ? '2 4' : ind ? '10 6' : '6 9'} />
      <circle cx="312" cy="180" r="36" fill="var(--accent)" />
      <circle cx="312" cy="180" r="12" fill="#1d241f" />
      <circle cx="114" cy="198" r="44" fill="#0b0d0b" />
      <circle cx="114" cy="198" r="44" fill="none" stroke="#3b443e" strokeWidth={turf ? 1 : 3} strokeDasharray={turf ? '2 4' : ind ? '8 5' : '5 8'} />
      <circle cx="114" cy="198" r="24" fill="var(--accent)" />
      <circle cx="114" cy="198" r="8" fill="#1d241f" />
      <g className="part" style={{ opacity: impl ? 1 : 0 }}>
        <path d="M378 142 L394 142 L394 150 L382 150 Z" fill="#1d241f" />
        <rect x="388" y="150" width="44" height="72" rx="4" fill="#1d241f" />
        <rect x="392" y="156" width="36" height="10" fill="var(--accent)" />
      </g>
    </svg>
  );
}
