# Relevé du catalogue initial

Outils utilisés le 13/11/2026 pour produire `data/catalogue-initial/` à partir des sites publics :

- `herco.py` : tracteurs et options Farmtrac (herco-machinery.com)
- `herco2.py` + `cats.json` : machines Herco (Peruzzo, Garmech, Beroni, Balfor, Ecolawn, Mateng, Wallenstein)
- `others.py` : tracteurs Iseki (iseki.fr) et Solis (solisbelgium.be)
- `build_csv.py` : conversion vers `produits.csv` et `options.csv` (aucune valeur inventée ; champs absents laissés vides)

Ils ne font pas partie de l'application. Les sites sources changent : ces scripts peuvent nécessiter des ajustements
avant un nouveau relevé. Pour la mise à jour courante des prix, utilisez plutôt l'export / import Excel de l'admin.

Usage : `python3 herco.py <dossier>` puis `python3 others.py <dossier>` puis `python3 build_csv.py <dossier> <sortie>`.
