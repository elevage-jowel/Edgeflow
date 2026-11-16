/**
 * Importe un catalogue depuis des fichiers CSV/XLSX.
 *   npm run catalogue:import                      → data/catalogue-initial/
 *   npm run catalogue:import -- chemin/dossier    → produits.(csv|xlsx) et options.(csv|xlsx) du dossier
 */
import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { importRows, readRows } from '../src/lib/import';

async function main() {
  const args = process.argv.slice(2);
  // --si-vide : n'importe que si la base ne contient encore aucun produit (premier déploiement).
  if (args.includes('--si-vide')) {
    const { db } = await import('../src/db');
    const { products } = await import('../src/db/schema');
    const [one] = await db.select({ id: products.id }).from(products).limit(1);
    if (one) {
      console.log('– Catalogue déjà présent : import ignoré');
      process.exit(0);
    }
  }
  const dir = args.find((a) => !a.startsWith('--')) || 'data/catalogue-initial';
  for (const kind of ['produits', 'options'] as const) {
    const file = ['csv', 'xlsx'].map((e) => join(dir, `${kind}.${e}`)).find(existsSync);
    if (!file) {
      console.log(`– ${kind} : aucun fichier dans ${dir}`);
      continue;
    }
    const rows = await readRows({ name: file, buffer: readFileSync(file) });
    const r = await importRows(kind, rows);
    console.log(`✓ ${kind} : ${r.created} créés, ${r.updated} mis à jour, ${r.errors.length} erreurs`);
    r.errors.slice(0, 20).forEach((e) => console.log(`   ligne ${e.line} : ${e.message}`));
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
