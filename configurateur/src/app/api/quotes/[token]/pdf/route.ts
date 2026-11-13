import { getQuoteByToken, quoteImage } from '@/lib/quotes';
import { renderQuotePdf } from '@/lib/pdf';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const q = await getQuoteByToken(params.token);
  if (!q) return new Response('Devis introuvable', { status: 404 });
  const pdf = await renderQuotePdf(q, await quoteImage(q));
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${q.number}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
