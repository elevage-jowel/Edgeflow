import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { savedConfigs, type Selection } from '@/db/schema';
import { getCatalog } from '@/lib/catalog';
import { defaultOptions } from '@/lib/compat';
import { href, t, type Locale } from '@/lib/i18n';
import { getQuoteByToken } from '@/lib/quotes';
import { Configurator } from '@/components/Configurator';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  const m = t(params.locale);
  return { title: m.meta.title, description: m.meta.description, alternates: { canonical: href(params.locale, 'configurator'), languages: { 'fr-BE': href('fr', 'configurator'), 'nl-BE': href('nl', 'configurator') } } };
}

type SP = { c?: string; from?: string; t?: string; o?: string; m?: string; e?: string };
const csv = (v?: string) => (v ? v.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 60) : []);

export default async function ConfiguratorPage({ params, searchParams }: { params: { locale: Locale }; searchParams: SP }) {
  const { locale } = params;
  const catalog = await getCatalog(locale);
  let initial: Selection | null = null;
  let parentToken: string | undefined;

  if (searchParams.c && /^[\w-]{6,20}$/.test(searchParams.c)) {
    const [row] = await db.select().from(savedConfigs).where(eq(savedConfigs.id, searchParams.c)).limit(1);
    if (row) initial = row.selection;
  } else if (searchParams.from) {
    const q = await getQuoteByToken(searchParams.from);
    if (q) {
      initial = q.selection;
      parentToken = q.token;
    }
  }
  if (!initial && searchParams.t && catalog.tractors.some((x) => x.ref === searchParams.t)) {
    const opts = csv(searchParams.o);
    initial = { tractor: searchParams.t, options: opts.length ? opts : defaultOptions(catalog.options, searchParams.t), machines: csv(searchParams.m) };
  }
  if (initial && !catalog.tractors.some((x) => x.ref === initial!.tractor)) initial = null;
  const step = Math.max(0, Math.min(6, Number(searchParams.e ?? (initial ? 7 : 1)) - 1));

  return <Configurator locale={locale} catalog={catalog} initial={initial} initialStep={step} parentToken={parentToken} />;
}
