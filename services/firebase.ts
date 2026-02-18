import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getDatabase } from 'firebase/database';
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
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const rtdb = getDatabase(app);

const DB_URL = 'https://blutecnologias-site-default-rtdb.firebaseio.com';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  userId?: string;
}

export interface ClientContract {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  value: number;
  fileUrl?: string;
}

export interface ClientAdjustment {
  id: string;
  date: string;
  percentage: number;
  newValue: number;
  observation?: string;
}

export interface ClientInvoice {
  id: string;
  month: string;
  amount: number;
  status: 'sent' | 'paid' | 'pending';
  fileUrl?: string;
}

export interface ClientProposal {
  id: string;
  date: string;
  title: string;
  value: number;
  status: 'sent' | 'accepted' | 'rejected';
  fileUrl?: string;
}

export interface ClientReport {
  id: string;
  month: string;
  title: string;
  fileUrl?: string;
}

export interface ContactLead {
  id: string;
  name: string;
  razaoSocial?: string;
  cnpj?: string;
  inscricaoMunicipal?: string;
  role: string;
  email: string;
  phone: string;
  city: string;
  state?: string;
  address?: string;
  cep?: string;
  complement?: string;
  financialContact?: string;
  solution: string;
  message: string;
  date: string;
  status: 'lead' | 'active';
  contracts?: ClientContract[];
  adjustments?: ClientAdjustment[];
  cobrancas?: any[];
  invoices?: ClientInvoice[];
  proposals?: ClientProposal[];
  reports?: ClientReport[];
  userId?: string;
}

export interface ProspectFile {
  name: string;
  base64: string;
}
export interface Prospect {
  id: string;
  tipoOrgao: 'camara' | 'prefeitura' | 'secretaria';
  municipio: string;
  estado: string;
  sessaoOrdinaria: string;
  endereco: string;
  presidente: string;
  files: ProspectFile[];
  userId?: string;
  visited?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  team: string;
  assignee?: string;
  userId?: string;
}

export interface Certificate {
  id: string;
  name: string;
  issueDate: string;
  expiryDate: string;
  fileUrl?: string;
  userId?: string;
}

export interface FinancialSettings {
  bankAccounts?: {
    id: string;
    bankCode?: string;
    bankName: string;
    agency: string;
    accountNumber: string;
  }[];
  pixKeys?: {
    id: string;
    type: 'cnpj' | 'email' | 'phone' | 'random';
    key: string;
  }[];
  billingAddresses?: {
    id: string;
    cep: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  }[];
  updatedBy?: string;
  updatedAt?: string;
}

export interface Quote {
  id: string;
  requestingEntity: string;
  description: string;
  requestDate: string; // Data do pedido
  creationDate: string; // Data da solicitação (no sistema)
  status: 'aberto' | 'em_andamento' | 'concluido' | 'cancelado';
  items: { description: string; quantity: number; unit: string }[];
  userId?: string;
}

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

  async uploadImage(file: File): Promise<string | null> {
    try {
      const storageRef = ref(storage, `blog/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      return url;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      return null;
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
      if (!user) return false;
      const token = user ? await user.getIdToken() : null;
      const url = token ? `${DB_URL}/posts.json?auth=${token}` : `${DB_URL}/posts.json`;
      const postWithUser = { ...post, userId: user.uid };
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postWithUser),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao criar post:', error);
      return false;
    }
  },

  async update(id: string, post: Partial<BlogPost>): Promise<boolean> {
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      const url = token ? `${DB_URL}/posts/${id}.json?auth=${token}` : `${DB_URL}/posts/${id}.json`;

      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao atualizar post:', error);
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

export const quoteService = {
  async getAll(): Promise<Quote[]> {
    try {
      const response = await fetch(`${DB_URL}/quotes.json`);
      const data = await response.json();
      if (!data) return [];
      return Object.entries(data).map(([id, quote]: [string, any]) => ({
        id,
        ...quote,
      })).reverse();
    } catch (error) {
      console.error('Erro ao buscar pedidos de cotação:', error);
      return [];
    }
  },

  async create(quote: Omit<Quote, 'id' | 'creationDate'>): Promise<boolean> {
    try {
      const user = auth.currentUser;
      const quoteData = {
        ...quote,
        creationDate: new Date().toISOString(),
        userId: user?.uid,
      };
      const response = await fetch(`${DB_URL}/quotes.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao criar pedido de cotação:', error);
      return false;
    }
  },

  async update(id: string, quote: Partial<Quote>): Promise<boolean> {
    try {
      const response = await fetch(`${DB_URL}/quotes/${id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quote),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao atualizar pedido de cotação:', error);
      return false;
    }
  },
};

export const prospectService = {
  async getAll(): Promise<Prospect[]> {
    try {
      const response = await fetch(`${DB_URL}/prospects.json`);
      const data = await response.json();
      if (!data) return [];
      return Object.entries(data).map(([id, prospect]: [string, any]) => ({
        id,
        ...prospect,
      })).reverse();
    } catch (error) {
      console.error('Erro ao buscar prospects:', error);
      return [];
    }
  },

  async create(prospect: Omit<Prospect, 'id'>): Promise<boolean> {
    try {
      const user = auth.currentUser;
      const response = await fetch(`${DB_URL}/prospects.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prospect, userId: user?.uid }),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao criar prospect:', error);
      return false;
    }
  },

  async update(id: string, prospect: Partial<Prospect>): Promise<boolean> {
    try {
      const response = await fetch(`${DB_URL}/prospects/${id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prospect),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao atualizar prospect:', error);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${DB_URL}/prospects/${id}.json`, { method: 'DELETE' });
      return response.ok;
    } catch (error) {
      console.error('Erro ao deletar prospect:', error);
      return false;
    }
  },
};

