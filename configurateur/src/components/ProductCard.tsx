import Link from 'next/link';
import Image from 'next/image';
import { formatEur } from '@/lib/money';
import { t, type Locale } from '@/lib/i18n';

export type CardItem = {
  href: string;
  brand: string;
  name: string;
  image: string | null;
  priceHt: number | null;
  chips: string[];
  badge?: string;
};

export function ProductCard({ item, locale, priority }: { item: CardItem; locale: Locale; priority?: boolean }) {
  const m = t(locale).product;
  return (
    <Link href={item.href} className="card">
      {item.badge && <span className="badge">{item.badge}</span>}
      <div className="media studio">
        {item.image ? (
          <Image src={item.image} alt={`${item.brand} ${item.name}`} width={600} height={450} sizes="(max-width: 640px) 90vw, 320px" priority={priority} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <span style={{ color: '#7b857e', fontSize: 13 }}>{item.brand}</span>
        )}
      </div>
      <div className="body">
        <span className="brand">{item.brand}</span>
        <h2 className="card-title">{item.name}</h2>
        {item.chips.length > 0 && (
          <div className="specs">
            {item.chips.map((c) => (
              <span className="chip" key={c}>{c}</span>
            ))}
          </div>
        )}
        <div className="price">
          {item.priceHt != null ? (
            <>
              <small>{m.from}</small>
              <span>
                <b>{formatEur(item.priceHt, locale)}</b> <small>{m.excl}</small>
              </span>
            </>
          ) : (
            <small>{m.priceOnRequest}</small>
          )}
        </div>
      </div>
    </Link>
  );
}

export const hp = (v: number | null, locale: Locale = 'fr') => (v == null ? null : `${String(v).replace('.', ',')} ${t(locale).product.hp}`);
