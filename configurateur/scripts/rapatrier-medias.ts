/**
 * Copie dans votre stockage toutes les images hébergées ailleurs (photos produits,
 * photos d'options, séquences 360°) et met à jour les URL en base.
 * Avantages : site plus rapide, plus de dépendance aux sites des importateurs.
 *
 *   npm run medias:rapatrier                → photos + 360°
 *   npm run medias:rapatrier -- --sans-360  → photos uniquement
 *   npm run medias:rapatrier -- --brochures → copie aussi les brochures PDF
 *   npm run medias:rapatrier -- --360-machines → copie aussi les vues 360° des machines (volumineux)
 *
 * À lancer après chaque import de catalogue contenant des liens externes.
 * Vérifiez que vous avez le droit d'utiliser ces visuels (accord de l'importateur).
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import sharp from 'sharp';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { options, products } from '../src/db/schema';
import { saveBuffer } from '../src/lib/storage-core';
import { slugify } from '../src/lib/slug';

const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxy) setGlobalDispatcher(new ProxyAgent(proxy));

const args = new Set(process.argv.slice(2));
const sql = postgres(process.env.DATABASE_URL!, { max: 2 });
const db = drizzle(sql);
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf' };
const done = new Map<string, string>();
let copied = 0;
/** Adresses qui n'existent plus chez la source (404, page HTML au lieu d'une image). */
const gone = new Set<string>();
let failed = 0;

/** Une URL est « externe » si elle n'est ni locale, ni déjà dans votre stockage (Supabase ou Vercel Blob). */
const isRemote = (u: string | null | undefined): u is string =>
  !!u &&
  /^https?:\/\//.test(u) &&
  !(process.env.SUPABASE_URL && u.startsWith(process.env.SUPABASE_URL)) &&
  !/\.blob\.vercel-storage\.com\//.test(u);

/**
 * Réduit l'image (côté le plus long ≤ max px) : JPEG pour les photos opaques,
 * PNG si l'image a de la transparence. Pas de WebP : le générateur de PDF ne le lit pas.
 */
async function shrink(bytes: Buffer, max: number) {
  const img = sharp(bytes, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  const resized = img.resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true });
  if (meta.hasAlpha) return { data: await resized.png({ compressionLevel: 9 }).toBuffer(), ext: 'png', type: 'image/png' };
  return { data: await resized.flatten({ background: '#ffffff' }).jpeg({ quality: 80, mozjpeg: true }).toBuffer(), ext: 'jpg', type: 'image/jpeg' };
}

async function copy(url: string, name: string, max = 1600, reuse = true) {
  if (reuse && done.has(url)) return done.get(url)!;
  const tries = 5;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.status === 429 || res.status === 503) {
        // Site source saturé : on attend (délai demandé par le serveur, sinon de plus en plus longtemps).
        const wait = Number(res.headers.get('retry-after')) || 4 * attempt;
        throw Object.assign(new Error(`HTTP ${res.status}`), { waitMs: wait * 1000 });
      }
      if (res.status === 404 || res.status === 410) {
        gone.add(url);
        throw Object.assign(new Error(`HTTP ${res.status}`), { final: true });
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
      if (!type.startsWith('image/') && type !== 'application/pdf') {
        gone.add(url);
        throw Object.assign(new Error(`contenu inattendu (${type})`), { final: true });
      }
      const raw = Buffer.from(await res.arrayBuffer());
      let saved: string;
      if (type.startsWith('image/')) {
        const out = await shrink(raw, max);
        saved = await saveBuffer(`${name}.${out.ext}`, out.data, out.type);
      } else {
        saved = await saveBuffer(`${name}.${EXT[type] ?? 'bin'}`, raw, type);
      }
      done.set(url, saved);
      copied++;
      return saved;
    } catch (e) {
      if (attempt === tries || (e as { final?: boolean }).final) {
        failed++;
        console.warn(`  ✗ ${url} : ${(e as Error).message}`);
        return url;
      }
      await new Promise((r) => setTimeout(r, (e as { waitMs?: number }).waitMs ?? 800 * attempt));
    }
  }
  return url;
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: n }, async () => {
    while (queue.length) await fn(queue.shift()!);
  }));
}

async function main() {
  const ps = await db.select().from(products);
  console.log(`${ps.length} produits à vérifier…`);
  await pool(ps, Number(process.env.MEDIA_CONCURRENCY || 4), async (p) => {
    const folder = `medias/produits/${slugify(p.ref)}`;
    const copiedImages = await Promise.all(p.images.map((u, i) => (isRemote(u) ? copy(u, `${folder}/photo-${i + 1}`) : u)));
    const images = copiedImages.filter((u) => !gone.has(u));
    let spinUrl = p.spinUrl;
    // 360° : tracteurs par défaut ; machines seulement avec --360-machines (≈ 1 Go de photos).
    const spinWanted = p.kind === 'tractor' || args.has('--360-machines');
    if (!args.has('--sans-360') && spinWanted && isRemote(p.spinUrl) && !p.spinUrl.includes('{variant}')) {
      const n = p.spinFrames ?? 36;
      const frames: string[] = [];
      for (let f = 1; f <= n; f++) {
        const name = `medias/360/${slugify(p.ref)}/${f}`;
        let got = await copy(p.spinUrl.replace(/\{frame\}/g, String(f)), name, 1200, false);
        // Vue manquante chez la source : copie de la vue précédente sous ce numéro, pour une rotation sans trou.
        if (isRemote(got) && f > 1) got = await copy(p.spinUrl.replace(/\{frame\}/g, String(f - 1)), name, 1200, false);
        frames.push(got);
      }
      const stillExternal = (x: string): boolean => isRemote(x);
      if (!frames.some(stillExternal)) spinUrl = frames[0].replace(/\/1\.(\w+)$/, '/{frame}.$1');
    }
    let brochureUrl = p.brochureUrl;
    if (args.has('--brochures') && isRemote(brochureUrl)) brochureUrl = await copy(brochureUrl, `medias/brochures/${slugify(p.ref)}`);
    if (images.join() !== p.images.join() || spinUrl !== p.spinUrl || brochureUrl !== p.brochureUrl) {
      await db.update(products).set({ images, spinUrl, brochureUrl, updatedAt: new Date() }).where(eq(products.id, p.id));
      console.log(`  ✓ ${p.ref}`);
    }
  });
  const os = await db.select().from(options);
  await pool(os.filter((o) => isRemote(o.image)), 6, async (o) => {
    const copiedImage = await copy(o.image!, `medias/options/${slugify(o.ref)}`);
    const image = gone.has(copiedImage) ? null : copiedImage;
    if (image !== o.image) await db.update(options).set({ image, updatedAt: new Date() }).where(eq(options.id, o.id));
  });
  console.log(`Terminé : ${copied} fichiers copiés, ${failed} échecs.`);
  console.log('Pensez à vider le cache du site (redémarrage) pour voir les nouvelles URL.');
  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
