'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { importFile } from '../actions';

function Submit() {
  const { pending } = useFormStatus();
  return <button className="a-btn primary" disabled={pending}>{pending ? 'Import en cours…' : 'Importer'}</button>;
}

export function ImportForm() {
  const [state, action] = useFormState(importFile, null);
  return (
    <form action={action} className="a-form">
      <div className="a-fields">
        <label className="a-field">
          <span>Contenu du fichier</span>
          <select className="a-select" name="kind" defaultValue="produits">
            <option value="produits">Produits (tracteurs et machines)</option>
            <option value="options">Options (pneus, cabine, options, chargeurs, outils)</option>
          </select>
        </label>
        <label className="a-field"><span>Fichier</span><input type="file" name="file" accept=".csv,.xlsx" required /></label>
      </div>
      <div><Submit /></div>
      {state?.error && <p className="a-msg err" role="alert">{state.error}</p>}
      {state?.report && (
        <div className={`a-msg ${state.report.errors.length ? 'err' : ''}`} role="status">
          {state.kind} : {state.report.created} créé(s), {state.report.updated} mis à jour, {state.report.errors.length} erreur(s).
          {state.report.errors.length > 0 && (
            <ul>{state.report.errors.slice(0, 30).map((e) => <li key={e.line}>Ligne {e.line} : {e.message}</li>)}</ul>
          )}
        </div>
      )}
    </form>
  );
}
