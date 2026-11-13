'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { routes, type Locale } from '@/lib/i18n';

/** Bascule FR ↔ NL en conservant la page courante (segments d'URL traduits). */
export function LangSwitch({ locale }: { locale: Locale }) {
  const path = usePathname() ?? `/${locale}`;
  const search = useSearchParams()?.toString();
  const to = (target: Locale) => {
    const parts = path.split('/');
    parts[1] = target;
    if (parts[2]) {
      const route = Object.values(routes).find((r) => r[locale] === parts[2] || r.fr === parts[2]);
      if (route) parts[2] = route[target];
    }
    return parts.join('/') + (search ? `?${search}` : '');
  };
  return (
    <div className="lang" role="group" aria-label="Langue / Taal">
      {(['fr', 'nl'] as const).map((l) => (
        <Link key={l} href={to(l)} aria-current={l === locale ? 'true' : undefined} hrefLang={l} prefetch={false}>
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
