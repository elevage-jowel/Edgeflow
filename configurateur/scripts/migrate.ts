/** Applique les migrations SQL de src/db/migrations sur DATABASE_URL. */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  await migrate(drizzle(sql), { migrationsFolder: 'src/db/migrations' });
  await sql.end();
  console.log('✓ Base de données à jour');
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
