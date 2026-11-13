import Link from 'next/link';
import { and, asc, eq, ilike, or } from 'drizzle-orm';
import { db } from '@/db';
import { products } from '@/db/schema';
import { Shell, euroInput } from '@/components/admin/Shell';
import { quickPrice } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AdminProducts({ searchParams }: { searchParams: { type?: string; q?: string; marque?: string } }) {
  const kind = searchParams.type === 'machine' ? 'machine' : searchParams.type === 'tracteur' ? 'tractor' : undefined;
  const q = searchParams.q?.trim();
  const list = await db
    .select()
    .from(products)
    .where(and(kind ? eq(products.kind, kind) : undefined, searchParams.marque ? eq(products.brand, searchParams.marque) : undefined, q ? or(ilike(products.nameFr, `%${q}%`), ilike(products.ref, `%${q}%`), ilike(products.category, `%${q}%`)) : undefined))
    .orderBy(asc(products.kind), asc(products.brand), asc(products.sort));
  const brands = [...new Set((await db.select({ b: products.brand }).from(products)).map((x) => x.b))].sort();
  return (
    <Shell current="/admin/produits">
      <div className="a-head">
        <h1>Produits <span className="a-muted" style={{ fontSize: 15 }}>({list.length})</span></h1>
        <div className="a-filters">
          <Link className="a-btn" href="/admin/import">Import / export</Link>
          <Link className="a-btn primary" href="/admin/produits/nouveau">+ Nouveau produit</Link>
        </div>
      </div>
      <form className="a-filters" method="get">
        <input className="a-input" name="q" defaultValue={q} placeholder="Nom, référence, catégorie…" style={{ maxWidth: 300 }} />
        <select className="a-select" name="type" defaultValue={searchParams.type ?? ''} style={{ maxWidth: 160 }}>
          <option value="">Tracteurs et machines</option><option value="tracteur">Tracteurs</option><option value="machine">Machines</option>
        </select>
        <select className="a-select" name="marque" defaultValue={searchParams.marque ?? ''} style={{ maxWidth: 160 }}>
          <option value="">Toutes les marques</option>{brands.map((b) => <option key={b}>{b}</option>)}
        </select>
        <button className="a-btn">Filtrer</button>
      </form>
      <div className="a-table-wrap">
        <table className="a-table">
          <thead><tr><th></th><th>Référence</th><th>Produit</th><th>Catégorie</th><th>Caract.</th><th className="num">Prix HT (€)</th><th>Actif</th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <td>{p.images[0] ? <img src={`/_next/image?url=${encodeURIComponent(p.images[0])}&w=128&q=60`} alt="" /> : null}</td>
                <td><Link href={`/admin/produits/${p.id}`} style={{ fontWeight: 600 }}>{p.ref}</Link></td>
                <td>{p.brand} {p.nameFr}</td>
                <td>{p.kind === 'tractor' ? 'Tracteur' : 'Machine'} · {p.category}</td>
                <td className="a-muted">
                  {p.kind === 'tractor'
                    ? [p.powerHp && `${p.powerHp} ch`, p.liftCapacityKg && `${p.liftCapacityKg} kg`, p.hitchCategory].filter(Boolean).join(' · ')
                    : [p.workingWidthCm && `${p.workingWidthCm} cm`, p.minPowerHp && `≥ ${p.minPowerHp} ch`, p.mount].filter(Boolean).join(' · ')}
                </td>
                <td className="num">
                  <form action={quickPrice} style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="table" value="products" />
                    <input className="a-input" name="price" defaultValue={euroInput(p.priceHt)} placeholder="sur demande" style={{ width: 110, textAlign: 'right' }} inputMode="decimal" />
                    <button className="a-btn sm" title="Enregistrer le prix">✓</button>
                  </form>
                </td>
                <td>{p.active ? 'Oui' : <span className="a-muted">Non</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
