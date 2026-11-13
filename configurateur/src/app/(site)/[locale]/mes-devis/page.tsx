import type { Metadata } from 'next';
import { t, type Locale } from '@/lib/i18n';
import { AccountForm } from '@/components/AccountForm';

export const metadata: Metadata = { robots: { index: false } };

export default function Account({ params }: { params: { locale: Locale } }) {
  const m = t(params.locale);
  return (
    <div className="container" style={{ paddingBlock: '64px 96px', maxWidth: 560 }}>
      <h1 className="display" style={{ fontSize: 'clamp(30px, 4vw, 44px)', marginBottom: 14 }}>{m.account.title}</h1>
      <p className="muted" style={{ marginBottom: 24 }}>{m.account.lead}</p>
      <AccountForm locale={params.locale} />
    </div>
  );
}
