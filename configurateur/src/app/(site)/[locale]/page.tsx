import Link from 'next/link';
import { getCatalog } from '@/lib/catalog';
import { company } from '@/lib/config';
import { href, t, type Locale } from '@/lib/i18n';
import { ProductCard, hp } from '@/components/ProductCard';
import { optimized } from '@/lib/image';

export const revalidate = 300;

export default async function Home({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const m = t(locale);
  const catalog = await getCatalog(locale);
  const hero = catalog.tractors.find((x) => x.spinUrl && x.ref.includes('FT26')) ?? catalog.tractors.find((x) => x.image);
  const heroImg = hero?.spinUrl ? hero.spinUrl.replace('{frame}', '1').replace('{variant}', 'base') : hero?.image;
  const bands = ['electrique', 'compact-18-30', 'compact-30-50', 'plus-50']
    .map((b) => ({ b, items: catalog.tractors.filter((x) => x.category === b) }))
    .filter((x) => x.items.length);
  const featured = [...catalog.tractors].filter((x) => x.image && x.priceHt != null).slice(0, 4).concat(
    catalog.tractors.filter((x) => x.image && x.priceHt == null && x.brand !== 'Farmtrac').filter((_, i) => i % 5 === 0).slice(0, 4),
  );
  const brands = [...new Set([...catalog.tractors.map((x) => x.brand), ...catalog.machines.map((x) => x.brand)])];

  return (
    <>
      <section className="hero">
        {heroImg && (
          <div className="hero-stage studio" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={optimized(heroImg, 1280, 75)} alt="" fetchPriority="high" />
            <span className="stage-caption">{hero?.brand} {hero?.name}</span>
          </div>
        )}
        <div className="container">
          <div className="hero-copy">
            <span className="eyebrow">{m.home.kicker}</span>
            <h1 className="display">{m.home.title}</h1>
            <p>{m.home.lead}</p>
            <div className="actions">
              <Link className="btn btn-primary" href={href(locale, 'configurator')}>{m.home.cta}</Link>
              <Link className="btn btn-ghost" href={href(locale, 'tractors')}>{m.home.secondary}</Link>
            </div>
          </div>
        </div>
      </section>

      <nav className="range-strip" aria-label={m.home.rangeTitle}>
        {bands.map(({ b, items }) => (
          <Link key={b} href={`${href(locale, 'tractors')}?puissance=${b}`}>
            <span className="count">{items.length} {m.product.models}</span>
            <b>{m.categories[b]}</b>
            <span>{m.categoryHints[b]}</span>
          </Link>
        ))}
      </nav>

      <section className="section container">
        <div className="section-head">
          <h2 className="wide" style={{ textTransform: 'uppercase' }}>{m.home.stepsTitle}</h2>
          <Link className="link" href={href(locale, 'configurator')}>{m.home.cta} →</Link>
        </div>
        <div className="steps-row">
          {m.home.steps.map(([title, text], i) => (
            <div key={title}>
              <span className="n">{i + 1}</span>
              <h3>{title}</h3>
              <p className="muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section container" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <h2 className="wide" style={{ textTransform: 'uppercase' }}>{m.home.rangeTitle}</h2>
          <Link className="link" href={href(locale, 'tractors')}>{m.home.secondary} →</Link>
        </div>
        <div className="grid-cards">
          {featured.map((x, i) => (
            <ProductCard
              key={x.ref}
              locale={locale}
              priority={i < 2}
              item={{ href: href(locale, 'tractors', x.slug), brand: x.brand, name: x.name, image: x.image, priceHt: x.priceHt, chips: [hp(x.powerHp, locale), x.transmission].filter(Boolean) as string[] }}
            />
          ))}
        </div>
      </section>

      <section className="section container" style={{ paddingTop: 0 }}>
        <div className="steps-row" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)' }}>
          <div>
            <span className="eyebrow">{m.home.brandsTitle}</span>
            <p className="wide" style={{ fontSize: 'clamp(20px, 2.4vw, 28px)', textTransform: 'uppercase', lineHeight: 1.25 }}>{brands.join(' · ')}</p>
          </div>
          <div>
            <span className="eyebrow">{m.home.visitTitle}</span>
            <p className="muted">{m.home.visitText}</p>
            <p>{company.address}<br />{company.phone}</p>
            <p className="muted" style={{ fontSize: 14 }}>{m.footer.hours}</p>
          </div>
        </div>
      </section>
    </>
  );
}
