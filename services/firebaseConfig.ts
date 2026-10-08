/** Configuração centralizada; cada clone pode sobrescrever via .env.local. */
const env = import.meta.env as Record<string, string | undefined>;
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyBwyV2KFRf_T_Hsh10A8sXoJusuLIAUQ35Y",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "blutecnologias-site.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "blutecnologias-site",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "blutecnologias-site.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "22963166270",
  appId: env.VITE_FIREBASE_APP_ID || "1:22963166270:web:0f3848fc534cc4f20cc56f",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-8Q9H1KYGG0",
};
export const firebaseFunctionsRegion = env.VITE_FIREBASE_FUNCTIONS_REGION || "us-central1";
