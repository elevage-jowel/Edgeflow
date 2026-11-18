'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { saveProduct } from '../../actions';

type Row = Record<string, string>;

const TRACTOR_CATS = [['electrique', 'Électrique'], ['compact-18-30', 'Compact 16–30 ch'], ['compact-30-50', 'Compact 30–50 ch'], ['plus-50', 'Plus de 50 ch']];

function Save() {
  const { pending } = useFormStatus();
  return <button className="a-btn primary" disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer'}</button>;
}

function F({ row, name, label, hint, type = 'text', full, area, children }: { row: Row; name: string; label: string; hint?: string; type?: string; full?: boolean; area?: boolean; children?: React.ReactNode }) {
  return (
    <label className={`a-field ${full ? 'full' : ''}`}>
      <span>{label}</span>
      {children ?? (area ? <textarea className="a-textarea" name={name} defaultValue={row[name] ?? ''} /> : <input className="a-input" name={name} type={type} defaultValue={row[name] ?? ''} />)}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function ProductForm({ id, row }: { id: number; row: Row }) {
  const [state, action] = useFormState(saveProduct, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.id && !id) router.replace(`/admin/produits/${state.id}`);
  }, [state, id, router]);
  const r = row;
  return (
    <form action={action} className="a-form">
      <input type="hidden" name="id" value={id} />
      <div className="a-card a-form">
        <h2>Identification</h2>
        <div className="a-fields">
          <F row={r} name="reference" label="Référence *" hint="Unique. Sert à l’import et aux compatibilités." />
          <F row={r} name="type" label="Type *">
            <select className="a-select" name="type" defaultValue={r.type}><option value="tracteur">Tracteur</option><option value="machine">Machine</option></select>
          </F>
          <F row={r} name="marque" label="Marque *" />
          <F row={r} name="categorie" label="Catégorie *" hint={`Tracteurs : ${TRACTOR_CATS.map((c) => c[0]).join(', ')}. Machines : broyeur-fleaux, fraise, tondeuse…`} />
          <F row={r} name="famille" label="Famille (machines)" hint="Même valeur pour les largeurs d’un même modèle." />
          <F row={r} name="nom_famille" label="Nom de la famille (FR)" hint="Affiché dans le configurateur, ex. « Peruzzo Fox »." />
          <F row={r} name="nom_famille_nl" label="Nom de la famille (NL)" />
          <F row={r} name="nom_fr" label="Nom (FR) *" />
          <F row={r} name="nom_nl" label="Nom (NL)" />
          <F row={r} name="description_fr" label="Description (FR)" area full />
          <F row={r} name="description_nl" label="Description (NL)" area full />
          <F row={r} name="points_forts_fr" label="Points forts (FR)" hint="Un par ligne." area />
          <F row={r} name="points_forts_nl" label="Points forts (NL)" area />
        </div>
      </div>
      <div className="a-card a-form">
        <h2>Prix et disponibilité</h2>
        <div className="a-fields">
          <F row={r} name="prix_ht" label="Prix HT (€)" hint="Vide = « prix sur demande »." />
          <F row={r} name="disponibilite" label="Disponibilité">
            <select className="a-select" name="disponibilite" defaultValue={r.disponibilite}><option value="en_stock">En stock</option><option value="sur_commande">Sur commande</option><option value="indisponible">Indisponible</option></select>
          </F>
          <F row={r} name="delai" label="Délai" hint="Ex. : 2 à 3 semaines" />
          <F row={r} name="actif" label="Actif">
            <select className="a-select" name="actif" defaultValue={r.actif || 'oui'}><option value="oui">Oui (visible)</option><option value="non">Non (masqué)</option></select>
          </F>
          <F row={r} name="ordre" label="Ordre d’affichage" type="number" />
        </div>
      </div>
      <div className="a-card a-form">
        <h2>Caractéristiques et compatibilités</h2>
        <div className="a-fields">
          <F row={r} name="puissance_ch" label="Puissance (ch)" hint="Tracteurs" />
          <F row={r} name="transmission" label="Transmission" />
          <F row={r} name="capacite_relevage_kg" label="Capacité de relevage (kg)" hint="Tracteurs : sert à l’alerte « trop lourd »." />
          <F row={r} name="attelage" label="Catégorie d’attelage" hint="Ex. : I, II, I/II" />
          <F row={r} name="prise_de_force" label="Prise de force" hint="Ex. : 540, 540/1000, non" />
          <F row={r} name="poids_kg" label="Poids (kg)" />
          <F row={r} name="largeur_cm" label="Largeur hors tout (cm)" />
          <F row={r} name="largeur_outil_max_cm" label="Largeur d’outil conseillée max. (cm)" hint="Tracteurs : au-delà, alerte « trop large »." />
          <F row={r} name="usages" label="Usages" hint="prairie;pelouse;cour;maraichage" />
          <F row={r} name="largeur_travail_cm" label="Largeur de travail (cm)" hint="Machines" />
          <F row={r} name="puissance_min_ch" label="Puissance min. requise (ch)" hint="Machines : en dessous, machine masquée." />
          <F row={r} name="puissance_max_ch" label="Puissance max. (ch)" hint="Machines : au-dessus, alerte." />
          <F row={r} name="montage" label="Montage (machines)">
            <select className="a-select" name="montage" defaultValue={r.montage}><option value="">—</option><option value="arriere">Arrière (3 points)</option><option value="avant">Avant (relevage avant)</option><option value="traine">Traîné</option><option value="chargeur">Sur chargeur</option></select>
          </F>
          <F row={r} name="necessite_pdf" label="Nécessite une PDF">
            <select className="a-select" name="necessite_pdf" defaultValue={r.necessite_pdf}><option value="">—</option><option value="oui">Oui</option><option value="non">Non</option></select>
          </F>
          <F row={r} name="caracteristiques" label="Fiche technique" hint="Format « Libellé: valeur | Libellé: valeur »" area full />
        </div>
      </div>
      <div className="a-card a-form">
        <h2>Médias</h2>
        <div className="a-fields">
          <F row={r} name="photos" label="Photos (URL)" hint="Séparées par « | ». La première est la photo principale." area full />
          <label className="a-field"><span>Ajouter des photos</span><input type="file" name="newPhotos" accept="image/*" multiple /></label>
          <F row={r} name="video" label="Vidéo (lien YouTube ou Vimeo)" />
          <F row={r} name="brochure" label="Brochure PDF (URL)" />
          <label className="a-field"><span>Envoyer une brochure PDF</span><input type="file" name="newBrochure" accept="application/pdf" /></label>
          <F row={r} name="vue360_url" label="Vue 360° : motif d’URL" hint="Avec {frame} (1…N) et éventuellement {variant}. Voir le guide admin." full />
          <F row={r} name="vue360_images" label="Nombre d’images 360°" type="number" />
          <F row={r} name="modele3d_url" label="Modèle 3D GLB (URL)" hint="{variant} facultatif" />
          <label className="a-field"><span>Envoyer un fichier GLB</span><input type="file" name="newModel" accept=".glb,model/gltf-binary" /></label>
          <F row={r} name="source" label="Source" />
          <F row={r} name="notes" label="Notes internes" area full />
        </div>
      </div>
      {state?.ok && <p className="a-msg" role="status">{state.ok}</p>}
      {state?.error && <p className="a-msg err" role="alert">{state.error}</p>}
      <div><Save /></div>
    </form>
  );
}
