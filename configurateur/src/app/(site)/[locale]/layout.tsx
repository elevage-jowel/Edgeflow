import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import '../../globals.css';
import { body, display } from '../../fonts';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { company } from '@/lib/config';
import { isLocale, locales, t } from '@/lib/i18n';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = { themeColor: '#0c120e', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale = isLocale(params.locale) ? params.locale : 'fr';
  const m = t(locale);
  return {
    metadataBase: new URL(company.siteUrl),
    title: { default: `${m.meta.title} | ${company.name}`, template: `%s | ${company.name}` },
    description: m.meta.description,
    openGraph: { siteName: company.name, locale: locale === 'nl' ? 'nl_BE' : 'fr_BE', type: 'website' },
    alternates: { languages: { 'fr-BE': '/fr', 'nl-BE': '/nl' } },
  };
}

export default function SiteLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  return (
    <html lang={locale === 'nl' ? 'nl-BE' : 'fr-BE'} className={`${display.variable} ${body.variable}`}>
      <body>
        <Header locale={locale} />
        <main id="contenu">{children}</main>
        <Footer locale={locale} />
      </body>
    </html>
  );
}
