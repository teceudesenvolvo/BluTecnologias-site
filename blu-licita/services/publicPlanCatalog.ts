import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { auth, db, onAuthStateChanged } from '../../services/firebase';
import { subscriptionPlans } from './subscriptionPlanService';

export type PublicPlanDoc = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  priceInCents: number;
  billingInterval: 'month' | 'year';
  intervalCount?: number;
  trialDays: number;
  billingType?: 'prepaid' | 'postpaid' | 'exact_day';
  cycles?: number | null;
  startAt?: string | null;
  paymentMethods?: Array<'credit_card' | 'boleto' | 'debit_card'>;
  installments?: number[];
  limits: {
    companies: number | null;
    activeContracts: number | null;
    storageBytes: number | null;
    users: number | null;
    aiCredits: number | null;
    savedSearches: number | null;
    activeAutomations: number | null;
    customAlerts: number | null;
    apiRequests: number | null;
    certificates: number | null;
    bankAccounts: number | null;
  };
  active: boolean;
  public: boolean;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
};

const toBytes = (gb: number | null | undefined) => (gb === null || gb === undefined ? null : gb * 1024 * 1024 * 1024);
const normalizeMethods = (methods: unknown): PublicPlanDoc['paymentMethods'] =>
  (Array.isArray(methods) ? methods : ['credit_card', 'boleto', 'debit_card'])
    .map((method) => String(method).toLowerCase())
    .filter((method): method is NonNullable<PublicPlanDoc['paymentMethods']>[number] => ['credit_card', 'boleto', 'debit_card'].includes(method as any));

const toPublicPlanDoc = (item: (typeof subscriptionPlans)[number], index: number): PublicPlanDoc => {
  const order = index + 1;
  const monthlyPrice = (() => {
    switch (item.key) {
      case 'essential':
        return 19700;
      case 'professional':
        return 49700;
      case 'performance':
        return 99700;
      case 'test-1-real':
        return 100;
      default:
        return 0;
    }
  })();

  return {
    id: item.key,
    slug: item.key,
    name: item.name,
    description: item.subtitle,
    priceInCents: monthlyPrice,
    billingInterval: 'month',
    intervalCount: 1,
    trialDays: item.key === 'test-1-real' ? 0 : 7,
    billingType: 'prepaid',
    cycles: null,
    startAt: null,
    paymentMethods: normalizeMethods(['credit_card', 'boleto', 'debit_card']),
    installments: [1],
    limits: {
      companies: item.limits.companies,
      activeContracts: item.limits.activeContracts,
      storageBytes: toBytes(item.limits.storageGb),
      users: item.limits.users,
      aiCredits: 0,
      savedSearches: item.limits.favoriteOpportunities,
      activeAutomations: 0,
      customAlerts: 0,
      apiRequests: item.limits.api === 'none' ? 0 : item.limits.api === 'included' ? 5000 : null,
      certificates: item.limits.digitalCertificates,
      bankAccounts: item.limits.bankAccounts,
    },
    active: true,
    public: item.key !== 'enterprise',
    displayOrder: order,
  };
};

export const defaultPublicPlans = (): PublicPlanDoc[] => subscriptionPlans
  .filter((item) => item.key !== 'enterprise')
  .map((item, index) => toPublicPlanDoc(item, index));

export const loadAllPublicPlans = async (): Promise<PublicPlanDoc[]> => {
  const snapshot = await getDocs(query(collection(db, 'plans'), orderBy('displayOrder', 'asc')));
  const plans = snapshot.docs.map((item) => {
    const data = item.data() as Record<string, any>;
    return {
      id: item.id,
      ...data,
      paymentMethods: normalizeMethods(data.paymentMethods),
    } as PublicPlanDoc;
  });
  return plans.length ? plans : defaultPublicPlans();
};

export const loadVisiblePublicPlans = async (): Promise<PublicPlanDoc[]> => {
  const snapshot = await getDocs(query(collection(db, 'plans'), orderBy('displayOrder', 'asc')));
  const plans = snapshot.docs
    .map((item) => {
      const data = item.data() as Record<string, any>;
      return {
        id: item.id,
        ...data,
        paymentMethods: normalizeMethods(data.paymentMethods),
      } as PublicPlanDoc;
    })
    .filter((item) => item.active !== false && item.public !== false);
  return plans.length ? plans : defaultPublicPlans();
};

const waitForAuthUser = async (timeoutMs = 4000) => new Promise<typeof auth.currentUser | null>((resolve) => {
  if (auth.currentUser) {
    resolve(auth.currentUser);
    return;
  }
  const timer = window.setTimeout(() => {
    unsubscribe();
    resolve(auth.currentUser || null);
  }, timeoutMs);
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    window.clearTimeout(timer);
    unsubscribe();
    resolve(user);
  });
});

const apiBaseUrl = () =>
  (import.meta.env.VITE_BLU_API_BASE_URL as string | undefined || 'https://us-central1-blutecnologias-site.cloudfunctions.net').replace(/\/$/, '');

const apiPath = (path: string) => {
  if (path === '/api/billing/admin/plans') return '/billingAdminPlans';
  return path;
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const currentUser = await waitForAuthUser();
  if (!currentUser) throw new Error('Faça login para continuar.');
  const token = await currentUser.getIdToken();
  const response = await fetch(`${apiBaseUrl()}${apiPath(path)}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || 'Não foi possível processar a solicitação.');
  return data as T;
};

export const savePublicPlan = async (plan: PublicPlanDoc) => {
  const payload = {
    action: 'save',
    plan: {
      ...plan,
      id: plan.id,
      slug: plan.slug || plan.id,
      updatedAt: new Date().toISOString(),
      createdAt: plan.createdAt || new Date().toISOString(),
    },
  };
  await request('/api/billing/admin/plans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const seedDefaultPublicPlans = async () => {
  const result = await request<{ seeded: boolean }>('/api/billing/admin/plans', {
    method: 'POST',
    body: JSON.stringify({ action: 'seed' }),
  });
  if (result.seeded) return true;
  return false;
};