export const certificateService = {
  async getAll(): Promise<Certificate[]> {
    try {
      const response = await fetch(`${DB_URL}/certificates.json`);
      const data = await response.json();
      
      if (!data) return [];

      return Object.entries(data).map(([id, cert]: [string, any]) => ({
        id,
        ...cert
      })).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    } catch (error) {
      console.error('Erro ao buscar certificados:', error);
      return [];
    }
  },

  async create(cert: Omit<Certificate, 'id'>): Promise<boolean> {
    try {
      const user = auth.currentUser;
      const response = await fetch(`${DB_URL}/certificates.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cert, userId: user?.uid }),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao criar certificado:', error);
      return false;
    }
  },

  async update(id: string, cert: Partial<Certificate>): Promise<boolean> {
    try {
      const response = await fetch(`${DB_URL}/certificates/${id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cert),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao atualizar certificado:', error);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${DB_URL}/certificates/${id}.json`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao deletar certificado:', error);
      return false;
    }
  }
};

export const taskService = {
  async getAll(): Promise<Task[]> {
    try {
      const response = await fetch(`${DB_URL}/tasks.json`);
      const data = await response.json();
      
      if (!data) return [];

      return Object.entries(data).map(([id, task]: [string, any]) => ({
        id,
        ...task
      }));
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
      return [];
    }
  },

  async create(task: Omit<Task, 'id'>): Promise<boolean> {
    try {
      const user = auth.currentUser;
      const response = await fetch(`${DB_URL}/tasks.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, userId: user?.uid }),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      return false;
    }
  },

  async update(id: string, task: Partial<Task>): Promise<boolean> {
    try {
      const response = await fetch(`${DB_URL}/tasks/${id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${DB_URL}/tasks/${id}.json`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
      return false;
    }
  }
};

export const contactService = {
  async create(lead: Omit<ContactLead, 'id' | 'date' | 'status'>): Promise<boolean> {
    try {
      const user = auth.currentUser;
      const leadData = {
        ...lead,
        date: new Date().toISOString(),
        status: 'lead',
        userId: user?.uid,
      };
      
      const response = await fetch(`${DB_URL}/contacts.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao salvar contato:', error);
      return false;
    }
  },

  async getAll(): Promise<ContactLead[]> {
    try {
      const response = await fetch(`${DB_URL}/contacts.json`);
      const data = await response.json();
      
      if (!data) return [];

      return Object.entries(data).map(([id, contact]: [string, any]) => ({
        id,
        ...contact
      })).reverse();
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
      return [];
    }
  }
};

export const financialService = {
  async getAll(): Promise<Transaction[]> {
    try {
      const response = await fetch(`${DB_URL}/transactions.json`);
      const data = await response.json();
      
      if (!data) return [];

      return Object.entries(data).map(([id, transaction]: [string, any]) => ({
        id,
        ...transaction
      })).reverse();
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      return [];
    }
  },

  async add(transaction: Omit<Transaction, 'id'>): Promise<boolean> {
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      const url = token ? `${DB_URL}/transactions.json?auth=${token}` : `${DB_URL}/transactions.json`;
      const transactionWithUser = { ...transaction, userId: user?.uid };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionWithUser),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao adicionar transação:', error);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      const url = token ? `${DB_URL}/transactions/${id}.json?auth=${token}` : `${DB_URL}/transactions/${id}.json`;

      const response = await fetch(url, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao deletar transação:', error);
      return false;
    }
  }
};

export const clientService = {
  async create(client: Omit<ContactLead, 'id' | 'date' | 'status'>): Promise<boolean> {
    try {
      const user = auth.currentUser;
      const clientData = {
        ...client,
        date: new Date().toISOString(),
        status: 'active',
        userId: user?.uid,
      };
      
      const response = await fetch(`${DB_URL}/contacts.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      return false;
    }
  },

  async updateStatus(id: string, status: 'active' | 'lead'): Promise<boolean> {
    try {
      const response = await fetch(`${DB_URL}/contacts/${id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao atualizar status do cliente:', error);
      return false;
    }
  },

  async update(id: string, data: Partial<ContactLead>): Promise<boolean> {
    try {
      const response = await fetch(`${DB_URL}/contacts/${id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao atualizar dados do cliente:', error);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${DB_URL}/contacts/${id}.json`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      return false;
    }
  },

  async sendBilling(clientId: string, billingData: any): Promise<boolean> {
    try {
      // Prefer HTTP CORS-enabled endpoint to avoid browser preflight 403 issues
      const url = `https://us-central1-blutecnologias-site.cloudfunctions.net/sendBillingEmailHttp`;
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ clientId, ...billingData })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('sendBilling HTTP error', response.status, err);
        // Surface server message to caller
        throw new Error(err?.message || `HTTP ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Erro ao enviar cobrança via Cloud Functions:', error);
      return false;
    }
  }
};