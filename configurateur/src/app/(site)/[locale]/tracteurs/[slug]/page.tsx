import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductBySlug, highlightsOf, nameOf, descOf } from '@/lib/catalog';
import { company } from '@/lib/config';
import { href, t, type Locale } from '@/lib/i18n';
import { formatEur, withVat } from '@/lib/money';
import { embedUrl } from '@/lib/video';
import { ProductGallery } from '@/components/ProductGallery';


export const revalidate = 300;

export async function generateMetadata({ params }: { params: { locale: Locale; slug: string } }): Promise<Metadata> {
  const p = await getProductBySlug('tractor', params.slug);
  if (!p) return {};
  const title = `${p.brand} ${nameOf(p, params.locale)}`;
  const description = descOf(p, params.locale).slice(0, 160) || t(params.locale).meta.description;
  return {
    title,
    description,
    alternates: {
      canonical: href(params.locale, 'tractors', p.slug),
      languages: { 'fr-BE': href('fr', 'tractors', p.slug), 'nl-BE': href('nl', 'tractors', p.slug) },
    },
    openGraph: { title, description, images: p.images[0] ? [{ url: p.images[0] }] : [] },
  };
}

export default async function TractorPage({ params }: { params: { locale: Locale; slug: string } }) {
  const { locale } = params;
  const m = t(locale);
  const p = await getProductBySlug('tractor', params.slug);
  if (!p) notFound();
  const name = nameOf(p, locale);
  const highlights = highlightsOf(p, locale);
  const video = embedUrl(p.videoUrl);
  const kv: [string, string | null][] = [
    [m.product.power, p.powerHp != null ? `${String(p.powerHp).replace('.', ',')} ${m.product.hp}` : null],
    [m.product.transmission, p.transmission],
    [m.product.lift, p.liftCapacityKg ? `${p.liftCapacityKg} kg` : null],
    [m.product.pto, p.ptoType],
    [m.product.hitch, p.hitchCategory],
    [m.product.weight, p.weightKg ? `${p.weightKg} kg` : null],
  ];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${p.brand} ${name}`,
    brand: { '@type': 'Brand', name: p.brand },
    sku: p.ref,
    image: p.images.slice(0, 5),
    description: descOf(p, locale),
    category: 'Tracteur',
    ...(p.priceHt != null
      ? {
          offers: {
            '@type': 'Offer',
            priceCurrency: 'EUR',
            price: (withVat(p.priceHt) / 100).toFixed(2),
            priceSpecification: { '@type': 'UnitPriceSpecification', price: (withVat(p.priceHt) / 100).toFixed(2), priceCurrency: 'EUR', valueAddedTaxIncluded: true },
            availability: p.availability === 'en_stock' ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
            seller: { '@type': 'Organization', name: company.name },
            url: company.siteUrl + href(locale, 'tractors', p.slug),
          },
        }
      : {}),
  };

  return (
    <div className="container">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav className="breadcrumbs" aria-label="Fil d'Ariane">
        <Link href={`/${locale}`}>{company.name}</Link>/<Link href={href(locale, 'tractors')}>{m.nav.tractors}</Link>/<span>{p.brand} {name}</span>
      </nav>
      <div className="product">
        <div style={{ display: 'grid', gap: 40, minWidth: 0 }}>
          <ProductGallery name={`${p.brand} ${name}`} images={p.images} spinUrl={p.spinUrl} spinFrames={p.spinFrames ?? 36} modelUrl={p.modelUrl} labels={{ photos: m.product.gallery, spin: m.product.spin, drag: m.cfg.dragHint }} />
          {descOf(p, locale) && <div className="prose">{descOf(p, locale)}</div>}
          {p.specs.length > 0 && (
            <section>
              <h2 className="wide" style={{ fontSize: 22, textTransform: 'uppercase', marginBottom: 12 }}>{m.product.specs}</h2>
              <div style={{ overflowX: 'auto' }}>
                <table className="spec-table">
                  <tbody>
                    {p.specs.map((s) => (
                      <tr key={s.label}>
                        <th scope="row">{s.label}</th>
                        <td>{s.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {video && (
            <section>
              <h2 className="wide" style={{ fontSize: 22, textTransform: 'uppercase', marginBottom: 12 }}>{m.product.video}</h2>
              <iframe className="video-frame" src={video} title={`${p.brand} ${name}`} loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen />
            </section>
          )}
        </div>

        <aside className="product-info">
          <div style={{ display: 'grid', gap: 8 }}>
            <span className="eyebrow">{p.brand} · {m.categories[p.category] ?? p.category}</span>
            <h1 className="display">{name}</h1>
          </div>
          <div className="price-block">
            {p.priceHt != null ? (
              <>
                <span className="from">{m.product.from}</span>
                <span className="big">{formatEur(p.priceHt, locale)} <span className="muted" style={{ fontSize: 15, fontWeight: 400 }}>{m.product.excl}</span></span>
                <span className="muted">{formatEur(withVat(p.priceHt), locale)} {m.product.incl}</span>
              </>
            ) : (
              <span className="big" style={{ fontSize: 26 }}>{m.product.priceOnRequest}</span>
            )}
            <span className="chip" style={{ justifySelf: 'start', marginTop: 8 }}>
              {m.product.availability[p.availability]}{p.leadTime ? ` · ${m.product.leadTime} ${p.leadTime}` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link className="btn btn-primary" href={`${href(locale, 'configurator')}?t=${encodeURIComponent(p.ref)}&e=2`}>{m.product.configure}</Link>
            <Link className="btn btn-ghost" href={`${href(locale, 'configurator')}?t=${encodeURIComponent(p.ref)}&e=7#devis`}>{m.product.requestQuote}</Link>
          </div>
          <dl className="kv" style={{ margin: 0 }}>
            {kv.filter(([, v]) => v).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {highlights.length > 0 && (
            <div>
              <h2 className="eyebrow" style={{ marginBottom: 10 }}>{m.product.highlights}</h2>
              <ul className="ticks">{highlights.map((h) => <li key={h}>{h}</li>)}</ul>
            </div>
          )}
          {p.brochureUrl && (
            <a className="link" href={p.brochureUrl} target="_blank" rel="noopener">↓ {m.product.brochure} (PDF)</a>
          )}
        </aside>
      </div>
    </div>
  );
}
