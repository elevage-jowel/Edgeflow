import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { quotes } from '@/db/schema';
import { Shell, StatusPill, eur } from '@/components/admin/Shell';
import { quoteUrl } from '@/lib/quotes';
import { t } from '@/lib/i18n';
import { QuoteEditor } from './QuoteEditor';
import { deleteQuote } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function AdminQuote({ params }: { params: { id: string } }) {
  const [q] = await db.select().from(quotes).where(eq(quotes.id, Number(params.id))).limit(1);
  if (!q) notFound();
  const m = t('fr').quote;
  const parent = q.parentId ? (await db.select({ id: quotes.id, number: quotes.number }).from(quotes).where(eq(quotes.id, q.parentId)).limit(1))[0] : null;
  return (
    <Shell current="/admin">
      <div className="a-head">
        <div>
          <Link href="/admin" className="a-muted">← Demandes</Link>
          <h1>Devis {q.number} <StatusPill s={q.status} /></h1>
          <span className="a-muted">Reçu le {new Date(q.createdAt).toLocaleString('fr-BE')}{q.sentAt ? ` · envoyé le ${new Date(q.sentAt).toLocaleString('fr-BE')}` : ''} · langue {q.locale.toUpperCase()}</span>
        </div>
        <div className="a-filters">
          <a className="a-btn" href={`/api/quotes/${q.token}/pdf`} target="_blank" rel="noopener">PDF</a>
          <a className="a-btn" href={quoteUrl(q)} target="_blank" rel="noopener">Page client ↗</a>
        </div>
      </div>
      <div className="a-grid">
        <div className="a-card">
          <QuoteEditor
            id={q.id}
            lines={q.lines}
            discount={q.discountHt}
            status={q.status}
            validUntil={String(q.validUntil)}
            adminNote={q.adminNote ?? ''}
            vatRate={q.vatRate}
          />
        </div>
        <div style={{ display: 'grid', gap: 18 }}>
          <div className="a-card">
            <h2>Client</h2>
            <p><b>{q.customerName}</b>{q.company ? <><br />{q.company}</> : null}{q.vatNumber ? <><br />TVA {q.vatNumber}</> : null}</p>
            <p><a href={`mailto:${q.email}`}>{q.email}</a><br /><a href={`tel:${q.phone}`}>{q.phone}</a><br />{q.address}</p>
            <p className="a-muted">Consentement RGPD : {new Date(q.consentAt).toLocaleString('fr-BE')}</p>
          </div>
          <div className="a-card">
            <h2>Demande</h2>
            <p>Financement : <b>{m.financingOptions[q.financing ?? 'non'] ?? q.financing}</b><br />Délai souhaité : <b>{q.desiredDelay ? m.delayOptions[q.desiredDelay] : '—'}</b></p>
            {q.remarks && <p style={{ whiteSpace: 'pre-line' }}>« {q.remarks} »</p>}
            {parent && <p className="a-muted">Modification du devis <Link href={`/admin/devis/${parent.id}`}>{parent.number}</Link></p>}
          </div>
          <div className="a-card">
            <h2>Reprise</h2>
            {q.tradeIn ? (
              <>
                <p>{[q.tradeIn.brand, q.tradeIn.model, q.tradeIn.year].filter(Boolean).join(' · ') || '—'}</p>
                <div className="a-filters">
                  {(q.tradeIn.photos ?? []).map((p) => (
                    <a key={p} href={p} target="_blank" rel="noopener">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p} alt="Photo reprise" style={{ width: 88, height: 66, objectFit: 'cover', borderRadius: 8 }} />
                    </a>
                  ))}
                </div>
              </>
            ) : <p className="a-muted">Pas de reprise.</p>}
          </div>
          <div className="a-card">
            <h2>Montants</h2>
            <div className="a-sum" style={{ maxWidth: 'none' }}>
              <div><span>Sous-total HT</span><b>{eur(q.subtotalHt)}</b></div>
              <div><span>Remise</span><b>- {eur(q.discountHt)}</b></div>
              <div><span>TVA {q.vatRate} %</span><b>{eur(q.vatAmount)}</b></div>
              <div className="big"><span>Total TVAC</span><span>{eur(q.totalTtc)}</span></div>
            </div>
          </div>
          <form action={deleteQuote} className="a-card">
            <input type="hidden" name="id" value={q.id} />
            <h2>Suppression (RGPD)</h2>
            <p className="a-muted">Efface définitivement la demande et les données du client.</p>
            <label className="a-filters"><input type="checkbox" required /> Je confirme la suppression</label>
            <button className="a-btn danger" style={{ marginTop: 8 }}>Supprimer ce devis</button>
          </form>
        </div>
      </div>
    </Shell>
  );
}
