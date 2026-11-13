import { Shell } from '@/components/admin/Shell';
import { ImportForm } from './ImportForm';

export default function AdminImport() {
  return (
    <Shell current="/admin/import">
      <h1>Import / export du catalogue</h1>
      <div className="a-grid">
        <div className="a-card">
          <h2>Importer</h2>
          <p className="a-muted">
            Fichier CSV (séparateur « ; », UTF-8) ou Excel (.xlsx), première ligne = noms des colonnes. Les lignes dont la référence existe
            sont mises à jour, les autres sont créées. Rien n’est supprimé : pour retirer un produit, mettez « actif » à « non ».
          </p>
          <ImportForm />
        </div>
        <div className="a-card" style={{ display: 'grid', gap: 10 }}>
          <h2>Exporter / modèles</h2>
          <p className="a-muted">Astuce : exportez le catalogue en Excel, modifiez les prix, puis réimportez le fichier.</p>
          <a className="a-btn" href="/admin/export/produits.xlsx">Produits (.xlsx)</a>
          <a className="a-btn" href="/admin/export/produits.csv">Produits (.csv)</a>
          <a className="a-btn" href="/admin/export/options.xlsx">Options (.xlsx)</a>
          <a className="a-btn" href="/admin/export/options.csv">Options (.csv)</a>
          <hr style={{ border: 0, borderTop: '1px solid var(--a-line)', width: '100%' }} />
          <a className="a-btn" href="/admin/export/modele-produits.xlsx">Modèle vide : produits</a>
          <a className="a-btn" href="/admin/export/modele-options.xlsx">Modèle vide : options</a>
        </div>
      </div>
    </Shell>
  );
}
