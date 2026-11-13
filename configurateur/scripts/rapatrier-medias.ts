/**
 * Copie dans votre stockage toutes les images hébergées ailleurs (photos produits,
 * photos d'options, séquences 360°) et met à jour les URL en base.
 * Avantages : site plus rapide, plus de dépendance aux sites des importateurs.
 *
 *   npm run medias:rapatrier                → photos + 360°
 *   npm run medias:rapatrier -- --sans-360  → photos uniquement
 *   npm run medias:rapatrier -- --brochures → copie aussi les brochures PDF
 *
 * À lancer après chaque import de catalogue contenant des liens externes.
 * Vérifiez que vous avez le droit d'utiliser ces visuels (accord de l'importateur).
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
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
let failed = 0;

const isRemote = (u: string | null | undefined): u is string =>
  !!u && /^https?:\/\//.test(u) && !(process.env.SUPABASE_URL && u.startsWith(process.env.SUPABASE_URL));

async function copy(url: string, name: string) {
  if (done.has(url)) return done.get(url)!;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
      const ext = EXT[type] ?? 'jpg';
      const saved = await saveBuffer(`${name}.${ext}`, Buffer.from(await res.arrayBuffer()), type);
      done.set(url, saved);
      copied++;
      return saved;
    } catch (e) {
      if (attempt === 3) {
        failed++;
        console.warn(`  ✗ ${url} : ${(e as Error).message}`);
        return url;
      }
      await new Promise((r) => setTimeout(r, 800 * attempt));
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
    const images = await Promise.all(p.images.map((u, i) => (isRemote(u) ? copy(u, `${folder}/photo-${i + 1}`) : u)));
    let spinUrl = p.spinUrl;
    if (!args.has('--sans-360') && isRemote(p.spinUrl) && !p.spinUrl.includes('{variant}')) {
      const n = p.spinFrames ?? 36;
      const frames: string[] = [];
      for (let f = 1; f <= n; f++) frames.push(await copy(p.spinUrl.replace(/\{frame\}/g, String(f)), `medias/360/${slugify(p.ref)}/${f}`));
      if (frames.every((x) => !/^https?:/.test(x))) spinUrl = frames[0].replace(/\/1\.(\w+)$/, '/{frame}.$1');
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
    const image = await copy(o.image!, `medias/options/${slugify(o.ref)}`);
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
