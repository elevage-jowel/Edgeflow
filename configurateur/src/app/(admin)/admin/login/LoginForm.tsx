'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { login } from '../actions';

function Submit() {
  const { pending } = useFormStatus();
  return <button className="a-btn primary" disabled={pending}>{pending ? 'Connexion…' : 'Se connecter'}</button>;
}

export function LoginForm({ next, configured }: { next: string; configured: boolean }) {
  const [state, action] = useFormState(login, null);
  return (
    <form action={action}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-forestar.png" alt="Forestar" style={{ height: 24, width: 'auto' }} />
      <h1 style={{ fontSize: 20 }}>Administration du configurateur</h1>
      {!configured && <p className="a-msg err">ADMIN_PASSWORD n’est pas défini dans le fichier .env.</p>}
      <input type="hidden" name="next" value={next} />
      <label className="a-field">
        <span>Mot de passe</span>
        <input className="a-input" type="password" name="password" required autoFocus autoComplete="current-password" />
      </label>
      {state?.error && <p className="a-msg err" role="alert">{state.error}</p>}
      <Submit />
    </form>
  );
}
