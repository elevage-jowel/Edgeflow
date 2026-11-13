'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Selection } from '@/lib/catalog-types';
import { href, t, type Locale } from '@/lib/i18n';

type Errors = Record<string, string>;

export function QuoteForm({ locale, selection, parentToken, onSent }: { locale: Locale; selection: Selection; parentToken?: string; onSent: (token: string) => void }) {
  const m = t(locale).quote;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [trade, setTrade] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files).slice(0, 5 - photos.length)) {
        const body = new FormData();
        body.append('file', f);
        const res = await fetch('/api/upload', { method: 'POST', body });
        const data = await res.json();
        if (res.ok) setPhotos((p) => [...p, data.url].slice(0, 5));
        else setError(data.error ?? m.error);
      }
    } catch {
      setError(m.networkError);
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? '').trim();
    const body = {
      locale,
      selection,
      customerName: get('name'),
      company: get('company'),
      vatNumber: get('vat'),
      email: get('email'),
      phone: get('phone'),
      address: get('address'),
      tradeIn: trade ? { brand: get('tradeBrand'), model: get('tradeModel'), year: get('tradeYear'), photos } : null,
      financing: get('financing') || 'non',
      desiredDelay: get('delay') || undefined,
      remarks: get('remarks'),
      consent: fd.get('consent') === 'on',
      website: get('website'),
      parentToken,
    };
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      const res = await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.fields ?? {});
        setError(m.error);
        setBusy(false);
        return;
      }
      onSent(data.token);
    } catch {
      setError(m.networkError);
      setBusy(false);
    }
  }


  return (
    <form className="form" onSubmit={submit} noValidate={false} id="devis">
      <div style={{ marginTop: 12 }}>
        <h2 className="wide" style={{ fontSize: 20, textTransform: 'uppercase' }}>{m.formTitle}</h2>
        <p className="muted" style={{ fontSize: 14 }}>{m.formLead}</p>
      </div>
      <div className="row2">
        <Field errors={errors} optionalLabel={m.optional} name="name" label={m.name} auto="name" span />
        <Field errors={errors} optionalLabel={m.optional} name="company" label={m.company} optional auto="organization" />
        <Field errors={errors} optionalLabel={m.optional} name="vat" label={m.vat} optional />
        <Field errors={errors} optionalLabel={m.optional} name="email" label={m.email} type="email" auto="email" />
        <Field errors={errors} optionalLabel={m.optional} name="phone" label={m.phone} type="tel" auto="tel" />
        <Field errors={errors} optionalLabel={m.optional} name="address" label={m.address} auto="street-address" span />
      </div>

      <label className="check">
        <input type="checkbox" checked={trade} onChange={(e) => setTrade(e.target.checked)} />
        <span>{m.tradeIn}</span>
      </label>
      {trade && (
        <div className="fieldset">
          <div className="row2">
            <Field errors={errors} optionalLabel={m.optional} name="tradeBrand" label={m.tradeBrand} optional />
            <Field errors={errors} optionalLabel={m.optional} name="tradeModel" label={m.tradeModel} optional />
            <Field errors={errors} optionalLabel={m.optional} name="tradeYear" label={m.tradeYear} optional />
          </div>
          <div className="field">
            <label htmlFor="q-photos">{m.tradePhotos}</label>
            <input id="q-photos" type="file" accept="image/*" multiple disabled={uploading || photos.length >= 5} onChange={(e) => upload(e.target.files)} />
            {photos.length > 0 && (
              <div className="files">
                {photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p} src={p} alt="" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="row2">
        <div className="field">
          <label htmlFor="q-financing">{m.financing}</label>
          <select className="select" id="q-financing" name="financing" defaultValue="non">
            {Object.entries(m.financingOptions).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="q-delay">{m.delay}</label>
          <select className="select" id="q-delay" name="delay" defaultValue="1-3m">
            {Object.entries(m.delayOptions).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="q-remarks">
          {m.remarks} <span className="opt-label">({m.optional})</span>
        </label>
        <textarea className="textarea" id="q-remarks" name="remarks" maxLength={2000} />
      </div>
      <div className="hp" aria-hidden>
        <label>
          Site web <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className={`check ${errors.consent ? 'invalid' : ''}`}>
        <input type="checkbox" name="consent" required />
        <span>
          {m.consent}{' '}
          <Link className="link" href={href(locale, 'privacy')} target="_blank">
            {m.privacy}
          </Link>
          .
        </span>
      </label>
      {error && (
        <p className="notice block" role="alert">
          {error}
          {Object.keys(errors).length ? ` (${Object.keys(errors).join(', ')})` : ''}
        </p>
      )}
      <button className="btn btn-primary" type="submit" disabled={busy || uploading} style={{ width: '100%' }}>
        {busy ? m.sending : m.send}
      </button>
    </form>
  );
}

type FieldProps = { name: string; label: string; type?: string; optional?: boolean; auto?: string; span?: boolean };

function Field({ name, label, type = 'text', optional, auto, span, errors, optionalLabel }: FieldProps & { errors: Errors; optionalLabel: string }) {
  return (
    <div className={`field ${errors[name] ? 'invalid' : ''}`} style={span ? { gridColumn: '1 / -1' } : undefined}>
      <label htmlFor={`q-${name}`}>
        {label} {optional && <span className="opt-label">({optionalLabel})</span>}
      </label>
      <input className="input" id={`q-${name}`} name={name} type={type} required={!optional} autoComplete={auto} aria-invalid={!!errors[name]} />
    </div>
  );
}
