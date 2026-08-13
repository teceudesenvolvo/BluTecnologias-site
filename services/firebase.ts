import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref, uploadString, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { BlogPost } from '../types';

// Configuração do Firebase - Substitua pelos dados do seu projeto no Console do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBwyV2KFRfT_Hsh10A8sXoJusuLIAUQ35Y",
  authDomain: "blutecnologias-site.firebaseapp.com",
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
export const db = getFirestore(app);

const currentOwner = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');
  let companyId = `company-${user.uid}`;
  try {
    companyId = JSON.parse(localStorage.getItem('blu-licita:user') || 'null')?.companyId || companyId;
  } catch {}
  return { userId: user.uid, companyId };
};

const withoutUndefined = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const normalizeDigits = (value: unknown) => String(value || '').replace(/\D/g, '');
const normalizeText = (value: unknown) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

export type DuplicateScope = 'global' | 'company';

export type DuplicateMatch = {
  field: string;
  collection: string;
  id: string;
  value: string;
  label: string;
};

export class DuplicateValidationError extends Error {
  matches: DuplicateMatch[];

  constructor(matches: DuplicateMatch[]) {
    const labels = matches.map((match) => match.label).filter(Boolean).slice(0, 3);
    const suffix = labels.length ? `: ${labels.join(', ')}${matches.length > 3 ? '...' : ''}` : '.';
    super(`Registro já cadastrado${suffix}`);
    this.name = 'DuplicateValidationError';
    this.matches = matches;
  }
}

type DuplicateRule = {
  fields: string[];
  label: string;
  collections: string[];
  scope: DuplicateScope;
};

const duplicateRules: Record<string, DuplicateRule> = {
  companies: {
    fields: ['cnpj', 'document', 'email', 'telefoneCelular', 'telefoneFixo', 'razaoSocial', 'nomeFantasia'],
    label: 'empresa',
    collections: ['companies', 'platformCustomers', 'clients', 'partners', 'partnerApplications'],
    scope: 'global',
  },
  legalEntities: {
    fields: ['cnpj', 'document', 'email', 'telefoneCelular', 'telefoneFixo', 'razaoSocial', 'nomeFantasia'],
    label: 'empresa',
    collections: ['companies', 'platformCustomers', 'clients', 'partners', 'partnerApplications'],
    scope: 'company',
  },
  clients: {
    fields: ['cnpj', 'document', 'email', 'phone', 'razaoSocial', 'name'],
    label: 'cliente',
    collections: ['clients', 'prospects', 'companies', 'platformCustomers', 'partners', 'partnerApplications'],
    scope: 'company',
  },
  prospects: {
    fields: ['cnpj', 'document', 'email', 'phone', 'razaoSocial', 'name'],
    label: 'prospect',
    collections: ['clients', 'prospects', 'companies', 'platformCustomers', 'partners', 'partnerApplications'],
    scope: 'company',
  },
  teamMembers: {
    fields: ['email', 'phone'],
    label: 'membro da equipe',
    collections: ['teamMembers', 'companyUsers'],
    scope: 'company',
  },
  companyUsers: {
    fields: ['email', 'phone'],
    label: 'usuário',
    collections: ['teamMembers', 'companyUsers'],
    scope: 'company',
  },
  partners: {
    fields: ['document', 'cnpj', 'cpf', 'email', 'phone', 'companyName', 'legalName', 'tradeName'],
    label: 'parceiro',
    collections: ['partners', 'partnerApplications'],
    scope: 'global',
  },
  partnerApplications: {
    fields: ['document', 'cnpj', 'cpf', 'email', 'phone', 'companyName', 'legalName', 'tradeName'],
    label: 'cadastro de parceiro',
    collections: ['partners', 'partnerApplications'],
    scope: 'global',
  },
  platformCustomers: {
    fields: ['document', 'cnpj', 'email', 'phone', 'companyName', 'legalName', 'tradeName'],
    label: 'cliente da plataforma',
    collections: ['platformCustomers', 'companies', 'partners', 'partnerApplications'],
    scope: 'global',
  },
};

