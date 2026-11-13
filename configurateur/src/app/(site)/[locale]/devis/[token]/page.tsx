import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCatalog } from '@/lib/catalog';
import { fill, href, t, type Locale } from '@/lib/i18n';
import { formatEur } from '@/lib/money';
import { getQuoteByToken } from '@/lib/quotes';
import { TractorVisual } from '@/components/TractorVisual';
import { visualKey } from '@/lib/compat';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function QuotePage({ params }: { params: { locale: Locale; token: string } }) {
  const { locale } = params;
  const m = t(locale);
  const q = await getQuoteByToken(params.token);
  if (!q) notFound();
  const catalog = await getCatalog(locale);
  const tractor = catalog.tractors.find((x) => x.ref === q.selection.tractor);
  const tags = visualKey(catalog.options, q.selection.options, catalog.machines, q.selection.machines).split('-');
  const d = (v: string | Date) => new Date(v).toLocaleDateString(locale === 'nl' ? 'nl-BE' : 'fr-BE');
  const eur = (c: number | null) => (c == null ? m.quote.por : formatEur(c, locale, { decimals: true }));
  const first = q.customerName.split(' ')[0];
  const fresh = Date.now() - new Date(q.createdAt).getTime() < 30 * 60 * 1000;

  return (
    <div className="container quote-page">
      <div>
        <span className="status-pill">{m.quote.status[q.status]}</span>
        <h1 className="display">
          {fresh ? fill(m.quote.thanks, { name: first }) : `${m.quote.number} ${q.number}`}
          <br />
          {fresh && m.quote.ready}
        </h1>
        {fresh && <p className="muted">{fill(m.quote.sentMail, { email: q.email })}</p>}
        <div className="viewer studio" style={{ marginTop: 22, aspectRatio: '16 / 10' }}>
          {tractor && <TractorVisual name={`${tractor.brand} ${tractor.name}`} images={tractor.images} tags={tags} />}
        </div>
        <div className="quote-meta">
          <div>{m.quote.number}<b>{q.number}</b></div>
          <div>{m.quote.date}<b>{d(q.createdAt)}</b></div>
          <div>{m.quote.validUntil}<b>{d(q.validUntil)}</b></div>
        </div>
      </div>

      <div className="sheet">
        <div className="recap">
          {q.lines.map((l, i) => (
            <div className="recap-row" key={i}>
              <span>
                <span className="cat">{m.quote.groups[l.group] ?? l.group}</span>
                {l.qty > 1 ? `${l.qty} × ` : ''}{l.label}
              </span>
              <span>{eur(l.priceHt == null ? null : l.priceHt * (l.qty || 1))}</span>
            </div>
          ))}
        </div>
        <div className="sums" style={{ paddingTop: 14 }}>
          <div><span>{m.quote.subtotal}</span><span>{eur(q.subtotalHt)}</span></div>
          {q.discountHt > 0 && <div><span>{m.quote.discount}</span><span>- {eur(q.discountHt)}</span></div>}
          {q.discountHt > 0 && <div><span>{m.quote.totalHt}</span><span>{eur(q.totalHt)}</span></div>}
          <div><span>{fill(m.quote.vatLine, { rate: q.vatRate })}</span><span>{eur(q.vatAmount)}</span></div>
          <div className="grand"><span>{m.quote.totalTtc}</span><span>{eur(q.totalTtc)}</span></div>
        </div>
        {q.hasPriceOnRequest && <p className="notice warn" style={{ marginTop: 12 }}>{m.quote.porNote}</p>}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
          <a className="btn btn-primary" href={`/api/quotes/${q.token}/pdf`} target="_blank" rel="noopener">↓ {m.quote.download}</a>
          <Link className="btn btn-ghost" href={`${href(locale, 'configurator')}?from=${q.token}&e=7`}>{m.quote.modify}</Link>
          <Link className="btn btn-ghost" href={href(locale, 'configurator')}>{m.quote.newQuote}</Link>
        </div>
      </div>
    </div>
  );
}
