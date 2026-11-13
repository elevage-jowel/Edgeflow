import type { Metadata } from 'next';
import Link from 'next/link';
import { getCatalog } from '@/lib/catalog';
import { href, t, type Locale } from '@/lib/i18n';
import { ProductCard, hp } from '@/components/ProductCard';
import { FilterLinks } from '@/components/FilterLinks';

export const revalidate = 300;

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  const m = t(params.locale);
  return { title: m.nav.tractors, description: m.meta.description, alternates: { canonical: href(params.locale, 'tractors'), languages: { 'fr-BE': href('fr', 'tractors'), 'nl-BE': href('nl', 'tractors') } } };
}

type SP = { puissance?: string; usage?: string; marque?: string };

export default async function Tractors({ params, searchParams }: { params: { locale: Locale }; searchParams: SP }) {
  const { locale } = params;
  const m = t(locale);
  const { tractors } = await getCatalog(locale);
  const base = href(locale, 'tractors');
  const list = tractors.filter(
    (x) =>
      (!searchParams.puissance || x.category === searchParams.puissance) &&
      (!searchParams.usage || x.usages.includes(searchParams.usage)) &&
      (!searchParams.marque || x.brand === searchParams.marque),
  );
  const bands = ['electrique', 'compact-18-30', 'compact-30-50', 'plus-50'].filter((b) => tractors.some((x) => x.category === b));
  const usages = ['prairie', 'pelouse', 'cour', 'maraichage'].filter((u) => tractors.some((x) => x.usages.includes(u)));
  const brands = [...new Set(tractors.map((x) => x.brand))];
  return (
    <div className="container" style={{ paddingBlock: '40px 80px' }}>
      <div className="section-head">
        <div>
          <span className="eyebrow">{list.length} {m.product.models}</span>
          <h1 className="display" style={{ fontSize: 'clamp(34px, 5vw, 60px)', marginTop: 8 }}>{m.nav.tractors}</h1>
        </div>
        <Link className="btn btn-primary" href={href(locale, 'configurator')}>{m.home.cta}</Link>
      </div>
      <div className="filters">
        <FilterLinks label={m.cfg.filterPower} param="puissance" value={searchParams.puissance} items={bands.map((b) => [b, m.categories[b]])} base={base} params={{ ...searchParams }} any={m.product.all} />
        <FilterLinks label={m.cfg.filterUsage} param="usage" value={searchParams.usage} items={usages.map((u) => [u, m.usages[u]])} base={base} params={{ ...searchParams }} any={m.product.all} />
        <FilterLinks label={m.cfg.filterBrand} param="marque" value={searchParams.marque} items={brands.map((b) => [b, b])} base={base} params={{ ...searchParams }} any={m.product.all} />
      </div>
      <div className="grid-cards">
        {list.map((x, i) => (
          <ProductCard
            key={x.ref}
            locale={locale}
            priority={i < 4}
            item={{
              href: href(locale, 'tractors', x.slug),
              brand: x.brand,
              name: x.name,
              image: x.image,
              priceHt: x.priceHt,
              chips: [hp(x.powerHp, locale), x.transmission, x.liftCapacityKg ? `${x.liftCapacityKg} kg` : null].filter(Boolean) as string[],
              badge: x.category === 'electrique' ? m.categories.electrique : undefined,
            }}
          />
        ))}
      </div>
      {!list.length && (
        <p className="notice info">
          {m.product.noResult} <Link className="link" href={base}>{m.product.reset}</Link>
        </p>
      )}
    </div>
  );
}
