// src/firebase.js
// ⚠️ REMPLACE CES VALEURS PAR TON PROJET FIREBASE
// Va sur https://console.firebase.google.com → Crée un projet → Paramètres → Config web

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "REMPLACE_PAR_TON_API_KEY",
  authDomain: "REMPLACE_PAR_TON_AUTH_DOMAIN",
  projectId: "REMPLACE_PAR_TON_PROJECT_ID",
  storageBucket: "REMPLACE_PAR_TON_STORAGE_BUCKET",
  messagingSenderId: "REMPLACE_PAR_TON_SENDER_ID",
  appId: "REMPLACE_PAR_TON_APP_ID"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
