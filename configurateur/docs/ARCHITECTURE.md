# Architecture, arborescence et modèle de données

## Stack retenue et pourquoi

| Brique | Choix | Pourquoi |
|---|---|---|
| Application | **Next.js 14** (React, TypeScript) | Pages rendues côté serveur : rapides et bien référencées (SEO). Une seule application pour le site public, le configurateur, l'API et l'admin. |
| Base de données | **PostgreSQL** via **Drizzle ORM** | Standard, gratuit, hébergeable partout (Supabase, Neon, OVH, serveur local). Drizzle est léger et sans moteur binaire à installer. |
| Fichiers | Dossier `uploads/` **ou** Supabase Storage | Local sur un VPS ; Supabase quand l'hébergement n'a pas de disque permanent (Vercel). |
| E-mails | **SMTP** (nodemailer) | Fonctionne avec n'importe quel fournisseur : Brevo, Resend, OVH, Microsoft 365, Gmail Workspace. |
| PDF | **@react-pdf/renderer** | PDF généré sur le serveur, sans navigateur ni service externe. |
| 3D | **model-viewer** (Google) | Affiche un fichier GLB avec rotation, zoom et ombre ; chargé seulement si un modèle existe. |
| Polices | Archivo + Inter **auto-hébergées** | Aucun appel à Google Fonts : plus rapide et conforme RGPD. |

**Hébergement recommandé** : Vercel (application) + Supabase (base + fichiers), ou un VPS unique (Hetzner, OVH) avec PostgreSQL. Voir `INSTALLATION.md`.

Résultats Lighthouse (mobile simulé, serveur local) : performance 90–95, accessibilité 96+, bonnes pratiques 96, SEO 100.

## Arborescence du site

```
/                         → redirige vers /fr ou /nl selon la langue du navigateur
/fr  · /nl                accueil (grand visuel, gammes, étapes, marques)
/fr/tracteurs             liste filtrable (puissance, usage, marque)      /nl/tractoren
/fr/tracteurs/<slug>      fiche tracteur : galerie, 360°, fiche technique, brochure, vidéo,
                          prix « à partir de », boutons Configurer / Demander un devis
/fr/machines              machines par famille (marque, type)             /nl/machines
/fr/machines/<slug>       fiche machine : largeurs, compatibilités, tracteurs compatibles
/fr/configurateur         configurateur en 7 étapes                        /nl/configurator
    ?t=REF&o=…&m=…&e=N    configuration dans l'URL (partage par copier-coller)
    ?c=ID                 configuration sauvegardée (lien court)
    ?from=TOKEN           modification d'un devis existant
/fr/devis/<jeton>         récapitulatif du devis (lien privé, non indexé)  /nl/offerte/<jeton>
/fr/mes-devis             espace client : reçoit par e-mail les liens de ses devis
/fr/confidentialite       politique de confidentialité                     /nl/privacy
/fr/conditions            conditions générales                             /nl/voorwaarden

/admin                    demandes de devis (statuts, recherche, export CSV)
/admin/devis/<id>         édition du devis, remise, envoi du devis définitif
/admin/produits           produits (modification rapide des prix)
/admin/options            pneus, postes, options, chargeurs, outils
/admin/import             import / export CSV et Excel

/api/quotes               POST  création d'un devis
/api/quotes/<jeton>/pdf   GET   PDF du devis
/api/configs              POST  sauvegarde d'une configuration (lien court)
/api/upload               POST  photos de reprise
/api/client-access        POST  envoi des liens « mes devis »
/sitemap.xml · /robots.txt
```

## Arborescence du code

```
configurateur/
├─ data/catalogue-initial/     produits.csv + options.csv (relevé du 13/11/2026)
├─ docs/                       cette documentation + maquettes
├─ scripts/
│  ├─ migrate.ts               applique les migrations SQL
│  ├─ import-catalogue.ts      importe un dossier produits/options (CSV ou XLSX)
│  ├─ rapatrier-medias.ts      copie les photos et 360° externes dans votre stockage
│  └─ releve-catalogue/        outils Python utilisés pour le relevé initial
├─ src/
│  ├─ db/schema.ts             modèle de données (commenté)
│  ├─ db/migrations/           SQL généré par drizzle-kit
│  ├─ lib/
│  │  ├─ compat.ts             règles de compatibilité (pures, testées)
│  │  ├─ pricing.ts            calcul des lignes et totaux HT / TVA / TVAC
│  │  ├─ quotes.ts             création, e-mails, envoi définitif
│  │  ├─ pdf.tsx               PDF du devis
│  │  ├─ import.ts             import / export CSV et Excel
│  │  ├─ i18n.ts               textes FR / NL et URL traduites
│  │  ├─ catalog.ts            lecture du catalogue (cache 60 s)
│  │  ├─ auth.ts               session admin signée
│  │  ├─ mail.ts · storage*.ts · money.ts · config.ts
│  ├─ content/legal.ts         conditions générales et confidentialité (à faire valider)
│  ├─ components/              Configurator, QuoteForm, TractorVisual (360°/3D), …
│  ├─ app/(site)/[locale]/     pages publiques
│  ├─ app/(admin)/admin/       administration
│  ├─ app/api/                 API
│  └─ middleware.ts            langues, URL néerlandaises, protection de /admin
└─ uploads/                    fichiers envoyés (stockage local)
```

