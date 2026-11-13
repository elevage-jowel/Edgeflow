import { asc, desc, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { options, products, quotes, type QuoteStatus } from '@/db/schema';
import { sessionCookie, verifySessionValue } from '@/lib/auth';
import { OPTION_COLUMNS, PRODUCT_COLUMNS, optionToRow, productToRow, toCsv, toXlsx } from '@/lib/import';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const QUOTE_COLUMNS = ['numero', 'date', 'statut', 'client', 'societe', 'tva', 'email', 'telephone', 'adresse', 'tracteur', 'lignes', 'sous_total_ht', 'remise_ht', 'total_ht', 'tva_montant', 'total_ttc', 'prix_sur_demande', 'reprise', 'financement', 'delai', 'remarque', 'langue', 'lien'];
const c = (v: number) => (v / 100).toFixed(2).replace('.', ',');

export async function GET(req: Request, { params }: { params: { file: string } }) {
  if (!(await verifySessionValue(cookies().get(sessionCookie.name)?.value))) return new Response('Non autorisé', { status: 401 });
  const [name, ext] = params.file.split('.');
  const date = new Date().toISOString().slice(0, 10);
  const send = (body: string | Buffer, type: string, filename: string) =>
    new Response(typeof body === 'string' ? body : new Uint8Array(body), { headers: { 'Content-Type': type, 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' } });

  if (name === 'devis') {
    const status = new URL(req.url).searchParams.get('statut') as QuoteStatus | null;
    const list = await db.select().from(quotes).where(status ? eq(quotes.status, status) : undefined).orderBy(desc(quotes.createdAt));
    const rows = list.map((q) => ({
      numero: q.number, date: new Date(q.createdAt).toLocaleString('fr-BE'), statut: q.status, client: q.customerName, societe: q.company ?? '', tva: q.vatNumber ?? '',
      email: q.email, telephone: q.phone, adresse: q.address, tracteur: q.lines[0]?.label ?? '',
      lignes: q.lines.map((l) => `${l.label} (${l.priceHt == null ? 'sur demande' : c(l.priceHt)})`).join(' | '),
      sous_total_ht: c(q.subtotalHt), remise_ht: c(q.discountHt), total_ht: c(q.totalHt), tva_montant: c(q.vatAmount), total_ttc: c(q.totalTtc),
      prix_sur_demande: q.hasPriceOnRequest ? 'oui' : 'non', reprise: q.tradeIn ? [q.tradeIn.brand, q.tradeIn.model, q.tradeIn.year].filter(Boolean).join(' ') : '',
      financement: q.financing ?? '', delai: q.desiredDelay ?? '', remarque: q.remarks ?? '', langue: q.locale, lien: `/${q.locale}/${q.locale === 'nl' ? 'offerte' : 'devis'}/${q.token}`,
    }));
    return send(toCsv(QUOTE_COLUMNS, rows), 'text/csv; charset=utf-8', `devis-${date}.csv`);
  }
  if (name === 'produits' || name === 'modele-produits') {
    const rows = name === 'produits' ? (await db.select().from(products).orderBy(asc(products.kind), asc(products.sort))).map(productToRow) : [];
    return ext === 'xlsx'
      ? send(await toXlsx(PRODUCT_COLUMNS, rows, 'produits'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', `${name}-${date}.xlsx`)
      : send(toCsv(PRODUCT_COLUMNS, rows), 'text/csv; charset=utf-8', `${name}-${date}.csv`);
  }
  if (name === 'options' || name === 'modele-options') {
    const rows = name === 'options' ? (await db.select().from(options).orderBy(asc(options.group), asc(options.sort))).map(optionToRow) : [];
    return ext === 'xlsx'
      ? send(await toXlsx(OPTION_COLUMNS, rows, 'options'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', `${name}-${date}.xlsx`)
      : send(toCsv(OPTION_COLUMNS, rows), 'text/csv; charset=utf-8', `${name}-${date}.csv`);
  }
  return new Response('Introuvable', { status: 404 });
}
