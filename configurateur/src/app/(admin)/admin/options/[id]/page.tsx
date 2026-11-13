import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { options } from '@/db/schema';
import { optionToRow } from '@/lib/import';
import { Shell } from '@/components/admin/Shell';
import { OptionForm } from './OptionForm';
import { deleteOption } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function AdminOption({ params }: { params: { id: string } }) {
  const isNew = params.id === 'nouveau';
  const [o] = isNew ? [null] : await db.select().from(options).where(eq(options.id, Number(params.id))).limit(1);
  if (!isNew && !o) notFound();
  return (
    <Shell current="/admin/options">
      <div>
        <Link href="/admin/options" className="a-muted">← Options</Link>
        <h1>{o ? o.nameFr : 'Nouvelle option'}</h1>
      </div>
      <OptionForm id={o?.id ?? 0} row={o ? optionToRow(o) : { groupe: 'option', tracteurs: '*', actif: 'oui' }} />
      {o && (
        <form action={deleteOption} className="a-card">
          <input type="hidden" name="id" value={o.id} />
          <label className="a-filters"><input type="checkbox" required /> Je confirme la suppression</label>
          <button className="a-btn danger" style={{ marginTop: 8 }}>Supprimer cette option</button>
        </form>
      )}
    </Shell>
  );
}
