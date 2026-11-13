import { Suspense } from 'react';
import Link from 'next/link';
import { href, t, type Locale } from '@/lib/i18n';
import { LangSwitch } from './LangSwitch';

export function Header({ locale }: { locale: Locale }) {
  const m = t(locale);
  return (
    <header className="site-header">
      <div className="container">
        <Link href={`/${locale}`} className="logo" aria-label="Forestar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-forestar-blanc.png" alt="Forestar" width={670} height={108} style={{ height: 22, width: "auto" }} />
        </Link>
        <nav aria-label="Menu principal">
          <Link className="nav-link" href={href(locale, 'tractors')}>{m.nav.tractors}</Link>
          <Link className="nav-link" href={href(locale, 'machines')}>{m.nav.machines}</Link>
          <Link className="nav-link" href={href(locale, 'account')}>{m.nav.account}</Link>
          <Link className="btn btn-primary btn-sm nav-link" href={href(locale, 'configurator')}>{m.nav.configurator}</Link>
          <Link className="btn btn-primary btn-sm nav-cta" href={href(locale, 'configurator')}>{m.nav.configurator}</Link>
          <Suspense fallback={null}>
            <LangSwitch locale={locale} />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
