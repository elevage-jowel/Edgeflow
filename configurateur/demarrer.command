#!/bin/bash
# Double-cliquez sur ce fichier (Mac) pour lancer le configurateur en local.
cd "$(dirname "$0")"

echo "========================================="
echo "   Configurateur Forestar — Démarrage"
echo "========================================="

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "Node.js n'est pas installé."
  echo "Installez la version LTS depuis https://nodejs.org puis relancez ce fichier."
  read -n 1 -s -r -p "Appuyez sur une touche pour fermer."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installation des composants (2-3 minutes la première fois)..."
  npm install || { read -n 1 -s -r -p "Erreur d'installation. Appuyez sur une touche."; exit 1; }
fi

# Ouvre le navigateur quand le site répond
( until curl -s -o /dev/null http://localhost:3000/fr; do sleep 2; done; open http://localhost:3000/fr ) &

echo ""
echo "Pour arrêter : fermez cette fenêtre (ou Ctrl+C)."
echo ""
npm run local
