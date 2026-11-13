# Configurateur Forestar

Configurateur de tracteurs et devis en ligne pour **Forestar** (Braine-le-Comte), concessionnaire agréé Herco Machinery.

Le client compose son tracteur (Farmtrac, Iseki, Solis), choisit pneus, poste de conduite, options, chargeur et outils,
puis les machines compatibles (Peruzzo, Garmech, Beroni, Balfor, Ecolawn, Mateng, Wallenstein). Le prix HT et TVAC se
met à jour en direct. Il demande son devis en un clic, le voit aussitôt à l'écran, le télécharge en PDF et le reçoit
par e-mail ; Forestar reçoit la demande et la traite dans l'administration.

- Français et néerlandais, mobile d'abord, Lighthouse ≥ 90
- Compatibilités automatiques (puissance, relevage, attelage, montage, PDF) avec explications
- Vue 360° (séquences de photos) et 3D (GLB), lien de partage, espace « mes devis »
- Admin : demandes, statuts, édition du devis, remise, envoi définitif, export CSV, import Excel du catalogue

## Démarrage rapide

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run db:migrate
```

```bash
npm run catalogue:import
```

```bash
npm run dev
```

## Documentation

- [Architecture, arborescence et modèle de données](docs/ARCHITECTURE.md)
- [Guide d'installation et de mise en ligne](docs/INSTALLATION.md)
- [Guide de l'administration](docs/GUIDE-ADMIN.md) : ajouter un produit, modifier un prix, traiter un devis
- [Maquettes des directions graphiques](docs/maquettes/directions-graphiques.html) (direction retenue : A « Nocturne »)
