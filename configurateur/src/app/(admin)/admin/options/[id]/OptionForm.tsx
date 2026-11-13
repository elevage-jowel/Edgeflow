'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { saveOption } from '../../actions';

type Row = Record<string, string>;

function Save() {
  const { pending } = useFormStatus();
  return <button className="a-btn primary" disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer'}</button>;
}

export function OptionForm({ id, row }: { id: number; row: Row }) {
  const [state, action] = useFormState(saveOption, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.id && !id) router.replace(`/admin/options/${state.id}`);
  }, [state, id, router]);
  const f = (name: string, label: string, hint?: string, full?: boolean) => (
    <label className={`a-field ${full ? 'full' : ''}`} key={name}>
      <span>{label}</span>
      <input className="a-input" name={name} defaultValue={row[name] ?? ''} />
      {hint && <small>{hint}</small>}
    </label>
  );
  return (
    <form action={action} className="a-card a-form">
      <input type="hidden" name="id" value={id} />
      <div className="a-fields">
        {f('reference', 'Référence *')}
        <label className="a-field">
          <span>Groupe *</span>
          <select className="a-select" name="groupe" defaultValue={row.groupe}>
            <option value="pneus">Pneumatiques (choix unique)</option>
            <option value="poste">Poste de conduite (choix unique)</option>
            <option value="option">Option tracteur</option>
            <option value="chargeur">Chargeur frontal (choix unique)</option>
            <option value="outil">Outil de chargeur</option>
          </select>
        </label>
        {f('nom_fr', 'Nom (FR) *')}
        {f('nom_nl', 'Nom (NL)')}
        {f('prix_ht', 'Prix HT (€)', 'Vide = sur demande ; 0 = inclus.')}
        {f('tracteurs', 'Tracteurs concernés *', 'Références séparées par « ; », ou « * » pour tous.', true)}
        {f('par_defaut', 'Choisi par défaut pour', 'Références des tracteurs (ou « * »).', true)}
        {f('necessite_une_de', 'Nécessite une de ces options', 'Ex. : outil → références des chargeurs.', true)}
        {f('exclut', 'Incompatible avec', 'Références séparées par « ; ».', true)}
        {f('visuel', 'Mot-clé visuel', 'cabine, arceau, chargeur, gazon, agraire, industriel… (vue 360° / 3D)')}
        {f('fonction', 'Fonction', 'relevage-avant, pdf-avant, chargeur, homologation… (règles machines)')}
        {f('pneu_avant', 'Pneu avant (dimension)')}
        {f('pneu_arriere', 'Pneu arrière (dimension)')}
        {f('largeur_cm', 'Largeur hors tout (cm)')}
        {f('photo', 'Photo (URL)')}
        <label className="a-field"><span>Envoyer une photo</span><input type="file" name="newPhoto" accept="image/*" /></label>
        {f('ordre', 'Ordre')}
        <label className="a-field">
          <span>Actif</span>
          <select className="a-select" name="actif" defaultValue={row.actif || 'oui'}><option value="oui">Oui</option><option value="non">Non</option></select>
        </label>
        <label className="a-field full"><span>Description (FR)</span><textarea className="a-textarea" name="description_fr" defaultValue={row.description_fr ?? ''} /></label>
        <label className="a-field full"><span>Description (NL)</span><textarea className="a-textarea" name="description_nl" defaultValue={row.description_nl ?? ''} /></label>
        <input type="hidden" name="source" defaultValue={row.source ?? ''} />
      </div>
      {state?.ok && <p className="a-msg" role="status">{state.ok}</p>}
      {state?.error && <p className="a-msg err" role="alert">{state.error}</p>}
      <div><Save /></div>
    </form>
  );
}
