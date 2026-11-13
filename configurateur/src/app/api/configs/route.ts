import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '@/db';
import { savedConfigs } from '@/db/schema';
import { clientIp, rateLimit } from '@/lib/rate-limit';

const schema = z.object({
  tractor: z.string().min(1).max(80),
  options: z.array(z.string().max(80)).max(60),
  machines: z.array(z.string().max(80)).max(20),
});

/** Enregistre une configuration et renvoie un identifiant court pour le lien de partage. */
export async function POST(req: Request) {
  if (!rateLimit(`cfg:${clientIp(req)}`, 60, 60 * 60 * 1000)) return NextResponse.json({ error: 'Trop de demandes' }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const id = nanoid(10);
  await db.insert(savedConfigs).values({ id, selection: parsed.data });
  return NextResponse.json({ id });
}
