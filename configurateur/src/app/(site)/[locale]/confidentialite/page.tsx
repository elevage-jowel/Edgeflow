import type { Metadata } from 'next';
import { privacy } from '@/content/legal';
import { company } from '@/lib/config';
import { fill, t, type Locale } from '@/lib/i18n';

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return { title: privacy[params.locale].title };
}

export default function Privacy({ params }: { params: { locale: Locale } }) {
  const p = privacy[params.locale];
  const vars = { company: company.name, address: company.address, email: company.email, phone: company.phone };
  return (
    <div className="container" style={{ paddingBlock: '56px 96px', maxWidth: 760 }}>
      <h1 className="display" style={{ fontSize: 'clamp(30px, 4vw, 44px)', marginBottom: 28 }}>{p.title}</h1>
      <div style={{ display: 'grid', gap: 24 }}>
        {p.sections.map(([h, body]) => (
          <section key={h}>
            <h2 className="wide" style={{ fontSize: 18, textTransform: 'uppercase', marginBottom: 6 }}>{h}</h2>
            <p className="muted">{fill(body, vars)}</p>
          </section>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 32, fontSize: 13 }}>{t(params.locale).footer.prices}</p>
    </div>
  );
}