const duplicateValueMatchers: Array<{ field: string; normalize: (value: unknown) => string }> = [
  { field: 'cnpj', normalize: normalizeDigits },
  { field: 'document', normalize: normalizeDigits },
  { field: 'cpf', normalize: normalizeDigits },
  { field: 'email', normalize: normalizeText },
  { field: 'phone', normalize: normalizeDigits },
  { field: 'telefoneFixo', normalize: normalizeDigits },
  { field: 'telefoneCelular', normalize: normalizeDigits },
  { field: 'razaoSocial', normalize: normalizeText },
  { field: 'nomeFantasia', normalize: normalizeText },
  { field: 'companyName', normalize: normalizeText },
  { field: 'legalName', normalize: normalizeText },
  { field: 'tradeName', normalize: normalizeText },
  { field: 'name', normalize: normalizeText },
];

const duplicateLabels: Record<string, string> = {
  cnpj: 'CNPJ',
  document: 'Documento',
  cpf: 'CPF',
  email: 'E-mail',
  phone: 'Telefone',
  telefoneFixo: 'Telefone',
  telefoneCelular: 'Telefone',
  razaoSocial: 'Razão social',
  nomeFantasia: 'Nome fantasia',
  companyName: 'Empresa',
  legalName: 'Razão social',
  tradeName: 'Nome fantasia',
  name: 'Nome',
};

const companyLikeCollections = new Set(['companies', 'platformCustomers', 'clients', 'prospects', 'partners', 'partnerApplications']);
const personCollections = new Set(['teamMembers', 'companyUsers']);

const duplicateQueryScope = async (collectionName: string, scope: DuplicateScope, companyId?: string) => {
  if (scope === 'company' && companyId && !['partnerApplications', 'partners', 'platformCustomers'].includes(collectionName)) {
    return getDocs(query(collection(db, collectionName), where('companyId', '==', companyId)));
  }
  return getDocs(collection(db, collectionName));
};

export const assertNoDuplicateRecord = async (collectionName: string, value: Record<string, unknown>, options: { excludeId?: string; companyId?: string; scope?: DuplicateScope } = {}) => {
  const rule = duplicateRules[collectionName];
  if (!rule) return [];

  const scope = options.scope || rule.scope;
  const hits: DuplicateMatch[] = [];
  const candidateCollections = rule.collections;
  const normalizedInput = duplicateValueMatchers.reduce((acc, matcher) => {
    const raw = value[matcher.field];
    if (raw === undefined || raw === null || String(raw).trim() === '') return acc;
    acc[matcher.field] = matcher.normalize(raw);
    return acc;
  }, {} as Record<string, string>);

  if (!Object.keys(normalizedInput).length) return [];

  for (const candidateCollection of candidateCollections) {
    try {
      const snapshot = await duplicateQueryScope(candidateCollection, scope, options.companyId);
      for (const item of snapshot.docs) {
        if (options.excludeId && item.id === options.excludeId) continue;
        const data = item.data() as Record<string, unknown>;
        if (scope === 'company' && options.companyId && !personCollections.has(candidateCollection) && !companyLikeCollections.has(candidateCollection)) {
          const itemCompanyId = String(data.companyId || '');
          if (itemCompanyId && itemCompanyId !== options.companyId) continue;
        }
        for (const [field, normalized] of Object.entries(normalizedInput)) {
          const matcher = duplicateValueMatchers.find((entry) => entry.field === field);
          if (!matcher) continue;
          const possibleValues = duplicateValueMatchers
            .filter((entry) => entry.field === field || (field === 'document' && ['cnpj', 'cpf'].includes(entry.field)) || (field === 'cnpj' && entry.field === 'document') || (field === 'cpf' && entry.field === 'document'))
            .map((entry) => entry.normalize(data[entry.field]));
          const found = possibleValues.find((candidate) => candidate && candidate === normalized);
          if (found) {
            hits.push({
              field,
              collection: candidateCollection,
              id: item.id,
              value: String(data[matcher.field] || data[field] || ''),
              label: `${duplicateLabels[field] || field} já cadastrado em ${candidateCollection}`,
            });
          }
        }
      }
    } catch (error) {
      console.warn(`Duplicate validation skipped for ${candidateCollection}`, error);
    }
  }

  const unique = new Map<string, DuplicateMatch>();
  for (const hit of hits) {
    const key = `${hit.collection}:${hit.field}:${hit.value}`;
    if (!unique.has(key)) unique.set(key, hit);
  }
  return [...unique.values()];
};

