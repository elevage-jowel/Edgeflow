import { NextResponse } from 'next/server';
import { createQuote, quoteInput } from '@/lib/quotes';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!rateLimit(`quote:${clientIp(req)}`, 8, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Trop de demandes, réessayez plus tard.' }, { status: 429 });
  }
  const json = await req.json().catch(() => null);
  const parsed = quoteInput.safeParse(json);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] === 'customerName' ? 'name' : issue.path[0] === 'vatNumber' ? 'vat' : issue.path[0]);
      fields[k] = issue.message;
    }
    return NextResponse.json({ error: 'invalid', fields }, { status: 400 });
  }
  try {
    const q = await createQuote(parsed.data);
    return NextResponse.json({ token: q.token, number: q.number });
  } catch (e) {
    console.error('[devis]', e);
    return NextResponse.json({ error: 'Configuration invalide' }, { status: 422 });
  }
}
