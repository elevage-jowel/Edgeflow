'use client';
/**
 * Accueil : défilé automatique des tracteurs (photos des importateurs) et
 * vitrine des machines classées par catégories.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { optimized } from '@/lib/image';
import { formatEur } from '@/lib/money';
import { href, t, type Locale } from '@/lib/i18n';

export type ShowTractor = { ref: string; slug: string; brand: string; name: string; image: string; priceHt: number | null; specs: string };
export type ShowFamily = { key: string; slug: string; brand: string; name: string; category: string; image: string | null; widths: [number, number] | null; minPrice: number | null; minPower: number | null; count: number };

/** Catégories de la vitrine, regroupant les types de machines. */
export const MACHINE_GROUPS: { key: string; fr: string; nl: string; types: string[] }[] = [
  { key: 'fauchage', fr: 'Fauchage et broyage', nl: 'Maaien en klepelen', types: ['broyeur-fleaux', 'broyeur-fleaux-ramassage', 'broyeur-accotement', 'gyrobroyeur', 'epareuse', 'tondeuse', 'tondeuse-poteaux', 'taille-haies'] },
  { key: 'sol', fr: 'Travail du sol', nl: 'Grondbewerking', types: ['fraise', 'herse-rotative', 'enfouisseuse', 'semoir', 'scarificateur', 'lame'] },
  { key: 'entretien', fr: 'Entretien et épandage', nl: 'Onderhoud en strooien', types: ['aspirateur', 'balayeuse', 'epandeur'] },
  { key: 'bois', fr: 'Bois', nl: 'Hout', types: ['broyeur-branches', 'fendeuse'] },
  { key: 'transport', fr: 'Transport', nl: 'Transport', types: ['benne', 'remorque'] },
];

export function TractorCarousel({ locale, items }: { locale: Locale; items: ShowTractor[] }) {
  const m = t(locale);
  const box = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const step = (dir: number) => {
    const el = box.current;
    const card = el?.querySelector<HTMLElement>('.tcard');
    if (!el || !card) return;
    if (dir > 0 && el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) el.scrollTo({ left: 0, behavior: 'smooth' });
    else el.scrollBy({ left: dir * (card.offsetWidth + 16), behavior: 'smooth' });
  };
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => !paused.current && step(1), 3500);
    return () => window.clearInterval(id);
  }, []);
  const pause = (v: boolean) => () => (paused.current = v);
  return (
    <section className="section container home-sec" aria-labelledby="gamme-t">
      <div className="section-head">
        <div>
          <span className="eyebrow">{m.home.rangeEyebrow}</span>
          <h2 className="wide" id="gamme-t" style={{ textTransform: 'uppercase', marginTop: 6 }}>Farmtrac, Iseki {locale === 'nl' ? 'en' : 'et'} Solis</h2>
        </div>
        <div className="car-nav">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => step(-1)} aria-label="←">←</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => step(1)} aria-label="→">→</button>
        </div>
      </div>
      <div className="carousel" ref={box} onPointerEnter={pause(true)} onPointerLeave={pause(false)} onFocus={pause(true)} onBlur={pause(false)} onTouchStart={pause(true)}>
        {items.map((x) => (
          <Link key={x.ref} href={href(locale, 'tractors', x.slug)} className="tcard">
            <span className="tc-ph studio">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={optimized(x.image, 640)} alt="" loading="lazy" />
            </span>
            <span className="tc-b">{x.brand}</span>
            <span className="tc-n">{x.name}</span>
            <span className="tc-s">{x.specs}</span>
            <span className="tc-p">
              {x.priceHt != null ? (
                <>
                  {m.product.from} <b>{formatEur(x.priceHt, locale)}</b> {m.product.excl}
                </>
              ) : (
                m.product.priceOnRequest
              )}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function MachineShowcase({ locale, families }: { locale: Locale; families: ShowFamily[] }) {
  const m = t(locale);
  const groups = MACHINE_GROUPS.map((g) => ({ ...g, items: families.filter((f) => g.types.includes(f.category)) })).filter((g) => g.items.length);
  const [current, setCurrent] = useState(groups[0]?.key);
  const group = groups.find((g) => g.key === current) ?? groups[0];
  if (!group) return null;
  return (
    <section className="section container home-sec" aria-labelledby="mach-t">
      <div className="section-head">
        <div>
          <span className="eyebrow">{m.home.machinesEyebrow}</span>
          <h2 className="wide" id="mach-t" style={{ textTransform: 'uppercase', marginTop: 6 }}>{m.home.machinesTitle}</h2>
        </div>
        <Link className="link" href={href(locale, 'machines')}>{m.home.machinesAll} →</Link>
      </div>
      <div className="seg mtabs" role="group" aria-label="Catégories">
        {groups.map((g) => (
          <button key={g.key} type="button" aria-pressed={g.key === group.key} onClick={() => setCurrent(g.key)}>
            {locale === 'nl' ? g.nl : g.fr} <span className="cnt">{g.items.length}</span>
          </button>
        ))}
      </div>
      <div className="mgrid">
        {group.items.map((f) => (
          <Link key={f.key} href={href(locale, 'machines', f.slug)} className="mcard2">
            <span className="m2-ph studio">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {f.image && <img src={optimized(f.image, 640)} alt="" loading="lazy" />}
            </span>
            <span className="tc-b">{f.brand}</span>
            <span className="m2-n">{f.name}</span>
            <span className="tc-s">
              {[m.machineTypes[f.category] ?? f.category, f.widths ? (f.widths[0] === f.widths[1] ? `${f.widths[0]} cm` : `${f.widths[0]}–${f.widths[1]} cm`) : null, f.minPower ? `${m.home.from} ${f.minPower} ${m.product.hp}` : null]
                .filter(Boolean)
                .join(' · ')}
            </span>
            <span className="tc-p">
              {f.minPrice != null ? (
                <>
                  {m.product.from} <b>{formatEur(f.minPrice, locale)}</b> {m.product.excl}
                </>
              ) : (
                m.product.priceOnRequest
              )}
              {f.count > 1 ? ` · ${f.count} ${m.home.versions}` : ''}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
