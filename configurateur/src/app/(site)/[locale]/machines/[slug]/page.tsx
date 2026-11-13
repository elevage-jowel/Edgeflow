import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCatalog, getProductBySlug, highlightsOf, nameOf, descOf } from '@/lib/catalog';
import { checkMachine } from '@/lib/compat';
import { company } from '@/lib/config';
import { href, t, type Locale } from '@/lib/i18n';
import { formatEur, withVat } from '@/lib/money';
import { embedUrl } from '@/lib/video';
import { ProductGallery } from '@/components/ProductGallery';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { locale: Locale; slug: string } }): Promise<Metadata> {
  const p = await getProductBySlug('machine', params.slug);
  if (!p) return {};
  return {
    title: `${p.brand} ${nameOf(p, params.locale)}`,
    description: descOf(p, params.locale).slice(0, 160),
    alternates: { canonical: href(params.locale, 'machines', p.slug), languages: { 'fr-BE': href('fr', 'machines', p.slug), 'nl-BE': href('nl', 'machines', p.slug) } },
  };
}

export default async function MachinePage({ params }: { params: { locale: Locale; slug: string } }) {
  const { locale } = params;
  const m = t(locale);
  const p = await getProductBySlug('machine', params.slug);
  if (!p) notFound();
  const catalog = await getCatalog(locale);
  const self = catalog.machines.find((x) => x.ref === p.ref)!;
  const siblings = catalog.machines.filter((x) => x.family === self.family).sort((a, b) => (a.workingWidthCm ?? 0) - (b.workingWidthCm ?? 0));
  // Tracteurs compatibles (relevage avant / chargeur supposés ajoutés si disponibles en option).
  const compatible = catalog.tractors.filter((tr) => {
    const feats = new Set(catalog.options.filter((o) => o.feature && (o.tractorRefs === '*' || o.tractorRefs.includes(tr.ref))).map((o) => o.feature!));
    return checkMachine(tr, self, feats).verdict !== 'block';
  });
  const name = nameOf(p, locale);
  const video = embedUrl(p.videoUrl);
  const kv: [string, string | null][] = [
    [m.product.workingWidth, p.workingWidthCm ? `${p.workingWidthCm} cm` : null],
    [m.product.minPower, p.minPowerHp ? `${p.minPowerHp}${p.maxPowerHp ? `–${p.maxPowerHp}` : '+'} ${m.product.hp}` : null],
    [m.product.mount, p.mount ? m.product.mounts[p.mount] : null],
    [m.product.pto, p.ptoType],
    [m.product.hitch, p.hitchCategory],
    [m.product.weight, p.weightKg ? `${p.weightKg} kg` : null],
  ];
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: `${p.brand} ${name}`, brand: { '@type': 'Brand', name: p.brand }, sku: p.ref, image: p.images.slice(0, 5),
    description: descOf(p, locale),
    ...(p.priceHt != null ? { offers: { '@type': 'Offer', priceCurrency: 'EUR', price: (withVat(p.priceHt) / 100).toFixed(2), availability: 'https://schema.org/PreOrder', seller: { '@type': 'Organization', name: company.name } } } : {}),
  };
  return (
    <div className="container">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav className="breadcrumbs" aria-label="Fil d'Ariane">
        <Link href={`/${locale}`}>{company.name}</Link>/<Link href={href(locale, 'machines')}>{m.nav.machines}</Link>/<span>{p.brand} {name}</span>
      </nav>
      <div className="product">
        <div style={{ display: 'grid', gap: 40, minWidth: 0 }}>
          <ProductGallery name={name} images={p.images} spinUrl={p.spinUrl} spinFrames={p.spinFrames ?? 36} modelUrl={p.modelUrl} labels={{ photos: m.product.gallery, spin: m.product.spin, drag: m.cfg.dragHint }} />
          {descOf(p, locale) && <div className="prose">{descOf(p, locale)}</div>}
          {p.specs.length > 0 && (
            <section>
              <h2 className="wide" style={{ fontSize: 22, textTransform: 'uppercase', marginBottom: 12 }}>{m.product.specs}</h2>
              <table className="spec-table"><tbody>{p.specs.map((s) => <tr key={s.label}><th scope="row">{s.label}</th><td>{s.value}</td></tr>)}</tbody></table>
            </section>
          )}
          {video && <iframe className="video-frame" src={video} title={name} loading="lazy" allowFullScreen />}
        </div>
        <aside className="product-info">
          <div style={{ display: 'grid', gap: 8 }}>
            <span className="eyebrow">{p.brand} · {m.machineTypes[p.category] ?? p.category}</span>
            <h1 className="display" style={{ fontSize: 'clamp(26px, 3.4vw, 42px)' }}>{name}</h1>
          </div>
          <div className="price-block">
            {p.priceHt != null ? (
              <>
                <span className="big">{formatEur(p.priceHt, locale)} <span className="muted" style={{ fontSize: 15, fontWeight: 400 }}>{m.product.excl}</span></span>
                <span className="muted">{formatEur(withVat(p.priceHt), locale)} {m.product.incl}</span>
              </>
            ) : <span className="big" style={{ fontSize: 26 }}>{m.product.priceOnRequest}</span>}
          </div>
          {siblings.length > 1 && (
            <div className="filter-group">
              <span>{m.cfg.widths}</span>
              <div className="seg">
                {siblings.map((s) => (
                  <Link key={s.ref} href={href(locale, 'machines', s.slug)} aria-current={s.ref === p.ref ? 'true' : undefined}>
                    {s.workingWidthCm ? `${s.workingWidthCm} cm` : s.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <dl className="kv" style={{ margin: 0 }}>
            {kv.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
          {highlightsOf(p, locale).length > 0 && <ul className="ticks">{highlightsOf(p, locale).map((h) => <li key={h}>{h}</li>)}</ul>}
          {compatible.length > 0 && (
            <div>
              <h2 className="eyebrow" style={{ marginBottom: 10 }}>{m.product.compatibleTractors}</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {compatible.slice(0, 18).map((tr) => (
                  <Link key={tr.ref} className="chip" href={`${href(locale, 'configurator')}?t=${encodeURIComponent(tr.ref)}&m=${encodeURIComponent(p.ref)}&e=6`}>
                    {tr.brand} {tr.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {p.brochureUrl && <a className="link" href={p.brochureUrl} target="_blank" rel="noopener">↓ {m.product.brochure} (PDF)</a>}
        </aside>
      </div>
    </div>
  );
}
