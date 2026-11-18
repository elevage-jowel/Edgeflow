/**
 * Préparation automatique lancée avant chaque build Vercel (npm run vercel-build) :
 *  1. met la base à jour (migrations) ;
 *  2. importe le catalogue initial si la base est vide (premier déploiement) ;
 *  3. si un stockage est relié (Vercel Blob ou Supabase), copie les photos et vues 360°
 *     des tracteurs encore hébergées chez les importateurs. Étape reprise au build suivant
 *     si elle n'a pas fini, et jamais bloquante pour la mise en ligne.
 */
import { spawnSync } from 'node:child_process';

function run(label: string, args: string[], opts: { required: boolean; timeoutMs?: number }) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync('npx', ['tsx', ...args], { stdio: 'inherit', env: process.env, timeout: opts.timeoutMs });
  if (r.status === 0) return true;
  const why = r.error?.message ?? (r.signal ? `interrompu (${r.signal})` : `code ${r.status}`);
  if (opts.required) {
    console.error(`✗ ${label} : ${why}`);
    process.exit(1);
  }
  console.warn(`⚠ ${label} : ${why}. Le site est mis en ligne quand même ; l'étape reprendra au prochain déploiement.`);
  return false;
}

if (!process.env.DATABASE_URL) {
  console.error('✗ DATABASE_URL manquant : ajoutez une base Neon dans l’onglet Storage du projet Vercel, puis redéployez.');
  process.exit(1);
}
run('Mise à jour de la base de données', ['scripts/migrate.ts'], { required: true });
run('Catalogue initial (si la base est vide)', ['scripts/import-catalogue.ts', '--si-vide'], { required: true });

if (process.env.BLOB_READ_WRITE_TOKEN || (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)) {
  const minutes = Number(process.env.MEDIA_BUILD_MINUTES || 20);
  run('Copie des photos dans votre stockage', ['scripts/rapatrier-medias.ts'], { required: false, timeoutMs: minutes * 60_000 });
} else {
  console.log('\nℹ Aucun stockage relié (Blob) : les photos restent chargées depuis les sites des importateurs.');
}
