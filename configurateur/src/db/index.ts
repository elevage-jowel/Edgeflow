import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

declare global {
  // eslint-disable-next-line no-var
  var __pg: ReturnType<typeof postgres> | undefined;
}

function client() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL manquant : copiez .env.example vers .env');
  // Une seule connexion réutilisée en développement (rechargements à chaud)
  // et un petit pool en production (fonctions serverless).
  if (!global.__pg) global.__pg = postgres(url, { max: process.env.NODE_ENV === 'production' ? 5 : 3, prepare: false });
  return global.__pg;
}

export const db = drizzle(client(), { schema });
export { schema };
