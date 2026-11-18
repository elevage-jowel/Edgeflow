# Guide d'installation

## 1. Prérequis

- Node.js 20 ou 22
- Une base PostgreSQL 14+ (Supabase, Neon, ou installée sur votre serveur)
- Un compte e-mail SMTP pour l'envoi des devis (Brevo, Resend, OVH, Microsoft 365…)

## 2. Tester sur votre ordinateur (le plus simple)

Seul **Node.js** est nécessaire (version LTS sur https://nodejs.org). La base de données est fournie automatiquement.

- **Mac** : double-cliquez sur `demarrer.command` (la première fois : clic droit → *Ouvrir*, pour passer l'avertissement de sécurité).
- **Windows** : double-cliquez sur `demarrer.bat`.
- **Ou dans un terminal** : `npm install` puis `npm run local`.

Le navigateur s'ouvre sur http://localhost:3000/fr. L'administration est sur http://localhost:3000/admin, avec le mot de passe `admin` (modifiable dans `.env`). Les e-mails ne partent pas : ils s'affichent dans la fenêtre du terminal. Pour arrêter, fermez la fenêtre. Vos essais sont conservés dans le dossier `.local/`, que vous pouvez supprimer pour repartir de zéro.

## 2 bis. Installation locale avec votre propre PostgreSQL

```bash
cd configurateur
```

```bash
npm install
```

```bash
cp .env.example .env
```

Ouvrez `.env` et renseignez au minimum `DATABASE_URL`, `ADMIN_PASSWORD` et `SESSION_SECRET` (au moins 32 caractères aléatoires, par exemple le résultat de `openssl rand -hex 32`).

Créez les tables :

```bash
npm run db:migrate
```

Importez le catalogue initial (Farmtrac, Iseki, Solis et machines Herco) :

```bash
npm run catalogue:import
```

Copiez les photos et vues 360° dans votre stockage (recommandé, 230 Mo environ) :

```bash
npm run medias:rapatrier
```

Lancez le site :

```bash
npm run dev
```

Le site est sur http://localhost:3000 et l'admin sur http://localhost:3000/admin.

## 3. Mise en ligne

### Option A : Vercel (le plus simple, sans serveur à gérer)

Suivez **[MISE-EN-LIGNE.md](MISE-EN-LIGNE.md)** : base Neon et stockage Blob en quelques clics, tables, catalogue et photos installés automatiquement au premier déploiement.

### Option A bis : Vercel + Supabase

1. Créez un projet sur **supabase.com** (région Europe, Francfort). Dans *Project Settings → Database*, copiez l'URI de connexion (mode *Transaction pooler*, port 6543) : c'est votre `DATABASE_URL`.
2. Dans *Storage*, créez un bucket **public** nommé `medias`. Copiez l'URL du projet (`SUPABASE_URL`) et la clé *service_role* (`SUPABASE_SERVICE_ROLE_KEY`).
3. Depuis votre ordinateur, avec ces valeurs dans `.env`, lancez une fois `npm run db:migrate`, `npm run catalogue:import` puis `npm run medias:rapatrier` (les médias partent directement dans Supabase).
4. Sur **vercel.com**, importez le dépôt GitHub et indiquez `configurateur` comme *Root Directory*.
5. Dans *Settings → Environment Variables*, recopiez toutes les variables de votre `.env` (avec `SITE_URL` = votre adresse définitive).
6. Ajoutez votre domaine (par exemple `configurateur.forestar.be`) dans *Settings → Domains* et créez l'enregistrement DNS demandé chez votre registraire.

### Option B : un serveur (VPS Hetzner, OVH…) avec Docker ou Node

```bash
npm ci
```

```bash
npm run build
```

```bash
npm run db:migrate
```

```bash
PORT=3000 npm start
```

Placez un proxy HTTPS devant (Caddy ou Nginx) et faites tourner l'application avec `pm2` ou un service systemd. Les fichiers envoyés vont dans `uploads/` (ou `UPLOAD_DIR`) : sauvegardez ce dossier avec la base.

## 4. Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL |
| `SITE_URL` | Adresse publique du site, sans `/` final (liens des e-mails, sitemap) |
| `ADMIN_PASSWORD` | Mot de passe de l'administration |
| `SESSION_SECRET` | Secret de signature des sessions (32 caractères ou plus) |
| `COMPANY_*` | Nom, adresse, téléphone, e-mail, TVA, IBAN : affichés sur le site, les e-mails et le PDF |
| `BRAND_COLOR` | Couleur d'accent du PDF et des e-mails (par défaut le jaune Forestar `#e9b500`) |
| `QUOTE_PREFIX`, `QUOTE_VALIDITY_DAYS` | Préfixe des numéros de devis et validité (30 jours) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Envoi des e-mails. Sans `SMTP_HOST`, les e-mails sont seulement affichés dans la console. |
| `DEALER_NOTIFY_EMAILS` | Adresse(s) qui reçoivent chaque nouvelle demande (séparées par des virgules) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET` | Stockage des fichiers sur Supabase (sinon dossier local) |
| `UPLOAD_DIR` | Dossier local des fichiers (par défaut `./uploads`) |

**E-mails** : pour que les devis n'arrivent pas en indésirables, envoyez depuis votre domaine (`devis@forestar.be`) et ajoutez chez votre registraire les enregistrements SPF et DKIM fournis par votre service SMTP.

## 5. Commandes utiles

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` puis `npm start` | Production |
| `npm run db:migrate` | Met la base à jour (à lancer après chaque mise à jour du code) |
| `npm run catalogue:import -- dossier/` | Importe `produits.csv/xlsx` et `options.csv/xlsx` d'un dossier |
| `npm run medias:rapatrier` | Copie les médias externes dans votre stockage |
| `npm test` | Tests des règles de compatibilité et des calculs de prix |
| `npm run typecheck` · `npm run lint` | Vérifications du code |

## 6. Sauvegardes

Sauvegardez quotidiennement la base PostgreSQL (Supabase le fait automatiquement sur les offres payantes) et, en stockage local, le dossier `uploads/`.
