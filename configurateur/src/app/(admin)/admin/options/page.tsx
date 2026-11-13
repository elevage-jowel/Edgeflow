import Link from 'next/link';
import { and, asc, eq, ilike, or } from 'drizzle-orm';
import { db } from '@/db';
import { options, type OptionGroup } from '@/db/schema';
import { Shell, euroInput } from '@/components/admin/Shell';
import { quickPrice } from '../actions';

export const dynamic = 'force-dynamic';
const GROUPS: [OptionGroup, string][] = [['pneus', 'Pneumatiques'], ['poste', 'Poste de conduite'], ['option', 'Options'], ['chargeur', 'Chargeurs'], ['outil', 'Outils chargeur']];

export default async function AdminOptions({ searchParams }: { searchParams: { groupe?: string; q?: string } }) {
  const group = GROUPS.find(([g]) => g === searchParams.groupe)?.[0];
  const q = searchParams.q?.trim();
  const list = await db
    .select()
    .from(options)
    .where(and(group ? eq(options.group, group) : undefined, q ? or(ilike(options.nameFr, `%${q}%`), ilike(options.ref, `%${q}%`), ilike(options.tractorRefs, `%${q}%`)) : undefined))
    .orderBy(asc(options.group), asc(options.ref));
  return (
    <Shell current="/admin/options">
      <div className="a-head">
        <h1>Options <span className="a-muted" style={{ fontSize: 15 }}>({list.length})</span></h1>
        <Link className="a-btn primary" href="/admin/options/nouveau">+ Nouvelle option</Link>
      </div>
      <form className="a-filters" method="get">
        <input className="a-input" name="q" defaultValue={q} placeholder="Nom, référence ou tracteur…" style={{ maxWidth: 300 }} />
        <select className="a-select" name="groupe" defaultValue={group ?? ''} style={{ maxWidth: 200 }}>
          <option value="">Tous les groupes</option>{GROUPS.map(([g, l]) => <option key={g} value={g}>{l}</option>)}
        </select>
        <button className="a-btn">Filtrer</button>
      </form>
      <div className="a-table-wrap">
        <table className="a-table">
          <thead><tr><th>Référence</th><th>Groupe</th><th>Nom</th><th>Tracteurs</th><th>Règles</th><th className="num">Prix HT (€)</th></tr></thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/options/${o.id}`} style={{ fontWeight: 600 }}>{o.ref}</Link></td>
                <td>{GROUPS.find(([g]) => g === o.group)?.[1]}</td>
                <td>{o.nameFr}{o.tireFront || o.tireRear ? <><br /><span className="a-muted">AV {o.tireFront ?? '—'} · AR {o.tireRear ?? '—'}</span></> : null}</td>
                <td className="a-muted" style={{ maxWidth: 260 }}>{o.tractorRefs}</td>
                <td className="a-muted">{[o.defaultFor && 'par défaut', o.requiresAny && `nécessite ${o.requiresAny}`, o.feature && `fonction ${o.feature}`].filter(Boolean).join(' · ')}</td>
                <td className="num">
                  <form action={quickPrice} style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="table" value="options" />
                    <input className="a-input" name="price" defaultValue={euroInput(o.priceHt)} placeholder="sur demande" style={{ width: 110, textAlign: 'right' }} inputMode="decimal" />
                    <button className="a-btn sm" title="Enregistrer le prix">✓</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
