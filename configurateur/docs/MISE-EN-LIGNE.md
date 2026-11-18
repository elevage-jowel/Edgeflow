# Mise en ligne sur Vercel, pas à pas

Durée : 15 minutes environ. Coût : gratuit pour démarrer (offres gratuites Vercel, Neon et Blob).
Tout se fait depuis le navigateur, sans installer quoi que ce soit.

Au premier déploiement, le site se prépare tout seul : création des tables, import du catalogue
(39 tracteurs, 173 machines, 203 options) et copie des photos dans votre stockage.

---

## 1. Créer le projet

1. Connectez-vous sur **vercel.com** avec votre compte GitHub.
2. **Add New… → Project**, puis **Import** du dépôt **Edgeflow**.
3. Dans l'écran de configuration :
   - **Root Directory** : cliquez sur *Edit* et choisissez **`configurateur`** (indispensable) ;
   - **Framework Preset** : Next.js (détecté automatiquement) ;
   - ne touchez pas aux commandes de build : elles sont dans `vercel.json`.
4. Ne cliquez **pas encore** sur *Deploy* : passez à l'étape 2. Si c'est déjà fait, ce n'est pas grave : le premier déploiement échouera faute de base de données ; il suffira de cliquer sur *Redeploy* après l'étape 2.

> Branche : tant que le travail n'est pas fusionné dans la branche principale, choisissez la branche
> `claude/charming-wright-js47h9` dans *Settings → Git → Production Branch*.

## 2. Base de données et stockage

Dans le projet : onglet **Storage**.

1. **Create Database → Neon (Serverless Postgres)** → région **Frankfurt (eu-central-1)** → *Connect* au projet.
   Vercel ajoute seul la variable `DATABASE_URL`.
2. **Create → Blob** → *Connect* au projet.
   Vercel ajoute seul la variable `BLOB_READ_WRITE_TOKEN`.
   C'est là que vont les photos du catalogue, les photos de reprise envoyées par les clients et celles que vous ajoutez dans l'admin.

## 3. Variables d'environnement

**Settings → Environment Variables**, pour l'environnement *Production* (et *Preview* si vous voulez tester des versions) :

| Nom | Valeur | Obligatoire |
|---|---|---|
| `ADMIN_PASSWORD` | votre mot de passe d'administration (long et unique) | oui |
| `SESSION_SECRET` | 64 caractères aléatoires : sur Mac, tapez `openssl rand -hex 32` dans le Terminal | oui |
| `DEALER_NOTIFY_EMAILS` | `info@forestar.be` (plusieurs adresses séparées par des virgules) | oui |
| `COMPANY_VAT` | votre numéro de TVA, affiché sur les devis PDF | recommandé |
| `COMPANY_IBAN` | votre IBAN, affiché en pied de PDF | facultatif |
| `SITE_URL` | l'adresse définitive, ex. `https://configurateur.forestar.be` (sans `/` final) | dès que le domaine est branché |

Nom, adresse, téléphone, e-mail et couleur Forestar sont déjà réglés par défaut.

## 4. Déployer

**Deployments → Redeploy** (ou *Deploy* si c'est le premier).
Le premier build dure **5 à 15 minutes** : il copie environ 600 photos et 8 vues 360°. Les suivants prennent 2 à 3 minutes.

Dans le journal de build, vous devez voir :

```
▶ Mise à jour de la base de données
✓ Base de données à jour
▶ Catalogue initial (si la base est vide)
✓ produits : 212 créés …
▶ Copie des photos dans votre stockage
Terminé : … fichiers copiés
```

Si la copie des photos n'a pas tout terminé (site d'un importateur lent), le site est quand même mis en ligne :
les photos manquantes s'affichent depuis le site de l'importateur et la copie reprend au déploiement suivant.

## 5. Vérifier

Ouvrez l'adresse `….vercel.app` :

- [ ] `/fr` et `/nl` : la page d'accueil s'affiche avec la photo du Farmtrac
- [ ] `/fr/configurateur` : choisir un tracteur, des pneus, une machine ; le prix change
- [ ] Envoyer une demande de devis test avec votre adresse : le récapitulatif et le PDF s'affichent
- [ ] `/admin` : connexion avec `ADMIN_PASSWORD`, la demande test apparaît ; supprimez-la ensuite
- [ ] Dans l'admin, *Produits* : modifiez un prix, il change sur le site en moins d'une minute

## 6. E-mails (devis au client, alerte pour vous)

Sans cette étape, tout fonctionne mais aucun e-mail ne part : les demandes sont à consulter dans l'admin.

1. Créez un compte gratuit chez **Brevo** (brevo.com, 300 e-mails/jour) ou **Resend** (resend.com, 3 000/mois).
2. Validez votre domaine `forestar.be` en ajoutant chez votre hébergeur de domaine les enregistrements **SPF** et **DKIM** indiqués (sinon les devis arrivent en indésirables).
3. Ajoutez dans Vercel :

| Nom | Brevo | Resend |
|---|---|---|
| `SMTP_HOST` | `smtp-relay.brevo.com` | `smtp.resend.com` |
| `SMTP_PORT` | `587` | `587` |
| `SMTP_USER` | l'identifiant SMTP fourni | `resend` |
| `SMTP_PASSWORD` | la clé SMTP fournie | votre clé API Resend |
| `MAIL_FROM` | `Forestar <devis@forestar.be>` | `Forestar <devis@forestar.be>` |

4. *Redeploy*, puis refaites un devis test : vous devez recevoir l'e-mail client (avec PDF) et l'alerte à `DEALER_NOTIFY_EMAILS`.

## 7. Votre adresse (domaine)

1. **Settings → Domains → Add** : `configurateur.forestar.be` (ou `www.forestar.be/configurateur` via votre site actuel, à voir avec votre webmaster).
2. Chez votre hébergeur de domaine, ajoutez l'enregistrement **CNAME** indiqué par Vercel (`cname.vercel-dns.com`).
3. Mettez `SITE_URL` à jour (étape 3) puis *Redeploy* : les liens des e-mails, le PDF et le sitemap utilisent cette adresse.
4. Dans **Google Search Console**, ajoutez le domaine et déclarez `https://configurateur.forestar.be/sitemap.xml`.

## En cas de problème

| Symptôme | Cause probable | Solution |
|---|---|---|
| Build : « DATABASE_URL manquant » | Base Neon non reliée | Étape 2, puis *Redeploy* |
| Build : erreur de connexion à la base | Base créée dans une autre région ou suspendue | Dans Storage, vérifiez que la base est *Connected* au projet |
| `/admin` affiche « ADMIN_PASSWORD n'est pas défini » | Variable absente ou ajoutée après le déploiement | Étape 3, puis *Redeploy* |
| Les devis ne partent pas par e-mail | SMTP non configuré | Étape 6 |
| Une photo manque | Copie interrompue | *Redeploy* : la copie reprend |

Les autres sujets (ajouter un produit, modifier un prix, traiter un devis) sont dans [GUIDE-ADMIN.md](GUIDE-ADMIN.md).
