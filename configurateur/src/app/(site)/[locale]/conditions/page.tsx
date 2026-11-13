import type { Metadata } from 'next';
import { conditionsGenerales } from '@/content/legal';
import { t, type Locale } from '@/lib/i18n';

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return { title: t(params.locale).footer.terms };
}

export default function Terms({ params }: { params: { locale: Locale } }) {
  const m = t(params.locale);
  return (
    <div className="container" style={{ paddingBlock: '56px 96px', maxWidth: 760 }}>
      <h1 className="display" style={{ fontSize: 'clamp(30px, 4vw, 44px)', marginBottom: 28 }}>{m.footer.terms}</h1>
      <ol style={{ display: 'grid', gap: 14, paddingLeft: 20 }} className="muted">
        {conditionsGenerales[params.locale].map((p) => <li key={p}>{p}</li>)}
      </ol>
    </div>
  );
}
