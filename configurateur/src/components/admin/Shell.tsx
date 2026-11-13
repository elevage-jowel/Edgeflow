import Link from 'next/link';
import { logout } from '@/app/(admin)/admin/actions';

const NAV = [
  ['/admin', 'Demandes de devis'],
  ['/admin/produits', 'Produits'],
  ['/admin/options', 'Options'],
  ['/admin/import', 'Import / export'],
] as const;

export function Shell({ current, children }: { current: string; children: React.ReactNode }) {
  return (
    <>
      <header className="a-top">
        <div className="in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-forestar-blanc.png" alt="Forestar" />
          <nav>
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} aria-current={current === href ? 'page' : undefined}>{label}</Link>
            ))}
          </nav>
          <div className="right">
            <Link href="/fr" target="_blank" style={{ color: '#cfd8d1' }}>Voir le site ↗</Link>
            <form action={logout}>
              <button className="a-btn sm" type="submit">Déconnexion</button>
            </form>
          </div>
        </div>
      </header>
      <main className="a-main">{children}</main>
    </>
  );
}

export const STATUSES = [
  ['nouveau', 'Nouveau'],
  ['en_cours', 'En cours'],
  ['envoye', 'Envoyé'],
  ['accepte', 'Accepté'],
  ['perdu', 'Perdu'],
] as const;

export function StatusPill({ s }: { s: string }) {
  return <span className={`a-pill s-${s}`}>{STATUSES.find(([k]) => k === s)?.[1] ?? s}</span>;
}

export const eur = (c: number | null | undefined) =>
  c == null ? 'sur demande' : new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(c / 100);
export const euroInput = (c: number | null | undefined) => (c == null ? '' : (c / 100).toFixed(2).replace('.', ','));
