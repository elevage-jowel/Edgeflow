'use server';
/**
 * Actions de l'administration. Chaque action revérifie la session
 * (le middleware protège déjà /admin, ceci est une seconde barrière).
 */
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath, revalidateTag } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { options, products, quotes, type QuoteLine, type QuoteStatus } from '@/db/schema';
import { checkPassword, createSessionValue, sessionCookie, verifySessionValue } from '@/lib/auth';
import { importRows, readRows, rowToOption, rowToProduct, type ImportReport } from '@/lib/import';
import { parseEur } from '@/lib/money';
import { recomputeTotals, sendFinalQuote } from '@/lib/quotes';
import { saveUpload } from '@/lib/storage';
import { rateLimit } from '@/lib/rate-limit';

async function guard() {
  if (!(await verifySessionValue(cookies().get(sessionCookie.name)?.value))) redirect('/admin/login');
}

// ───────── Connexion ─────────

export async function login(_: unknown, fd: FormData) {
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) return { error: 'Trop de tentatives. Réessayez dans 15 minutes.' };
  if (!(await checkPassword(String(fd.get('password') ?? '')))) return { error: 'Mot de passe incorrect.' };
  cookies().set(sessionCookie.name, await createSessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: sessionCookie.maxAge,
  });
  const next = String(fd.get('next') ?? '/admin');
  redirect(next.startsWith('/admin') ? next : '/admin');
}

export async function logout() {
  cookies().delete(sessionCookie.name);
  redirect('/admin/login');
}

// ───────── Devis ─────────

export type QuoteSaveState = { ok?: string; error?: string } | null;

export async function saveQuote(_: QuoteSaveState, fd: FormData): Promise<QuoteSaveState> {
  await guard();
  const id = Number(fd.get('id'));
  const [q] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!q) return { error: 'Devis introuvable' };

  const labels = fd.getAll('label').map(String);
  const groups = fd.getAll('group').map(String);
  const refs = fd.getAll('ref').map(String);
  const prices = fd.getAll('price').map(String);
  const qtys = fd.getAll('qty').map(String);
  const lines: QuoteLine[] = [];
  for (let i = 0; i < labels.length; i++) {
    if (!labels[i].trim() || fd.get(`remove_${i}`) === 'on') continue;
    lines.push({
      group: (groups[i] || 'divers') as QuoteLine['group'],
      ref: refs[i] || null,
      label: labels[i].trim(),
      priceHt: prices[i].trim() ? parseEur(prices[i]) : null,
      qty: Math.max(1, Number(qtys[i]) || 1),
    });
  }
  const discountHt = parseEur(String(fd.get('discount') ?? '')) ?? 0;
  const totals = recomputeTotals(lines, discountHt, q.vatRate);
  const status = String(fd.get('status')) as QuoteStatus;
  const validUntil = String(fd.get('validUntil') || q.validUntil);

  await db
    .update(quotes)
    .set({ lines, ...totals, status, validUntil, adminNote: String(fd.get('adminNote') ?? '') || null, updatedAt: new Date() })
    .where(eq(quotes.id, id));

  if (fd.get('intent') === 'send') {
    const [fresh] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
    try {
      const delivered = await sendFinalQuote(fresh);
      await db.update(quotes).set({ status: 'envoye', sentAt: new Date() }).where(eq(quotes.id, id));
      revalidatePath(`/admin/devis/${id}`);
      return { ok: delivered ? `Devis envoyé à ${fresh.email}.` : 'SMTP non configuré : e-mail affiché dans la console du serveur, statut passé à « envoyé ».' };
    } catch (e) {
      return { error: `Envoi impossible : ${(e as Error).message}` };
    }
  }
  revalidatePath(`/admin/devis/${id}`);
  revalidatePath('/admin');
  return { ok: 'Devis enregistré.' };
}

export async function setQuoteStatus(fd: FormData) {
  await guard();
  await db.update(quotes).set({ status: String(fd.get('status')) as QuoteStatus, updatedAt: new Date() }).where(eq(quotes.id, Number(fd.get('id'))));
  revalidatePath('/admin');
}

export async function deleteQuote(fd: FormData) {
  await guard();
  await db.delete(quotes).where(eq(quotes.id, Number(fd.get('id'))));
  revalidatePath('/admin');
  redirect('/admin?supprime=1');
}

// ───────── Catalogue ─────────

