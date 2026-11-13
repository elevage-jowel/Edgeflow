'use client';
import { useState } from 'react';
import { t, type Locale } from '@/lib/i18n';

export function AccountForm({ locale }: { locale: Locale }) {
  const m = t(locale);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  return done ? (
    <p className="notice info" role="status">{m.account.done}</p>
  ) : (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const email = String(new FormData(e.currentTarget).get('email') ?? '');
        await fetch('/api/client-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, locale }) }).catch(() => undefined);
        setDone(true);
      }}
    >
      <div className="field">
        <label htmlFor="acc-email">{m.quote.email}</label>
        <input className="input" id="acc-email" name="email" type="email" required autoComplete="email" />
      </div>
      <button className="btn btn-primary" disabled={busy}>{m.account.send}</button>
    </form>
  );
}