export const ensureNoDuplicateRecord = async (collectionName: string, value: Record<string, unknown>, options: { excludeId?: string; companyId?: string; scope?: DuplicateScope } = {}) => {
  const matches = await assertNoDuplicateRecord(collectionName, value, options);
  if (matches.length) throw new DuplicateValidationError(matches);
  return matches;
};

const companyCollection = async <T>(name: string): Promise<T[]> => {
  const { companyId } = currentOwner();
  const snapshot = await getDocs(query(collection(db, name), where('companyId', '==', companyId)));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as T));
};

const createCompanyDocument = async (name: string, value: Record<string, unknown>) => {
  const owner = currentOwner();
  await ensureNoDuplicateRecord(name, value, { companyId: owner.companyId });
  await addDoc(collection(db, name), withoutUndefined({
    ...value,
    ...owner,
    createdBy: value.createdBy || owner.userId,
    createdAt: value.createdAt || new Date().toISOString(),
  }));
};

const updateCompanyDocument = async (name: string, id: string, value: Record<string, unknown>) => {
  const owner = currentOwner();
  await ensureNoDuplicateRecord(name, value, { companyId: owner.companyId, excludeId: id });
  await updateDoc(doc(db, name, id), withoutUndefined({
    ...value,
    updatedBy: value.updatedBy || owner.userId,
    updatedAt: value.updatedAt || new Date().toISOString(),
  }));
};

const deleteCompanyDocument = async (name: string, id: string) => deleteDoc(doc(db, name, id));

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  userId?: string;
}

export interface Company {
  id: string;
  cnpj: string;
  razaoSocial: string;
  logoUrl?: string;
  nomeFantasia?: string;
  porte?: string;
  naturezaJuridica?: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  email?: string;
  telefoneFixo?: string;
  telefoneCelular?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  socios?: any[];
  representantes?: any[];
  atividades?: any[];
  demonstrativos?: any[];
  updatedBy?: string;
  updatedAt?: string;
}

export interface ClientContract {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  value: number;
  fileUrl?: string;
  source?: 'pncp' | 'manual';
  sourceId?: string;
  sourceUrl?: string;
  processNumber?: string;
  procurementNumber?: string;
  supplierCnpj?: string;
  importedAt?: string;
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
  organizationCnpj?: string;
  source?: 'pncp' | 'manual';
}

export interface ProspectFile {
  name: string;
  base64: string;
}
export interface Prospect {
  id: string;
  tipoOrgao: 'camara' | 'prefeitura' | 'secretaria' | 'empresa';
  municipio: string;
  estado: string;
  sessaoOrdinaria: string;
  endereco: string;
  presidente: string;
  razaoSocial?: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  cep?: string;
  contato?: string;
  files: ProspectFile[];
  userId?: string;
  visited?: boolean;
  notes?: string;
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
  type?: string;
  company?: string;
  companyName?: string;
  legalEntityId?: string;
  createdAt?: string;
  updatedAt?: string;
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

export interface PrivacyPolicy {
  id: string;
  appName: string;
  iconUrl?: string;
  companyName: string;
  email: string;
  content: string;
  lastUpdated: string;
  permissions: {
    location: boolean;
    camera: boolean;
    storage: boolean;
    contacts: boolean;
    cookies: boolean;
  };
  userId?: string;
}

export const storageService = {
  async uploadBase64(base64: string, path: string, contentType: string = 'application/pdf'): Promise<string | null> {
    try {
      const storageRef = ref(storage, path);
      
      // Detecta se é uma Data URL (com prefixo) ou Base64 puro
      const format = base64.startsWith('data:') ? 'data_url' : 'base64';
      const snapshot = await uploadString(storageRef, base64, format, { contentType });
      
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error('Error uploading base64 to storage:', error);
      return null;
    }
  }
};

export const blogService = {
  async getAll(): Promise<BlogPost[]> {
    try {
      const snapshot = await getDocs(collection(db, 'blogPosts'));
      return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as BlogPost)).reverse();
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
      const snapshot = await getDoc(doc(db, 'blogPosts', id));
      return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as BlogPost) : null;
    } catch (error) {
      console.error('Erro ao buscar post:', error);
      return null;
    }
  },

  async create(post: Omit<BlogPost, 'id'>): Promise<boolean> {
    try {
      await createCompanyDocument('blogPosts', post as Record<string, unknown>);
      return true;
    } catch (error) {
      console.error('Erro ao criar post:', error);
      return false;
    }
  },

  async update(id: string, post: Partial<BlogPost>): Promise<boolean> {
    try {
      await updateCompanyDocument('blogPosts', id, post as Record<string, unknown>);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar post:', error);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await deleteCompanyDocument('blogPosts', id);
      return true;
    } catch (error) {
      console.error('Erro ao deletar post:', error);
      return false;
    }
  }
};

