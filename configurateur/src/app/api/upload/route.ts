import { NextResponse } from 'next/server';
import { saveUpload } from '@/lib/storage';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/** Photos du matériel à reprendre (formulaire public) : images uniquement, 8 Mo max. */
export async function POST(req: Request) {
  if (!rateLimit(`up:${clientIp(req)}`, 20, 60 * 60 * 1000)) return NextResponse.json({ error: 'Trop d’envois' }, { status: 429 });
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
  try {
    const url = await saveUpload(file, 'reprises', { imagesOnly: true });
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
