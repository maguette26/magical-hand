// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBAeLHHFyK7LW0INvPBqj9oujzbs8ggxSw",
  authDomain: "magical-hand.firebaseapp.com",
  projectId: "magical-hand",
  storageBucket: "magical-hand.firebasestorage.app",
  messagingSenderId: "60199255400",
  appId: "1:60199255400:web:9d957c53743a7f2ac32add"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);