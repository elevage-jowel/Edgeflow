import type { MetadataRoute } from 'next';
import { getProductRefsForSitemap } from '@/lib/catalog';
import { company } from '@/lib/config';
import { href, locales } from '@/lib/i18n';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items = await getProductRefsForSitemap().catch(() => []);
  const out: MetadataRoute.Sitemap = [];
  for (const l of locales) {
    out.push({ url: `${company.siteUrl}/${l}`, changeFrequency: 'weekly', priority: 1 });
    for (const k of ['tractors', 'machines', 'configurator'] as const) out.push({ url: company.siteUrl + href(l, k), changeFrequency: 'weekly', priority: 0.8 });
    for (const p of items) {
      out.push({ url: company.siteUrl + href(l, p.kind === 'tractor' ? 'tractors' : 'machines', p.slug), lastModified: p.updatedAt, priority: p.kind === 'tractor' ? 0.7 : 0.5 });
    }
  }
  return out;
}
