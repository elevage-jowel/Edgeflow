import type { MetadataRoute } from 'next';
import { company } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/fr/devis/', '/nl/offerte/', '/uploads/reprises/'] }],
    sitemap: `${company.siteUrl}/sitemap.xml`,
  };
}
