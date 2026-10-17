/** Configuração centralizada; cada clone pode sobrescrever via .env.local. */
const env = import.meta.env as Record<string, string | undefined>;
const configuredApiKey = env.VITE_FIREBASE_API_KEY?.trim() || '';
// Firebase Auth exige um apiKey não vazio durante getAuth(). O marcador abaixo
// permite que a aplicação renderize e mostre o erro de configuração no login;
// não é uma chave utilizável e as operações de autenticação são bloqueadas.
const apiKey = configuredApiKey || 'FIREBASE_API_KEY_NOT_CONFIGURED';
export const firebaseConfig = {
  apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "blutecnologias-site.firebaseapp.com",
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || "",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "blutecnologias-site",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "blutecnologias-site.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "22963166270",
  appId: env.VITE_FIREBASE_APP_ID || "1:22963166270:web:0f3848fc534cc4f20cc56f",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-8Q9H1KYGG0",
};
export const firebaseClientConfigError = configuredApiKey ? null : 'VITE_FIREBASE_API_KEY não configurada';
export const firebaseFunctionsRegion = env.VITE_FIREBASE_FUNCTIONS_REGION || "us-central1";
