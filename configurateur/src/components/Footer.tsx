import Link from 'next/link';
import { company } from '@/lib/config';
import { href, t, type Locale } from '@/lib/i18n';

export function Footer({ locale }: { locale: Locale }) {
  const m = t(locale);
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="cols">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-forestar-blanc.png" alt="Forestar" width={670} height={108} style={{ height: 24, width: 'auto', marginBottom: 14 }} />
            <p>{company.address}</p>
            <p>
              <a href={`tel:${company.phone.replace(/\s/g, '')}`}>{company.phone}</a> · <a href={`mailto:${company.email}`}>{company.email}</a>
            </p>
            <p style={{ marginTop: 8 }}>{m.footer.hours}</p>
          </div>
          <div>
            <h3>{m.nav.configurator}</h3>
            <ul>
              <li><Link href={href(locale, 'tractors')}>{m.nav.tractors}</Link></li>
              <li><Link href={href(locale, 'machines')}>{m.nav.machines}</Link></li>
              <li><Link href={href(locale, 'configurator')}>{m.nav.configurator}</Link></li>
              <li><Link href={href(locale, 'account')}>{m.nav.account}</Link></li>
            </ul>
          </div>
          <div>
            <h3>{company.name}</h3>
            <ul>
              <li><a href="https://forestar.be" rel="noopener">forestar.be</a></li>
              <li><Link href={href(locale, 'privacy')}>{m.footer.privacy}</Link></li>
              <li><Link href={href(locale, 'terms')}>{m.footer.terms}</Link></li>
            </ul>
          </div>
        </div>
        <div className="legal">
          <span>© {new Date().getFullYear()} {company.name}{company.vat ? ` · TVA ${company.vat}` : ''} · {m.footer.dealer}</span>
          <span>{m.footer.prices}</span>
        </div>
      </div>
    </footer>
  );
}
