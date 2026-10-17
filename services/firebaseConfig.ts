/** Configuração centralizada; cada clone pode sobrescrever via .env.local. */
const env = import.meta.env as Record<string, string | undefined>;
// Esta é a configuração pública do app Web Blu. A API key do Firebase Web é
// identificador de cliente, não uma credencial de service account. Variáveis
// VITE_FIREBASE_* continuam permitindo que clones usem seus próprios projetos.
const defaultApiKey = 'AIzaSyBwyV2KFRfT_Hsh10A8sXoJusuLIAUQ35Y';
const apiKey = env.VITE_FIREBASE_API_KEY?.trim() || defaultApiKey;
export const firebaseConfig = {
  apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "blutecnologias-site.firebaseapp.com",
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || "https://blutecnologias-site-default-rtdb.firebaseio.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "blutecnologias-site",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "blutecnologias-site.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "22963166270",
  appId: env.VITE_FIREBASE_APP_ID || "1:22963166270:web:0f3848fc534cc4f20cc56f",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-8Q9H1KYGG0",
};
export const firebaseClientConfigError = firebaseConfig.apiKey ? null : 'VITE_FIREBASE_API_KEY não configurada';
export const firebaseFunctionsRegion = env.VITE_FIREBASE_FUNCTIONS_REGION || "us-central1";
