# Guide de l'administration

Adresse : `https://votre-site/admin`. Mot de passe : la valeur `ADMIN_PASSWORD` de la configuration. La session dure 12 heures.

## Traiter une demande de devis

1. À chaque nouvelle demande, un e-mail arrive à l'adresse `DEALER_NOTIFY_EMAILS`, avec le PDF en pièce jointe et un bouton vers l'admin.
2. Dans **Demandes de devis**, les compteurs par statut sont cliquables. La recherche porte sur le nom, l'e-mail, la société et le numéro.
3. Ouvrez la demande. À droite : coordonnées du client, reprise (avec photos), financement, délai souhaité, remarque.
4. À gauche, vous pouvez **modifier le devis avant l'envoi définitif** :
   - changer un libellé, une quantité ou un prix (laissez le prix vide pour « sur demande ») ;
   - ajouter une ligne (livraison, mise en route, immatriculation, reprise en négatif…) ;
   - retirer une ligne (case « Retirer ») ;
   - appliquer une **remise HT** globale ;
   - changer la date de validité et ajouter une note interne (jamais visible par le client).
5. **Enregistrer** garde vos modifications. **Enregistrer et envoyer le devis définitif** envoie au client un e-mail avec le PDF à jour et passe le statut à « Envoyé ».
6. Faites évoluer le statut : *Nouveau → En cours → Envoyé → Accepté* ou *Perdu*. Le statut peut aussi se changer directement depuis la liste.
7. **Exporter en CSV** (en haut de la liste) produit un fichier ouvrable dans Excel, filtré par le statut affiché.

Le client voit toujours son devis à jour sur son lien privé, et peut le **modifier** : cela crée un nouveau devis relié à l'ancien (« Modification du devis FS-… »).

**RGPD** : le bouton « Supprimer ce devis » efface définitivement la demande à la demande d'un client. Les demandes sans suite sont à supprimer au plus tard 3 ans après le dernier contact (voir la politique de confidentialité).

## Modifier un prix

- **Rapidement** : *Produits* (ou *Options*), tapez le nouveau prix HT dans la colonne de droite et cliquez sur ✓. Laissez vide pour « prix sur demande ».
- **En masse** : *Import / export → Produits (.xlsx)*, modifiez la colonne `prix_ht` dans Excel, enregistrez, puis réimportez le fichier dans *Importer*.

Les prix s'affichent HT ; la TVA de 21 % est calculée automatiquement. Le site se met à jour en moins d'une minute.

## Ajouter un produit

1. *Produits → + Nouveau produit*.
2. Renseignez au minimum la **référence**, le **type**, la **marque**, la **catégorie** et le **nom**.
   - Catégories des tracteurs : `electrique`, `compact-18-30`, `compact-30-50`, `plus-50`.
   - Catégories des machines : `broyeur-fleaux`, `gyrobroyeur`, `fraise`, `tondeuse`, `herse-rotative`, `epandeur`, `lame`, `scarificateur`… Un nouveau type s'affiche tel quel ; ajoutez sa traduction dans `src/lib/i18n.ts` (`machineTypes`) si vous le souhaitez.
3. Remplissez les **caractéristiques de compatibilité**. Ce sont elles qui permettent au configurateur de filtrer :
   - tracteur : puissance, capacité de relevage, catégorie d'attelage, prise de force, largeur d'outil conseillée ;
   - machine : largeur de travail, puissance min. (et max.), poids, attelage, montage, PDF nécessaire.
4. Machines en plusieurs largeurs : créez un produit par largeur avec la **même famille** (ex. `peruzzo-fox`) et le même **nom de famille**. Le configurateur les regroupe et propose le choix de la largeur.
5. Photos : collez des URL ou envoyez des fichiers ; la première photo est la principale. Ajoutez la brochure PDF et le lien YouTube si vous en avez.
6. Enregistrez. Décochez **Actif** pour masquer un produit sans le supprimer.

## Ajouter une option, des pneus, un chargeur

*Options → + Nouvelle option*. Les champs clés :

