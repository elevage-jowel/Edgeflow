#!/bin/bash
cd "$(dirname "$0")"

echo "========================================="
echo "   EdgeFlow — Démarrage..."
echo "========================================="

# Crée .env.local si absent
if [ ! -f .env.local ]; then
  echo "Création du fichier de config..."
  cat > .env.local << 'EOF'
NEXT_PUBLIC_FIREBASE_API_KEY=dummy
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=dummy.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=dummy
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=dummy.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000
NEXT_PUBLIC_FIREBASE_APP_ID=1:000000:web:000000
NEXT_PUBLIC_DEMO=true
EOF
fi

# Installe les dépendances si besoin
if [ ! -d node_modules ]; then
  echo "Installation (1-2 minutes la première fois)..."
  npm install
fi

echo ""
echo "✅ Prêt ! Ouverture dans le navigateur..."
echo "   → http://localhost:3000"
echo ""
echo "   Pour arrêter : ferme cette fenêtre"
echo "========================================="

# Ouvre le navigateur après 4 secondes
sleep 4 && open http://localhost:3000 &

npm run dev
