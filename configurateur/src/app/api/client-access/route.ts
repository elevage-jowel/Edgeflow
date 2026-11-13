import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendClientAccess } from '@/lib/quotes';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/** Envoie par e-mail les liens des devis d'une adresse. Répond toujours pareil (pas de fuite d'information). */
export async function POST(req: Request) {
  if (!rateLimit(`acc:${clientIp(req)}`, 5, 60 * 60 * 1000)) return NextResponse.json({ ok: true });
  const parsed = z.object({ email: z.string().email().max(200), locale: z.enum(['fr', 'nl']) }).safeParse(await req.json().catch(() => null));
  if (parsed.success) await sendClientAccess(parsed.data.email, parsed.data.locale).catch((e) => console.error(e));
  return NextResponse.json({ ok: true });
}
