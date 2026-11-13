import Link from 'next/link';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { quotes, type QuoteStatus } from '@/db/schema';
import { Shell, STATUSES, StatusPill, eur } from '@/components/admin/Shell';
import { setQuoteStatus } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminQuotes({ searchParams }: { searchParams: { statut?: string; q?: string; supprime?: string } }) {
  const status = STATUSES.some(([k]) => k === searchParams.statut) ? (searchParams.statut as QuoteStatus) : undefined;
  const q = searchParams.q?.trim();
  const where = and(
    status ? eq(quotes.status, status) : undefined,
    q ? or(ilike(quotes.customerName, `%${q}%`), ilike(quotes.email, `%${q}%`), ilike(quotes.number, `%${q}%`), ilike(quotes.company, `%${q}%`)) : undefined,
  );
  const [list, counts] = await Promise.all([
    db.select().from(quotes).where(where).orderBy(desc(quotes.createdAt)).limit(300),
    db.select({ status: quotes.status, n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${quotes.totalHt}),0)::bigint` }).from(quotes).groupBy(quotes.status),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  const pipeline = counts.filter((c) => c.status === 'nouveau' || c.status === 'en_cours' || c.status === 'envoye').reduce((a, c) => a + Number(c.total), 0);
  const exportHref = `/admin/export/devis.csv${status ? `?statut=${status}` : ''}`;

  return (
    <Shell current="/admin">
      <div className="a-head">
        <h1>Demandes de devis</h1>
        <a className="a-btn" href={exportHref}>Exporter en CSV</a>
      </div>
      {searchParams.supprime && <p className="a-msg">Devis supprimé.</p>}
      <div className="a-kpis">
        {STATUSES.map(([k, l]) => (
          <Link key={k} href={`/admin?statut=${k}`} className="a-card" style={{ textDecoration: 'none' }}>
            <span>{l}</span>
            <b>{count(k)}</b>
          </Link>
        ))}
        <div className="a-card"><span>En cours (HT)</span><b>{eur(pipeline)}</b></div>
      </div>
      <form className="a-filters" method="get">
        <input className="a-input" name="q" defaultValue={q} placeholder="Rechercher : nom, e-mail, n° de devis…" style={{ maxWidth: 360 }} />
        <select className="a-select" name="statut" defaultValue={status ?? ''} style={{ maxWidth: 180 }}>
          <option value="">Tous les statuts</option>
          {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <button className="a-btn">Filtrer</button>
        {(q || status) && <Link className="a-btn" href="/admin">Effacer</Link>}
      </form>
      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr><th>N°</th><th>Date</th><th>Client</th><th>Tracteur</th><th className="num">Total HT</th><th>Reprise / financement</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {list.map((x) => (
              <tr key={x.id}>
                <td><Link href={`/admin/devis/${x.id}`} style={{ fontWeight: 700 }}>{x.number}</Link></td>
                <td>{new Date(x.createdAt).toLocaleDateString('fr-BE')} <span className="a-muted">{new Date(x.createdAt).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}</span></td>
                <td>
                  <b>{x.customerName}</b>{x.company ? ` · ${x.company}` : ''}
                  <br /><span className="a-muted">{x.email} · {x.phone}</span>
                </td>
                <td>{x.lines[0]?.label}<br /><span className="a-muted">{x.lines.length - 1} ligne(s) · {x.locale.toUpperCase()}</span></td>
                <td className="num">{eur(x.totalHt)}{x.hasPriceOnRequest && <><br /><span className="a-muted">+ sur demande</span></>}</td>
                <td>{x.tradeIn ? 'Reprise ✓' : '—'} · {x.financing === 'non' || !x.financing ? 'comptant' : x.financing}</td>
                <td>
                  <form action={setQuoteStatus} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="hidden" name="id" value={x.id} />
                    <StatusPill s={x.status} />
                    <select className="a-select" name="status" defaultValue={x.status} style={{ width: 120, padding: '4px 6px' }}>
                      {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                    <button className="a-btn sm">OK</button>
                  </form>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={7} className="a-muted">Aucune demande pour le moment.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
