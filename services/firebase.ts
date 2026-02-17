import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { BlogPost } from '../types';

// Configuração do Firebase - Substitua pelos dados do seu projeto no Console do Firebase
const firebaseConfig = {
   apiKey: "AIzaSyBwyV2KFRfT_Hsh10A8sXoJusuLIAUQ35Y",
  authDomain: "blutecnologias-site.firebaseapp.com",
  databaseURL: "https://blutecnologias-site-default-rtdb.firebaseio.com",
  projectId: "blutecnologias-site",
  storageBucket: "blutecnologias-site.firebasestorage.app",
  messagingSenderId: "22963166270",
  appId: "1:22963166270:web:0f3848fc534cc4f20cc56f",
  measurementId: "G-8Q9H1KYGG0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export { signInWithEmailAndPassword, signOut, onAuthStateChanged };

const DB_URL = 'https://blutecnologias-site-default-rtdb.firebaseio.com';

export const blogService = {
  async getAll(): Promise<BlogPost[]> {
    try {
      const response = await fetch(`${DB_URL}/posts.json`);
      const data = await response.json();
      
      if (!data) return [];

      // O Firebase retorna um objeto onde as chaves são os IDs. Convertemos para array.
      return Object.entries(data).map(([id, post]: [string, any]) => ({
        id,
        ...post
      })).reverse(); // Inverte para mostrar os mais recentes primeiro
    } catch (error) {
      console.error('Erro ao buscar posts:', error);
      return [];
    }
  },

  async getById(id: string): Promise<BlogPost | null> {
    try {
      const response = await fetch(`${DB_URL}/posts/${id}.json`);
      const data = await response.json();
      if (!data) return null;
      return { id, ...data };
    } catch (error) {
      console.error('Erro ao buscar post:', error);
      return null;
    }
  },

  async create(post: Omit<BlogPost, 'id'>): Promise<boolean> {
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      const url = token ? `${DB_URL}/posts.json?auth=${token}` : `${DB_URL}/posts.json`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(post),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao criar post:', error);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      const url = token ? `${DB_URL}/posts/${id}.json?auth=${token}` : `${DB_URL}/posts/${id}.json`;

      const response = await fetch(url, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao deletar post:', error);
      return false;
    }
  }
};