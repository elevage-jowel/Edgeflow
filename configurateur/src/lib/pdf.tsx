import 'server-only';
/**
 * PDF du devis, aux couleurs de la concession (logo, couleur de marque),
 * avec le détail des lignes, les totaux HT / TVA / TVAC et les conditions générales.
 */
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { join } from 'node:path';
import type { Quote } from '@/db/schema';
import { company } from './config';
import { conditionsGenerales } from '@/content/legal';
import { fill, t, type Locale } from './i18n';

const INK = '#132018';
const MUTED = '#5f6b63';
const LINE = '#dfe4de';

const s = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 54, paddingHorizontal: 36, fontSize: 9.5, color: INK, fontFamily: 'Helvetica' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  logo: { width: 170, height: 27, objectFit: 'contain' },
  coords: { fontSize: 8.5, color: MUTED, textAlign: 'right', lineHeight: 1.45 },
  band: { padding: 14, borderRadius: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  sub: { fontSize: 9, color: '#d5ddd6', marginTop: 3 },
  metaBox: { flexDirection: 'row', gap: 18 },
  metaK: { fontSize: 7.5, color: '#b9c4bb', textTransform: 'uppercase' },
  metaV: { fontSize: 10, color: '#ffffff', fontFamily: 'Helvetica-Bold', marginTop: 2 },
  cols: { flexDirection: 'row', gap: 18, marginBottom: 14 },
  col: { flex: 1 },
  k: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase', marginBottom: 2 },
  v: { fontSize: 9.5, lineHeight: 1.4 },
  photo: { width: 180, height: 120, objectFit: 'contain' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 6 },
  thead: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: INK, paddingBottom: 4, marginTop: 6 },
  th: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase' },
  cGroup: { width: 95, color: MUTED, fontSize: 8.5 },
  cLabel: { flex: 1, paddingRight: 8 },
  cPrice: { width: 90, textAlign: 'right' },
  totals: { marginTop: 10, marginLeft: 'auto', width: 230 },
  tRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5 },
  tBig: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, marginTop: 6, borderRadius: 4 },
  note: { fontSize: 8, color: MUTED, marginTop: 10 },
  cgTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 6, marginTop: 4 },
  cg: { fontSize: 7.8, color: '#3c463f', lineHeight: 1.45, marginBottom: 4 },
  footer: { position: 'absolute', bottom: 22, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: MUTED },
});

function eur(cents: number | null, locale: Locale) {
  if (cents == null) return t(locale).quote.por;
  return new Intl.NumberFormat(locale === 'nl' ? 'nl-BE' : 'fr-BE', { style: 'currency', currency: 'EUR' })
    .format(cents / 100)
    .replace(/ /g, ' ');
}
const date = (d: string | Date, locale: Locale) => new Date(d).toLocaleDateString(locale === 'nl' ? 'nl-BE' : 'fr-BE');

