# ✨ Magical Hand by Mamifa — Guide de démarrage complet

## 🗂️ Structure du projet

```
magical-hand/
├── public/
│   └── images/          ← Mets tes photos ici !
│       ├── mamifa.jpg   ← Photo principale (noir et blanc)
│       ├── look1.jpg    ← Photo galerie 1
│       ├── look2.jpg    ← Photo galerie 2
│       └── ...          ← (look3 à look8)
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── Hero.jsx
│   │   ├── Gallery.jsx
│   │   ├── Services.jsx
│   │   ├── Booking.jsx
│   │   └── Footer.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Admin.jsx
│   │   └── AdminLogin.jsx
│   ├── context/AuthContext.jsx
│   ├── firebase.js      ← ⚠️ À configurer !
│   └── main.jsx
├── vercel.json
└── package.json
```

---

## 📸 ÉTAPE 1 — Ajouter tes photos

Crée le dossier `public/images/` et ajoute tes photos avec ces noms :
- `mamifa.jpg` → Ta photo en noir (la dernière, la maquilleuse)
- `look1.jpg` → Photo 1 (femme tenue florale)
- `look2.jpg` → Photo 2 (tenue verte)
- `look3.jpg` → Photo 3 (avec le logo Magical Hand)
- `look4.jpg` → Photo 4 (robe bleue)
- `look5.jpg` → Photo 5 (tenue blanche voile)
- `look6.jpg` → Photo 6 (tenue rouge fond logo)
- `look7.jpg` → Photo 7 (tenue rose/fuchsia)
- `look8.jpg` → Photo 8 (look doré fond logo)

---

## 🔥 ÉTAPE 2 — Configurer Firebase

### 2.1 Créer un projet Firebase
1. Va sur https://console.firebase.google.com
2. Clique **"Créer un projet"** → Nomme-le `magical-hand`
3. Désactive Google Analytics si tu veux → Clique **Créer**

### 2.2 Activer Authentication (Email/Password)
1. Dans le menu gauche → **Authentication** → **Sign-in method**
2. Clique **Email/Password** → Active → Sauvegarde
3. Va dans l'onglet **Users** → **Ajouter un utilisateur**
   - Email : `yayefatoudiagne1999@gmail.com` (ou ce que tu veux)
   - Mot de passe : `mamifaMagicalHand` (ton mot de passe)

### 2.3 Activer Firestore Database
1. Menu gauche → **Firestore Database** → **Créer une base de données**
2. Choisis **Mode production** → Choisir une région proche (ex: europe-west1)
3. Dans **Règles**, copie le contenu du fichier `firestore.rules`

### 2.4 Activer Storage
1. Menu gauche → **Storage** → **Commencer**
2. Mode production → Créer
3. Dans **Règles**, copie le contenu du fichier `storage.rules`

### 2.5 Récupérer la config
1. Menu gauche → icône ⚙️ **Paramètres du projet**
2. Descends jusqu'à **Tes apps** → Clique **</>** (Web)
3. Nomme l'app → Clique **Enregistrer l'app**
4. Copie les valeurs dans `src/firebase.js`

```js
// src/firebase.js
const firebaseConfig = {
  apiKey: "COLLE_TON_API_KEY_ICI",
  authDomain: "COLLE_ICI.firebaseapp.com",
  projectId: "COLLE_TON_PROJECT_ID",
  storageBucket: "COLLE_ICI.appspot.com",
  messagingSenderId: "COLLE_ICI",
  appId: "COLLE_ICI"
};
```

---

## 💻 ÉTAPE 3 — Lancer en local

```bash
# Ouvre un terminal dans le dossier magical-hand
npm install
npm run dev
```

Ouvre http://localhost:5173 dans ton navigateur.

---

## 🚀 ÉTAPE 4 — Déployer sur Vercel

### Option A : Via l'interface (plus simple)
1. Va sur https://vercel.com → Crée un compte (gratuit)
2. Clique **"New Project"**
3. **"Import Git Repository"** → Connecte ton GitHub
4. Upload le dossier magical-hand sur GitHub d'abord :
   ```bash
   git init
   git add .
   git commit -m "Magical Hand by Mamifa"
   git branch -M main
   git remote add origin https://github.com/TON_USERNAME/magical-hand.git
   git push -u origin main
   ```
5. Sur Vercel → Importe le repo → Clique **Deploy**

### Option B : Via CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

Ton site sera en ligne sur : `https://magical-hand.vercel.app`

---

## 🔐 Accès Admin

- URL admin : `https://ton-site.vercel.app/admin/login`
- Email : celui que tu as créé dans Firebase Auth
- Mot de passe : `mamifaMagicalHand`

### Ce que tu peux faire dans le dashboard :
- ✅ **Disponibilités** : Cliquer sur les dates pour les rendre disponibles
- ✅ **Galerie Photos** : Uploader / supprimer des photos
- ✅ **Réservations** : Voir et gérer les RDV

---

## 💬 Comment fonctionne la réservation

1. La cliente choisit une prestation → une date disponible → son heure → son prénom
2. Elle clique **"Envoyer sur WhatsApp"**
3. Un message pré-rempli s'ouvre avec **tous les détails**
4. Elle t'envoie le message → Tu confirmes après réception du paiement Wave/Orange Money

---

## 📱 Paiement

Numéro Wave & Orange Money : **+221 77 669 57 90**

---

## 🛠️ En cas de problème

- Si les photos ne s'affichent pas : vérifie que les fichiers sont dans `public/images/`
- Si Firebase ne marche pas : vérifie ta config dans `src/firebase.js`
- Si le build échoue : `npm install` puis `npm run build`
