import type { Metadata } from 'next';
import { getCatalog } from '@/lib/catalog';
import { href, t, type Locale } from '@/lib/i18n';
import { ProductCard } from '@/components/ProductCard';
import { FilterLinks } from '@/components/FilterLinks';

export const revalidate = 300;

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  const m = t(params.locale);
  return { title: m.nav.machines, alternates: { canonical: href(params.locale, 'machines'), languages: { 'fr-BE': href('fr', 'machines'), 'nl-BE': href('nl', 'machines') } } };
}

export default async function Machines({ params, searchParams }: { params: { locale: Locale }; searchParams: { marque?: string; type?: string } }) {
  const { locale } = params;
  const m = t(locale);
  const { machines } = await getCatalog(locale);
  const base = href(locale, 'machines');
  const list = machines.filter((x) => (!searchParams.marque || x.brand === searchParams.marque) && (!searchParams.type || x.category === searchParams.type));
  // Une carte par famille (les largeurs sont choisies sur la fiche ou dans le configurateur).
  const families = new Map<string, typeof list>();
  for (const x of list) families.set(x.family, [...(families.get(x.family) ?? []), x]);
  const brands = [...new Set(machines.map((x) => x.brand))].sort();
  const types = [...new Set(machines.filter((x) => !searchParams.marque || x.brand === searchParams.marque).map((x) => x.category))];
  return (
    <div className="container" style={{ paddingBlock: '40px 80px' }}>
      <div className="section-head">
        <div>
          <span className="eyebrow">{families.size} {m.product.models}</span>
          <h1 className="display" style={{ fontSize: 'clamp(34px, 5vw, 60px)', marginTop: 8 }}>{m.nav.machines}</h1>
        </div>
      </div>
      <div className="filters">
        <FilterLinks label={m.cfg.filterBrand} param="marque" value={searchParams.marque} items={brands.map((b) => [b, b])} base={base} params={{ marque: searchParams.marque }} any={m.product.all} />
        <FilterLinks label={m.cfg.filterType} param="type" value={searchParams.type} items={types.map((ty) => [ty, m.machineTypes[ty] ?? ty])} base={base} params={{ ...searchParams }} any={m.product.all} />
      </div>
      <div className="grid-cards">
        {[...families.values()].map((items, i) => {
          const x = items[0];
          const widths = items.map((y) => y.workingWidthCm).filter(Boolean) as number[];
          const prices = items.map((y) => y.priceHt).filter((v): v is number => v != null);
          return (
            <ProductCard
              key={x.family}
              locale={locale}
              priority={i < 4}
              item={{
                href: href(locale, 'machines', x.slug),
                brand: x.brand,
                name: x.familyName ?? x.name,
                image: items.find((y) => y.image)?.image ?? null,
                priceHt: prices.length ? Math.min(...prices) : null,
                chips: [m.machineTypes[x.category] ?? x.category, widths.length ? `${Math.min(...widths)}–${Math.max(...widths)} cm`.replace(/^(\d+)–\1/, '$1') : null, x.minPowerHp ? `≥ ${x.minPowerHp} ${m.product.hp}` : null].filter(Boolean) as string[],
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