## Modèle de données

Tous les montants sont en **centimes d'euro HT** (entiers). Un prix vide (`NULL`) signifie **« prix sur demande »** : la ligne apparaît sur le devis sans être additionnée, et le client est prévenu.

### `products`: tracteurs et machines

| Champ | Rôle |
|---|---|
| `ref` | Référence unique (clé d'import, utilisée par les compatibilités) |
| `kind` | `tractor` ou `machine` |
| `brand`, `category`, `family`, `family_name` | Marque ; gamme de puissance (tracteurs) ou type (machines) ; famille = largeurs d'un même modèle |
| `name_fr/nl`, `description_fr/nl`, `highlights_fr/nl` | Textes bilingues |
| `price_ht`, `availability`, `lead_time` | Prix HT, disponibilité, délai |
| `power_hp`, `transmission`, `weight_kg`, `hitch_category`, `pto_type` | Caractéristiques communes |
| `lift_capacity_kg`, `max_implement_width_cm`, `width_cm`, `usages` | Tracteurs |
| `working_width_cm`, `min_power_hp`, `max_power_hp`, `mount`, `needs_pto` | Machines |
| `specs` | Fiche technique libre `[{label, value}]` |
| `images`, `video_url`, `brochure_url` | Médias |
| `spin_url` + `spin_frames` | Vue 360° par photos : motif d'URL avec `{frame}` et `{variant}` |
| `model_url` | Modèle 3D GLB, motif avec `{variant}` |
| `source_url`, `notes`, `active`, `sort` | Traçabilité et affichage |

### `options`: tout ce qui se greffe sur un tracteur

| Champ | Rôle |
|---|---|
| `group` | `pneus` (choix unique), `poste` (choix unique), `option`, `chargeur` (choix unique), `outil` |
| `tractor_refs` | Tracteurs concernés (`*` = tous) |
| `default_for` | Choix par défaut pour ces tracteurs (ex. pneus de base, arceau de série) |
| `requires_any` | Prérequis : au moins une de ces options (ex. godet → chargeurs) |
| `excludes` | Options incompatibles |
| `feature` | Fonction utilisée par les règles machines : `relevage-avant`, `pdf-avant`, `chargeur` |
| `visual` | Mot-clé visuel pour la 360° / 3D : `cabine`, `arceau`, `chargeur`, `gazon`… |
| `tire_front`, `tire_rear`, `width_cm` | Dimensions réelles des pneus et largeur hors tout |

### `quotes`: demandes de devis

Coordonnées du client, reprise (`trade_in` : marque, modèle, année, photos), financement, délai, remarque, **sélection** (tracteur, options, machines), **lignes figées** au moment de la demande (`lines` : rubrique, libellé, prix, quantité), sous-total, remise, TVA (21 %), total TVAC, numéro (`FS-2026-0001`), jeton du lien client, validité (30 jours), statut (`nouveau`, `en_cours`, `envoye`, `accepte`, `perdu`), date du consentement RGPD, lien vers le devis d'origine en cas de modification.

Les prix sont **recalculés côté serveur** à la création : un client ne peut pas modifier un prix depuis son navigateur.

### `saved_configs`

Identifiant court → sélection, pour les liens de partage `?c=…`.

## Règles de compatibilité (`src/lib/compat.ts`)

Pour chaque machine, face au tracteur configuré :

| Règle | Résultat |
|---|---|
| Puissance du tracteur < puissance min. de la machine | **Masquée** (affichable avec explication) |
| Catégories d'attelage sans point commun (ex. tracteur I, machine II) | Masquée |
| Poids machine > capacité de relevage | Masquée |
| Poids machine > 80 % de la capacité de relevage | **Déconseillée** (« trop lourde ») |
| Largeur > largeur d'outil conseillée du tracteur | Déconseillée (« trop large ») |
| Puissance du tracteur > puissance max. de la machine | Masquée (risque de casse) |
| Montage avant sans relevage avant choisi | Masquée, avec « ajoutez le relevage avant » |
| Machine à PDF sur un tracteur sans PDF | Masquée |

Une donnée manquante (champ vide) ne bloque jamais : la règle est simplement ignorée. Plus vous renseignez de champs, plus les conseils sont précis.

## Vue 360° et 3D

Ordre de priorité : modèle GLB → séquence de photos → photo de la variante de pneus choisie → illustration de secours.

La **variante** est la liste triée des mots-clés visuels choisis, jointe par des tirets, par exemple `arceau-chargeur-gazon` ou `cabine-gazon-machine`. Si `spin_url` vaut `/uploads/360/ft26/{variant}/{frame}.jpg`, le configurateur charge les 36 photos de la combinaison exacte. Sans `{variant}`, la même séquence sert pour toutes les combinaisons.