export async function renderQuotePdf(q: Quote, image: string | null) {
  const locale = (q.locale === 'nl' ? 'nl' : 'fr') as Locale;
  const m = t(locale);
  const brand = company.brandColor;
  const logo = join(process.cwd(), 'public', 'brand', 'logo-forestar.png');
  // Photo réduite à 800 px par l'optimiseur d'images (JPEG, PDF plus léger pour l'e-mail).
  const img = image ? `${company.siteUrl}/_next/image?url=${encodeURIComponent(image)}&w=828&q=75` : null;
  const trade = q.tradeIn && (q.tradeIn.brand || q.tradeIn.model) ? [q.tradeIn.brand, q.tradeIn.model, q.tradeIn.year].filter(Boolean).join(' ') : null;

  const doc = (
    <Document title={`${m.quote.number} ${q.number}`} author={company.name} language={locale}>
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={logo} style={s.logo} />
          <View>
            <Text style={s.coords}>{company.name}</Text>
            <Text style={s.coords}>{company.address}</Text>
            <Text style={s.coords}>{company.phone} · {company.email}</Text>
            {company.vat ? <Text style={s.coords}>TVA {company.vat}</Text> : null}
          </View>
        </View>

        <View style={[s.band, { backgroundColor: INK }]}>
          <View>
            <Text style={[s.metaK, { color: brand }]}>{m.quote.status[q.status] ?? ''}</Text>
            <Text style={s.title}>{locale === 'nl' ? 'Offerte' : 'Devis'} {q.number}</Text>
            <Text style={s.sub}>{q.lines[0]?.label}</Text>
          </View>
          <View style={s.metaBox}>
            <View>
              <Text style={s.metaK}>{m.quote.date}</Text>
              <Text style={s.metaV}>{date(q.createdAt, locale)}</Text>
            </View>
            <View>
              <Text style={s.metaK}>{m.quote.validUntil}</Text>
              <Text style={s.metaV}>{date(q.validUntil, locale)}</Text>
            </View>
          </View>
        </View>

        <View style={s.cols}>
          <View style={s.col}>
            <Text style={s.k}>{m.quote.customer}</Text>
            <Text style={s.v}>{q.customerName}</Text>
            {q.company ? <Text style={s.v}>{q.company}{q.vatNumber ? ` · ${q.vatNumber}` : ''}</Text> : null}
            <Text style={s.v}>{q.address}</Text>
            <Text style={s.v}>{q.email} · {q.phone}</Text>
            {trade ? (
              <Text style={[s.v, { marginTop: 6 }]}>
                {m.quote.tradeInLabel} : {trade}
              </Text>
            ) : null}
            {q.financing && q.financing !== 'non' ? (
              <Text style={s.v}>
                {m.quote.financingLabel} : {m.quote.financingOptions[q.financing] ?? q.financing}
              </Text>
            ) : null}
            {q.desiredDelay ? (
              <Text style={s.v}>
                {m.quote.delayLabel} : {m.quote.delayOptions[q.desiredDelay] ?? q.desiredDelay}
              </Text>
            ) : null}
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {img ? <Image src={img} style={s.photo} /> : null}
        </View>

        <View style={s.thead}>
          <Text style={[s.th, s.cGroup]}>{locale === 'nl' ? 'Rubriek' : 'Rubrique'}</Text>
          <Text style={[s.th, s.cLabel]}>{locale === 'nl' ? 'Omschrijving' : 'Désignation'}</Text>
          <Text style={[s.th, s.cPrice]}>{m.product.excl}</Text>
        </View>
        {q.lines.map((l, i) => (
          <View style={s.row} key={i} wrap={false}>
            <Text style={s.cGroup}>{m.quote.groups[l.group] ?? l.group}</Text>
            <Text style={s.cLabel}>
              {l.qty > 1 ? `${l.qty} × ` : ''}
              {l.label}
              {l.ref ? `  (${l.ref})` : ''}
            </Text>
            <Text style={s.cPrice}>{eur(l.priceHt == null ? null : l.priceHt * (l.qty || 1), locale)}</Text>
          </View>
        ))}

        <View style={s.totals} wrap={false}>
          <View style={s.tRow}>
            <Text>{m.quote.subtotal}</Text>
            <Text>{eur(q.subtotalHt, locale)}</Text>
          </View>
          {q.discountHt ? (
            <View style={s.tRow}>
              <Text>{m.quote.discount}</Text>
              <Text>- {eur(q.discountHt, locale)}</Text>
            </View>
          ) : null}
          <View style={s.tRow}>
            <Text>{m.quote.totalHt}</Text>
            <Text>{eur(q.totalHt, locale)}</Text>
          </View>
          <View style={s.tRow}>
            <Text>{fill(m.quote.vatLine, { rate: q.vatRate })}</Text>
            <Text>{eur(q.vatAmount, locale)}</Text>
          </View>
          <View style={[s.tBig, { backgroundColor: brand }]}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11 }}>{m.quote.totalTtc}</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11 }}>{eur(q.totalTtc, locale)}</Text>
          </View>
        </View>
        {q.hasPriceOnRequest ? <Text style={s.note}>{m.quote.porNote}</Text> : null}
        {q.remarks ? (
          <Text style={s.note}>
            {m.quote.remarks} : {q.remarks}
          </Text>
        ) : null}

        <View break>
          <Text style={s.cgTitle}>{m.footer.terms}</Text>
          {conditionsGenerales[locale].map((p, i) => (
            <Text style={s.cg} key={i}>
              {i + 1}. {p}
            </Text>
          ))}
        </View>

        <View style={s.footer} fixed>
          <Text>
            {company.name} · {company.address} · {company.phone}
            {company.iban ? ` · IBAN ${company.iban}` : ''}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );

  try {
    return await renderToBuffer(doc);
  } catch (e) {
    if (!img) throw e;
    // Photo distante indisponible : on génère le PDF sans elle.
    return renderQuotePdf(q, null);
  }
}