export const quoteService = {
  async getAll(): Promise<Quote[]> {
    try {
      return (await companyCollection<Quote>('quotes')).reverse();
    } catch (error) {
      console.error('Erro ao buscar pedidos de cotação:', error);
      return [];
    }
  },

  async create(quote: Omit<Quote, 'id' | 'creationDate'>): Promise<boolean> {
    try {
      const quoteData = {
        ...quote,
        creationDate: new Date().toISOString(),
      };
      await createCompanyDocument('quotes', quoteData);
      return true;
    } catch (error) {
      console.error('Erro ao criar pedido de cotação:', error);
      return false;
    }
  },

  async update(id: string, quote: Partial<Quote>): Promise<boolean> {
    try {
      await updateCompanyDocument('quotes', id, quote as Record<string, unknown>);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar pedido de cotação:', error);
      return false;
    }
  },
};

export const prospectService = {
  async getAll(): Promise<Prospect[]> {
    try {
      return (await companyCollection<Prospect>('prospects')).reverse();
    } catch (error) {
      console.error('Erro ao buscar prospects:', error);
      return [];
    }
  },

  async create(prospect: Omit<Prospect, 'id'>): Promise<boolean> {
    try {
      await createCompanyDocument('prospects', prospect as Record<string, unknown>);
      return true;
    } catch (error) {
      if (error instanceof DuplicateValidationError) throw error;
      console.error('Erro ao criar prospect:', error);
      return false;
    }
  },

  async update(id: string, prospect: Partial<Prospect>): Promise<boolean> {
    try {
      await updateCompanyDocument('prospects', id, prospect as Record<string, unknown>);
      return true;
    } catch (error) {
      if (error instanceof DuplicateValidationError) throw error;
      console.error('Erro ao atualizar prospect:', error);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await deleteCompanyDocument('prospects', id);
      return true;
    } catch (error) {
      console.error('Erro ao deletar prospect:', error);
      return false;
    }
  },
};

export const certificateService = {
  async getAll(): Promise<Certificate[]> {
    try {
      return (await companyCollection<Certificate>('companyDocuments'))
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    } catch (error) {
      console.error('Erro ao buscar certificados:', error);
      return [];
    }
  },

  async create(cert: Omit<Certificate, 'id'>): Promise<boolean> {
    try {
      await createCompanyDocument('companyDocuments', cert as Record<string, unknown>);
      return true;
    } catch (error) {
      console.error('Erro ao criar certificado:', error);
      return false;
    }
  },

  async update(id: string, cert: Partial<Certificate>): Promise<boolean> {
    try {
      await updateCompanyDocument('companyDocuments', id, cert as Record<string, unknown>);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar certificado:', error);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await deleteCompanyDocument('companyDocuments', id);
      return true;
    } catch (error) {
      console.error('Erro ao deletar certificado:', error);
      return false;
    }
  }
};