function formToRow(fd: FormData) {
  const row: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === 'string' && !k.startsWith('$')) row[k] = v;
  return row;
}

function refreshCatalog() {
  revalidateTag('catalog');
  revalidatePath('/', 'layout');
}

export type SaveState = { ok?: string; error?: string; id?: number } | null;

export async function saveProduct(_: SaveState, fd: FormData): Promise<SaveState> {
  await guard();
  const id = Number(fd.get('id') || 0);
  const row = formToRow(fd);
  // Ajout de photos envoyées depuis le formulaire.
  const uploads = fd.getAll('newPhotos').filter((f): f is File => f instanceof File && f.size > 0);
  try {
    const added: string[] = [];
    for (const f of uploads) added.push(await saveUpload(f, 'produits', { imagesOnly: true, maxBytes: 12 * 1024 * 1024 }));
    if (added.length) row.photos = [row.photos, ...added].filter(Boolean).join(' | ');
    const brochure = fd.get('newBrochure');
    if (brochure instanceof File && brochure.size) row.brochure = await saveUpload(brochure, 'brochures', { maxBytes: 20 * 1024 * 1024 });
    const model = fd.get('newModel');
    if (model instanceof File && model.size) row.modele3d_url = await saveUpload(model, 'modeles-3d', { maxBytes: 40 * 1024 * 1024 });
    const value = rowToProduct(row);
    if (id) {
      const { slug: _slug, ...rest } = value;
      await db.update(products).set({ ...rest, updatedAt: new Date() }).where(eq(products.id, id));
      refreshCatalog();
      return { ok: 'Produit enregistré.', id };
    }
    const [created] = await db.insert(products).values(value).returning({ id: products.id });
    refreshCatalog();
    return { ok: 'Produit créé.', id: created.id };
  } catch (e) {
    const msg = (e as Error).message;
    return { error: msg.includes('unique') ? 'Cette référence ou ce nom existe déjà.' : msg };
  }
}

export async function saveOption(_: SaveState, fd: FormData): Promise<SaveState> {
  await guard();
  const id = Number(fd.get('id') || 0);
  const row = formToRow(fd);
  try {
    const photo = fd.get('newPhoto');
    if (photo instanceof File && photo.size) row.photo = await saveUpload(photo, 'options', { imagesOnly: true });
    const value = rowToOption(row);
    if (id) {
      await db.update(options).set({ ...value, updatedAt: new Date() }).where(eq(options.id, id));
      refreshCatalog();
      return { ok: 'Option enregistrée.', id };
    }
    const [created] = await db.insert(options).values(value).returning({ id: options.id });
    refreshCatalog();
    return { ok: 'Option créée.', id: created.id };
  } catch (e) {
    const msg = (e as Error).message;
    return { error: msg.includes('unique') ? 'Cette référence existe déjà.' : msg };
  }
}

export async function deleteProduct(fd: FormData) {
  await guard();
  await db.delete(products).where(eq(products.id, Number(fd.get('id'))));
  refreshCatalog();
  redirect('/admin/produits');
}

export async function deleteOption(fd: FormData) {
  await guard();
  await db.delete(options).where(eq(options.id, Number(fd.get('id'))));
  refreshCatalog();
  redirect('/admin/options');
}

/** Modification rapide d'un prix depuis la liste. */
export async function quickPrice(fd: FormData) {
  await guard();
  const table = fd.get('table') === 'options' ? options : products;
  const v = String(fd.get('price') ?? '').trim();
  await db.update(table).set({ priceHt: v ? parseEur(v) : null, updatedAt: sql`now()` }).where(eq(table.id, Number(fd.get('id'))));
  refreshCatalog();
}

export type ImportState = { report?: ImportReport; error?: string; kind?: string } | null;

export async function importFile(_: ImportState, fd: FormData): Promise<ImportState> {
  await guard();
  const kind = fd.get('kind') === 'options' ? 'options' : 'produits';
  const file = fd.get('file');
  if (!(file instanceof File) || !file.size) return { error: 'Choisissez un fichier CSV ou Excel.' };
  if (!/\.(csv|xlsx)$/i.test(file.name)) return { error: 'Format accepté : .csv (séparateur « ; ») ou .xlsx' };
  try {
    const rows = await readRows({ name: file.name, buffer: Buffer.from(await file.arrayBuffer()) });
    const report = await importRows(kind, rows);
    refreshCatalog();
    return { report, kind };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
