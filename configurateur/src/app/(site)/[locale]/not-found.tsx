import Link from 'next/link';

/** Page introuvable (bilingue : la langue n'est pas connue à ce niveau). */
export default function NotFound() {
  return (
    <div className="container" style={{ paddingBlock: '96px 120px', display: 'grid', gap: 18, maxWidth: 720 }}>
      <span className="eyebrow">404</span>
      <h1 className="display" style={{ fontSize: 'clamp(34px, 5vw, 60px)' }}>
        Page introuvable
        <br />
        <span className="muted" style={{ fontSize: '0.55em' }}>Pagina niet gevonden</span>
      </h1>
      <p className="muted">
        Ce modèle n’est peut-être plus au catalogue. · Dit model staat misschien niet meer in de catalogus.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link className="btn btn-primary" href="/fr/configurateur">Configurer un tracteur</Link>
        <Link className="btn btn-ghost" href="/fr/tracteurs">Tracteurs</Link>
        <Link className="btn btn-ghost" href="/nl/tractoren">Tractoren</Link>
      </div>
    </div>
  );
}
