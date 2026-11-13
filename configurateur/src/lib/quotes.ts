import 'server-only';
import { randomBytes } from 'node:crypto';
import { desc, eq, like, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { quotes, type Quote, type QuoteLine, type Selection } from '@/db/schema';
import { getCatalog } from './catalog';
import { company } from './config';
import { fill, href, t, type Locale } from './i18n';
import { dealerEmails, emailLayout, sendMail } from './mail';
import { formatEur } from './money';
import { renderQuotePdf } from './pdf';
import { buildLines, normalizeSelection, totalsOf } from './pricing';

const str = (max: number) => z.string().trim().max(max);

export const quoteInput = z.object({
  locale: z.enum(['fr', 'nl']),
  selection: z.object({
    tractor: str(80).min(1),
    options: z.array(str(80)).max(60),
    machines: z.array(str(80)).max(20),
  }),
  customerName: str(120).min(2),
  company: str(160).optional().default(''),
  vatNumber: str(40).optional().default(''),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: str(40).min(6).regex(/^[+\d][\d\s./()-]{5,}$/),
  address: str(300).min(5),
  tradeIn: z
    .object({ brand: str(80).optional(), model: str(80).optional(), year: str(10).optional(), photos: z.array(z.string().max(500)).max(5).optional() })
    .nullable()
    .optional(),
  financing: z.enum(['non', 'financement', 'leasing']).optional().default('non'),
  desiredDelay: z.enum(['urgent', '1-3m', '3-6m', 'info']).optional(),
  remarks: str(2000).optional().default(''),
  consent: z.literal(true),
  parentToken: z.string().max(64).optional(),
  // Champ piège anti-robots : doit rester vide.
  website: z.string().max(0).optional(),
});
export type QuoteInput = z.infer<typeof quoteInput>;

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

async function nextNumber(tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) {
  const year = new Date().getFullYear();
  const prefix = `${company.quotePrefix}-${year}-`;
  await tx.execute(sql`select pg_advisory_xact_lock(424242)`);
  const [last] = await tx.select({ n: quotes.number }).from(quotes).where(like(quotes.number, `${prefix}%`)).orderBy(desc(quotes.number)).limit(1);
  const n = last ? Number(last.n.slice(prefix.length)) + 1 : 1;
  return prefix + String(n).padStart(4, '0');
}

export async function createQuote(input: QuoteInput) {
  const catalog = await getCatalog(input.locale);
  const selection = normalizeSelection(catalog, input.selection as Selection);
  const { lines } = buildLines(catalog, selection);
  if (!lines.length) throw new Error('Configuration invalide');
  const totals = totalsOf(lines);

  let parentId: number | null = null;
  if (input.parentToken) {
    const [p] = await db.select({ id: quotes.id }).from(quotes).where(eq(quotes.token, input.parentToken)).limit(1);
    parentId = p?.id ?? null;
  }
  const valid = new Date();
  valid.setDate(valid.getDate() + company.quoteValidityDays);
  const tradeIn = input.tradeIn && (input.tradeIn.brand || input.tradeIn.model || input.tradeIn.photos?.length) ? input.tradeIn : null;

  const quote = await db.transaction(async (tx) => {
    const number = await nextNumber(tx);
    const [q] = await tx
      .insert(quotes)
      .values({
        number,
        token: randomBytes(18).toString('base64url'),
        locale: input.locale,
        customerName: input.customerName,
        company: input.company || null,
        vatNumber: input.vatNumber || null,
        email: input.email,
        phone: input.phone,
        address: input.address,
        tradeIn,
        financing: input.financing,
        desiredDelay: input.desiredDelay ?? null,
        remarks: input.remarks || null,
        selection,
        lines,
        ...totals,
        validUntil: isoDate(valid),
        consentAt: new Date(),
        parentId,
      })
      .returning();
    return q;
  });

  // Les e-mails partent sans bloquer la réponse en cas d'erreur SMTP.
  notifyNewQuote(quote).catch((e) => console.error('[devis] e-mail non envoyé', e));
  return quote;
}

export async function quoteImage(q: Quote) {
  const catalog = await getCatalog((q.locale as Locale) ?? 'fr');
  return catalog.tractors.find((x) => x.ref === q.selection.tractor)?.image ?? null;
}

export function quoteUrl(q: Pick<Quote, 'token' | 'locale'>) {
  return company.siteUrl + href(q.locale as Locale, 'quote', q.token);
}

async function notifyNewQuote(q: Quote) {
  const locale = q.locale as Locale;
  const m = t(locale);
  const pdf = await renderQuotePdf(q, await quoteImage(q));
  const attachment = { filename: `${q.number}.pdf`, content: pdf, contentType: 'application/pdf' };
  const url = quoteUrl(q);
  const total = formatEur(q.totalTtc, locale, { decimals: true });

  await sendMail({
    to: q.email,
    replyTo: company.email,
    subject: `${m.quote.number} ${q.number} – ${company.name}`,
    text: `${fill(m.quote.thanks, { name: q.customerName })}\n${m.quote.ready}\n${q.lines[0]?.label}\n${m.quote.totalTtc} : ${total}\n${url}\n\n${company.name} · ${company.phone}`,
    html: emailLayout({
      brandColor: company.brandColor,
      company: company.name,
      title: `${fill(m.quote.thanks, { name: q.customerName })} ${m.quote.ready}`,
      paragraphs: [`${m.quote.number} ${q.number} · ${q.lines[0]?.label}`, `${m.quote.totalTtc} : ${total}`, m.quote.porNote],
      button: { label: locale === 'nl' ? 'Mijn offerte bekijken' : 'Voir mon devis', url },
      footer: `${company.name} · ${company.address} · ${company.phone} · ${company.email}`,
    }),
    attachments: [attachment],
  });

  const to = dealerEmails();
  if (to.length) {
    const admin = `${company.siteUrl}/admin/devis/${q.id}`;
    const trade = q.tradeIn ? `Reprise : ${[q.tradeIn.brand, q.tradeIn.model, q.tradeIn.year].filter(Boolean).join(' ')}` : 'Pas de reprise';
    await sendMail({
      to,
      replyTo: q.email,
      subject: `Nouvelle demande de devis ${q.number} – ${q.customerName}`,
      text: `${q.customerName} (${q.email}, ${q.phone})\n${q.lines.map((l) => `- ${l.label} : ${l.priceHt == null ? 'sur demande' : formatEur(l.priceHt)}`).join('\n')}\nTotal TVAC : ${total}\n${trade}\nFinancement : ${q.financing}\n${admin}`,
      html: emailLayout({
        brandColor: company.brandColor,
        company: company.name,
        title: `Nouvelle demande ${q.number}`,
        paragraphs: [
          `${q.customerName}${q.company ? ` (${q.company})` : ''} · ${q.email} · ${q.phone}`,
          q.address,
          ...q.lines.map((l) => `${l.label} : ${l.priceHt == null ? 'sur demande' : formatEur(l.priceHt, 'fr', { decimals: true })}`),
          `Total HT ${formatEur(q.totalHt, 'fr', { decimals: true })} · TVAC ${total}`,
          trade,
          `Financement : ${q.financing ?? 'non'} · Délai : ${q.desiredDelay ?? '-'}`,
          q.remarks ? `Remarque : ${q.remarks}` : '',
        ].filter(Boolean),
        button: { label: 'Ouvrir dans l’admin', url: admin },
        footer: 'Notification automatique du configurateur.',
      }),
      attachments: [attachment],
    });
  }
}

/** Envoi du devis définitif par l'admin (après modification éventuelle). */
export async function sendFinalQuote(q: Quote) {
  const locale = q.locale as Locale;
  const m = t(locale);
  const pdf = await renderQuotePdf(q, await quoteImage(q));
  const res = await sendMail({
    to: q.email,
    replyTo: company.email,
    subject: `${m.quote.number} ${q.number} – ${company.name}`,
    text: `${q.customerName},\n${locale === 'nl' ? 'In bijlage vindt u onze definitieve offerte.' : 'Veuillez trouver ci-joint notre devis définitif.'}\n${quoteUrl(q)}\n\n${company.name} · ${company.phone}`,
    html: emailLayout({
      brandColor: company.brandColor,
      company: company.name,
      title: locale === 'nl' ? 'Uw definitieve offerte' : 'Votre devis définitif',
      paragraphs: [
        q.customerName + ',',
        locale === 'nl' ? 'In bijlage vindt u onze definitieve offerte. Aarzel niet om ons te contacteren met vragen.' : 'Veuillez trouver ci-joint notre devis définitif. N’hésitez pas à nous contacter pour toute question.',
        `${m.quote.totalTtc} : ${formatEur(q.totalTtc, locale, { decimals: true })}`,
      ],
      button: { label: locale === 'nl' ? 'Offerte bekijken' : 'Voir le devis', url: quoteUrl(q) },
      footer: `${company.name} · ${company.address} · ${company.phone} · ${company.email}`,
    }),
    attachments: [{ filename: `${q.number}.pdf`, content: pdf, contentType: 'application/pdf' }],
  });
  return res.delivered;
}

export function recomputeTotals(lines: QuoteLine[], discountHt: number, vatRate = 21) {
  return totalsOf(lines, discountHt, vatRate);
}

export async function getQuoteByToken(token: string) {
  if (!/^[\w-]{10,64}$/.test(token)) return null;
  const [q] = await db.select().from(quotes).where(eq(quotes.token, token)).limit(1);
  return q ?? null;
}

/** Espace client : envoie par e-mail les liens de tous les devis d'une adresse. */
export async function sendClientAccess(email: string, locale: Locale) {
  const list = await db.select().from(quotes).where(eq(quotes.email, email.trim().toLowerCase())).orderBy(desc(quotes.createdAt)).limit(30);
  if (!list.length) return;
  const m = t(locale);
  await sendMail({
    to: email,
    subject: `${m.account.title} – ${company.name}`,
    text: list.map((q) => `${q.number} (${new Date(q.createdAt).toLocaleDateString('fr-BE')}) : ${quoteUrl(q)}`).join('\n'),
    html: emailLayout({
      brandColor: company.brandColor,
      company: company.name,
      title: m.account.title,
      paragraphs: list.map((q) => `${q.number} · ${new Date(q.createdAt).toLocaleDateString(locale === 'nl' ? 'nl-BE' : 'fr-BE')} · ${q.lines[0]?.label} : ${quoteUrl(q)}`),
      footer: `${company.name} · ${company.phone}`,
    }),
  });
}