| Champ | Exemple |
|---|---|
| Groupe | `pneus`, `poste`, `option`, `chargeur`, `outil` |
| Tracteurs concernés | `FT26-HST;FT26-MT` ou `*` |
| Choisi par défaut pour | les tracteurs où c'est la monte de base (prix 0) |
| Nécessite une de ces options | pour un godet : `FT-CHARGEUR-FT26;FT-CHARGEUR-FT20-22` |
| Fonction | `relevage-avant`, `pdf-avant`, `chargeur` (utilisées par les règles machines) |
| Mot-clé visuel | `cabine`, `arceau`, `chargeur`, `gazon`, `agraire`, `industriel` |
| Pneu avant / arrière | `23 x 8.50-12` / `33 x 15.5-16.5` |

Prix : vide = sur demande, `0` = inclus, sinon le supplément HT.

Exemples à ajouter quand vous aurez les tarifs : gyrophare, phares de travail, homologation route, PDF avant, distributeurs supplémentaires.

## Import CSV / Excel

- Séparateur `;`, encodage UTF-8, première ligne = noms de colonnes (exactement ceux des modèles).
- Une ligne dont la **référence** existe est mise à jour, sinon elle est créée. Rien n'est supprimé.
- Listes : plusieurs références séparées par `;` (tracteurs) ; plusieurs photos séparées par ` | `.
- Fiche technique (`caracteristiques`) : `Puissance: 24,5 ch | Poids: 1010 kg`.
- Prix : `10995,00` ou `10 995,00` ; vide = sur demande.
- Oui/non : `oui` / `non`.
- Si un import réécrit une URL externe déjà rapatriée (photo, 360°), la version locale est conservée.
- Les erreurs sont listées avec leur numéro de ligne ; les autres lignes sont importées normalement.

Modèles vides et exports : *Import / export*. Le catalogue initial est dans `data/catalogue-initial/`.

## Vue 360° et 3D

**Séquence de photos** (36 vues autour du tracteur) : déposez les photos numérotées `1.jpg` à `36.jpg` dans un dossier, puis indiquez le motif dans « Vue 360° : motif d'URL », par exemple `/uploads/360/ft26/{frame}.jpg`.

Pour que la vue suive les choix du client, faites une séquence par combinaison et utilisez `{variant}` : `/uploads/360/ft26/{variant}/{frame}.jpg`. Le nom de la variante est la liste triée des mots-clés visuels des options choisies, par exemple `arceau-gazon`, `cabine-gazon`, `arceau-chargeur-gazon`. Ajoutez `machine` quand une machine est attelée.

**Modèle 3D** : envoyez un fichier `.glb` (moins de 40 Mo, idéalement moins de 10 Mo, textures compressées) dans « Envoyer un fichier GLB ». Avec plusieurs fichiers par combinaison, utilisez le même principe : `/uploads/3d/ft26/{variant}.glb`. Si une variante manque, le modèle de base est affiché.

## Catalogue initial : ce qu'il faut vérifier

Le catalogue a été relevé le 13/11/2026 sur herco-machinery.com, iseki.fr et solisbelgium.be. Chaque produit indique sa source et une note.

- **Farmtrac et machines Herco** : prix publics HT de Herco. Certains sont des prix promotionnels « valables pour les produits en stock » (voir la note du produit) : remplacez-les par **vos** prix de vente.
- **Iseki** : prix français non repris (marché différent) → à saisir.
- **Solis** : la fiche technique détaillée n'est que dans la brochure PDF → puissance indiquée, relevage, pneus et poids à compléter.
- **Catégorie d'attelage** des Farmtrac et **largeur d'outil conseillée** : non publiées, à compléter pour activer ces contrôles.
- **Usages** (prairie, pelouse, cour, maraîchage) : déduits des pneus disponibles, à ajuster.
- **Photos** : visuels des importateurs. Vérifiez avec Herco, Iseki et Solis que vous pouvez les utiliser sur votre site (c'est en général le cas pour un concessionnaire agréé).

## Textes du site

- Textes de l'interface FR/NL : `src/lib/i18n.ts`.
- Conditions générales et politique de confidentialité : `src/content/legal.ts` (**modèles à faire valider** par votre comptable ou juriste).
- Coordonnées : variables `COMPANY_*` de la configuration.