export const taskService = {
  async getAll(): Promise<Task[]> {
    try {
      return companyCollection<Task>('tasks');
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
      return [];
    }
  },

  async create(task: Omit<Task, 'id'>): Promise<boolean> {
    try {
      await createCompanyDocument('tasks', task as Record<string, unknown>);
      return true;
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      return false;
    }
  },

  async update(id: string, task: Partial<Task>): Promise<boolean> {
    try {
      await updateCompanyDocument('tasks', id, task as Record<string, unknown>);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await deleteCompanyDocument('tasks', id);
      return true;
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
      return false;
    }
  }
};

export const contactService = {
  async create(lead: Omit<ContactLead, 'id' | 'date' | 'status'>): Promise<boolean> {
    try {
      const leadData = {
        ...lead,
        date: new Date().toISOString(),
        status: 'lead',
      };
      await createCompanyDocument('clients', leadData);
      return true;
    } catch (error) {
      if (error instanceof DuplicateValidationError) throw error;
      console.error('Erro ao salvar contato:', error);
      return false;
    }
  },

  async getAll(): Promise<ContactLead[]> {
    try {
      return (await companyCollection<ContactLead>('clients')).reverse();
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
      return [];
    }
  }
};

export const financialService = {
  async getAll(): Promise<Transaction[]> {
    try {
      return (await companyCollection<Transaction>('financialTransactions')).reverse();
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      return [];
    }
  },

  async add(transaction: Omit<Transaction, 'id'>): Promise<boolean> {
    try {
      await createCompanyDocument('financialTransactions', transaction as Record<string, unknown>);
      return true;
    } catch (error) {
      console.error('Erro ao adicionar transação:', error);
      return false;
    }
  },

  async update(id: string, transaction: Partial<Transaction>): Promise<boolean> {
    try {
      await updateCompanyDocument('financialTransactions', id, transaction as Record<string, unknown>);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await deleteCompanyDocument('financialTransactions', id);
      return true;
    } catch (error) {
      console.error('Erro ao deletar transação:', error);
      return false;
    }
  }
};

export const privacyPolicyService = {
  async getAll(): Promise<PrivacyPolicy[]> {
    try {
      return (await companyCollection<PrivacyPolicy>('privacyPolicies')).reverse();
    } catch (error) {
      console.error('Erro ao buscar políticas:', error);
      return [];
    }
  },

  async getById(id: string): Promise<PrivacyPolicy | null> {
    try {
      const snapshot = await getDoc(doc(db, 'privacyPolicies', id));
      return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as PrivacyPolicy) : null;
    } catch (error) {
      console.error('Erro ao buscar política:', error);
      return null;
    }
  },

  async save(policy: Omit<PrivacyPolicy, 'id'>, id?: string): Promise<boolean> {
    try {
      if (id) await updateCompanyDocument('privacyPolicies', id, policy as Record<string, unknown>);
      else await createCompanyDocument('privacyPolicies', policy as Record<string, unknown>);
      return true;
    } catch (error) {
      console.error('Erro ao salvar política:', error);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await deleteCompanyDocument('privacyPolicies', id);
      return true;
    } catch (error) {
      console.error('Erro ao deletar política:', error);
      return false;
    }
  }
};

export const clientService = {
  async create(client: Omit<ContactLead, 'id' | 'date' | 'status'>): Promise<boolean> {
    try {
      const clientData = {
        ...client,
        date: new Date().toISOString(),
        status: 'active',
      };
      await createCompanyDocument('clients', clientData);
      return true;
    } catch (error) {
      if (error instanceof DuplicateValidationError) throw error;
      console.error('Erro ao criar cliente:', error);
      return false;
    }
  },

  async updateStatus(id: string, status: 'active' | 'lead'): Promise<boolean> {
    try {
      await updateCompanyDocument('clients', id, { status });
      return true;
    } catch (error) {
      if (error instanceof DuplicateValidationError) throw error;
      console.error('Erro ao atualizar status do cliente:', error);
      return false;
    }
  },

  async update(id: string, data: Partial<ContactLead>): Promise<boolean> {
    try {
      await updateCompanyDocument('clients', id, data as Record<string, unknown>);
      return true;
    } catch (error) {
      if (error instanceof DuplicateValidationError) throw error;
      console.error('Erro ao atualizar dados do cliente:', error);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await deleteCompanyDocument('clients', id);
      return true;
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
