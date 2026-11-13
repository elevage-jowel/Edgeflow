/**
 * Démarrage local en une commande, sans rien installer d'autre que Node.js :
 *   npm run local
 *
 * 1. démarre une base PostgreSQL embarquée (dossier .local/pg, port 54329) ;
 * 2. crée le fichier .env la première fois (mot de passe admin : admin) ;
 * 3. crée les tables et importe le catalogue initial si la base est vide ;
 * 4. lance le site sur http://localhost:3000 (Ctrl+C pour tout arrêter).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const ROOT = process.cwd();
const PORT = 54329;
const LOCAL_URL = `postgres://postgres:postgres@localhost:${PORT}/configurateur`;

function ensureEnv() {
  const envPath = join(ROOT, '.env');
  if (existsSync(envPath)) return;
  let env = readFileSync(join(ROOT, '.env.example'), 'utf8');
  env = env
    .replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${LOCAL_URL}`)
    .replace(/^SITE_URL=.*$/m, 'SITE_URL=http://localhost:3000')
    .replace(/^ADMIN_PASSWORD=.*$/m, 'ADMIN_PASSWORD=admin')
    .replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET=${randomBytes(32).toString('hex')}`);
  writeFileSync(envPath, env);
  console.log('✓ Fichier .env créé (mot de passe admin : admin)');
}

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', env, shell: process.platform === 'win32' });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} → code ${code}`))));
  });
}

async function main() {
  ensureEnv();
  const dataDir = join(ROOT, '.local', 'pg');
  const firstRun = !existsSync(join(dataDir, 'PG_VERSION'));
  mkdirSync(join(ROOT, '.local'), { recursive: true });

  const pg = new EmbeddedPostgres({ databaseDir: dataDir, user: 'postgres', password: 'postgres', port: PORT, persistent: true, onLog: () => {} });
  if (firstRun) {
    console.log('… Préparation de la base de données (première fois uniquement)');
    await pg.initialise();
  }
  await pg.start();
  const client = pg.getPgClient();
  await client.connect();
  const exists = await client.query("select 1 from pg_database where datname = 'configurateur'");
  if (!exists.rowCount) await client.query('create database configurateur');
  await client.end();
  console.log(`✓ Base de données démarrée (port ${PORT})`);

  // Le .env peut pointer vers une autre base : en local, on force la base embarquée.
  const env = { ...process.env, DATABASE_URL: LOCAL_URL };
  await run('npx', ['tsx', 'scripts/migrate.ts'], env);

  const db = pg.getPgClient('configurateur');
  await db.connect();
  const { rows } = await db.query('select count(*)::int as n from products');
  await db.end();
  if (rows[0].n === 0) {
    console.log('… Import du catalogue initial');
    await run('npx', ['tsx', 'scripts/import-catalogue.ts'], env);
  }

  console.log('\n✅ Prêt : http://localhost:3000   ·   admin : http://localhost:3000/admin (mot de passe dans .env)\n');
  const next = spawn('npx', ['next', 'dev', '-p', '3000'], { stdio: 'inherit', env, shell: process.platform === 'win32' });

  const stop = async () => {
    next.kill('SIGINT');
    await pg.stop().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  next.on('exit', stop);
}

main().catch((e) => {
  console.error('\n✗ Démarrage impossible :', e.message ?? e);
  process.exit(1);
});
