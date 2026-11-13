import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { products } from '@/db/schema';
import { productToRow } from '@/lib/import';
import { Shell } from '@/components/admin/Shell';
import { ProductForm } from './ProductForm';
import { deleteProduct } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function AdminProduct({ params }: { params: { id: string } }) {
  const isNew = params.id === 'nouveau';
  const [p] = isNew ? [null] : await db.select().from(products).where(eq(products.id, Number(params.id))).limit(1);
  if (!isNew && !p) notFound();
  return (
    <Shell current="/admin/produits">
      <div className="a-head">
        <div>
          <Link href="/admin/produits" className="a-muted">← Produits</Link>
          <h1>{p ? `${p.brand} ${p.nameFr}` : 'Nouveau produit'}</h1>
          {p?.sourceUrl && <a className="a-muted" href={p.sourceUrl} target="_blank" rel="noopener">Source : {new URL(p.sourceUrl).hostname} ↗</a>}
        </div>
        {p && (
          <a className="a-btn" href={`/fr/${p.kind === 'tractor' ? 'tracteurs' : 'machines'}/${p.slug}`} target="_blank" rel="noopener">Voir la fiche ↗</a>
        )}
      </div>
      {p?.notes && <p className="a-msg" style={{ background: '#fffbeb', color: '#7a5a00', borderColor: '#fde68a' }}>Note : {p.notes}</p>}
      <ProductForm id={p?.id ?? 0} row={p ? productToRow(p) : { type: 'tracteur', actif: 'oui', disponibilite: 'sur_commande', vue360_images: '36' }} />
      {p && (
        <form action={deleteProduct} className="a-card">
          <input type="hidden" name="id" value={p.id} />
          <h2>Supprimer</h2>
          <p className="a-muted">Pour masquer temporairement le produit, décochez plutôt « Actif ». Les devis existants ne sont pas modifiés.</p>
          <label className="a-filters"><input type="checkbox" required /> Je confirme la suppression</label>
          <button className="a-btn danger" style={{ marginTop: 8 }}>Supprimer ce produit</button>
        </form>
      )}
    </Shell>
  );
}
