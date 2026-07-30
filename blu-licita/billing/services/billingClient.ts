import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { auth, db, onAuthStateChanged, type Company } from "../../../services/firebase";
import { companySettingsService } from "../../../services/firestoreSettingsService";
import { defaultPublicPlans } from "../../services/publicPlanCatalog";

// provider-agnostic billing client (Pagar.me / future gateways)
const apiBaseUrl = () => (import.meta.env.VITE_BLU_API_BASE_URL as string | undefined || `https://us-central1-blutecnologias-site.cloudfunctions.net`).replace(/\/$/, "");
const apiPath = (path: string) => {
  if (!path.startsWith("/api/billing/")) return path;
  const endpoint = path.replace("/api/billing/", "");
  const functionMap: Record<string, string> = {
    checkout: "/billingCheckout",
    summary: "/billingSummary",
    plans: "/billingPublicPlans",
    "gateway-public": "/billingGatewayPublic",
    "payment-check": "/billingPaymentCheck",
  };
  return functionMap[endpoint] || path;
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

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const currentUser = await waitForAuthUser();
  if (!currentUser) throw new Error("Faça login para carregar a assinatura.");
  const token = await currentUser.getIdToken();
  const response = await fetch(`${apiBaseUrl()}${apiPath(path)}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const contentType = response.headers.get("content-type") || "";
  if (response.ok && !contentType.includes("application/json")) {
    throw new Error("API de cobrança não disponível neste ambiente.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Não foi possível processar a solicitação.");
  return data as T;
};

const currentCompanyId = () => {
  try {
    const storedUser = JSON.parse(localStorage.getItem("blu-licita:user") || "null");
    if (storedUser?.companyId) return String(storedUser.companyId);
  } catch {
    // ignore corrupted local state
  }
  return auth.currentUser?.uid ? `company-${auth.currentUser.uid}` : "";
};

const currentBillingCompanyId = () => {
  try {
    const storedUser = JSON.parse(localStorage.getItem("blu-licita:user") || "null");
    if (storedUser?.billingCompanyId) return String(storedUser.billingCompanyId);
    if (storedUser?.primaryBillingCompanyId) return String(storedUser.primaryBillingCompanyId);
    if (storedUser?.companyId) return String(storedUser.companyId);
  } catch {
    // ignore corrupted local state
  }
  return currentCompanyId();
};

const byDateDesc = (a: any, b: any) => String(b.createdAt || b.paidAt || "").localeCompare(String(a.createdAt || a.paidAt || ""));
const normalizePaymentMethods = (methods: unknown) =>
  (Array.isArray(methods) ? methods : ["credit_card", "boleto", "debit_card"])
    .map((method) => String(method).toLowerCase())
    .filter((method): method is "credit_card" | "boleto" | "debit_card" => ["credit_card", "boleto", "debit_card"].includes(method as any));

const firestorePublicPlans = async (): Promise<{ plans: BillingPlanView[] }> => {
  const snapshot = await getDocs(query(collection(db, "plans"), where("active", "==", true), where("public", "==", true)));
  const plans = snapshot.docs
    .map((item) => {
      const data = item.data() as Record<string, unknown>;
      return {
        id: item.id,
        ...data,
        paymentMethods: normalizePaymentMethods(data.paymentMethods),
      } as BillingPlanView;
    })
    .filter((item) => item.slug !== "test-1-real" && item.slug !== "enterprise")
    .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
  return {
    plans: plans.length
      ? plans
      : (defaultPublicPlans().filter((item) => item.slug !== "test-1-real" && item.slug !== "enterprise") as BillingPlanView[]),
  };
};

const firestoreSummary = async (): Promise<BillingSummary> => {
  const companyId = currentCompanyId();
  if (!companyId) throw new Error("Faça login para carregar a assinatura.");

  const subscriptionSnapshot = await getDocs(query(collection(db, "subscriptions"), where("customerCompanyId", "==", companyId), limit(1)));
  const rawSubscription = subscriptionSnapshot.docs[0]
    ? { id: subscriptionSnapshot.docs[0].id, ...subscriptionSnapshot.docs[0].data() }
    : null;

  const companySnapshot = await getDoc(doc(db, "companies", companyId)).catch(() => null);
  const companyData = companySnapshot?.exists() ? companySnapshot.data() : null;
  const platformCustomerSnapshot = await getDoc(doc(db, "platformCustomers", companyId)).catch(() => null);
  const platformCustomerData = platformCustomerSnapshot?.exists() ? platformCustomerSnapshot.data() : null;

  const normalizedStatus = (value?: unknown) => String(value || "").toUpperCase();
  const subscription = rawSubscription
    ? { ...rawSubscription, status: normalizedStatus((rawSubscription as any).status) }
    : null;
  const fallbackPlanId = String(
    (subscription as any)?.planId ||
    (platformCustomerData as any)?.planId ||
    (companyData as any)?.subscription?.plan ||
    "",
  );

  const plan = fallbackPlanId
    ? await getDoc(doc(db, "plans", fallbackPlanId)).then((snapshot) => snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as BillingPlanView) : null)
    : null;

  const usage = subscription?.id
    ? await getDoc(doc(db, "subscriptionUsage", String(subscription.id))).then((snapshot) => snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() }) : null).catch(() => null)
    : null;

  const normalizedSubscription = subscription || (
    companyData || platformCustomerData
      ? {
          id: String((platformCustomerData as any)?.subscriptionId || (companyData as any)?.subscriptionId || `sub-${companyId}`),
          customerCompanyId: companyId,
          planId: fallbackPlanId || null,
          status: normalizedStatus((companyData as any)?.accessStatus || (platformCustomerData as any)?.accessStatus || (platformCustomerData as any)?.status),
          provider: (platformCustomerData as any)?.provider || "pagarme",
          trialStartedAt: (platformCustomerData as any)?.trialStartedAt || null,
          trialEndsAt: (platformCustomerData as any)?.trialEndsAt || null,
          currentPeriodStartedAt: (platformCustomerData as any)?.trialStartedAt || null,
          currentPeriodEndsAt: (platformCustomerData as any)?.trialEndsAt || null,
          nextBillingDate: (platformCustomerData as any)?.trialEndsAt || null,
          gracePeriodEndsAt: null,
          canceledAt: null,
          cancelAtPeriodEnd: false,
          suspendedAt: null,
          lastPaymentId: null,
          accessStatus: normalizedStatus((companyData as any)?.accessStatus || (platformCustomerData as any)?.accessStatus || (platformCustomerData as any)?.status),
        }
      : null
  );

  const [ordersSnapshot, paymentsSnapshot] = await Promise.all([
    getDocs(query(collection(db, "billingOrders"), where("companyId", "==", companyId), limit(50))),
    getDocs(query(collection(db, "payments"), where("companyId", "==", companyId), limit(50))),
  ]);

  return {
    subscription: normalizedSubscription,
    plan,
    usage,
    orders: ordersSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort(byDateDesc),
    payments: paymentsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort(byDateDesc),
    remaining: null,
    graceDays: 7,
    serverTime: new Date().toISOString(),
  };
};

const withFirestoreFallback = async <T,>(primary: Promise<T>, fallback: () => Promise<T>) => {
  try {
    return await primary;
  } catch (error) {
    return await fallback().catch(() => {
      throw error;
    });
  }
};

const requiredBillingFields = [
  { key: "cnpj", label: "CNPJ", test: (company: Record<string, unknown>) => hasValue(company.cnpj) || hasValue(company.document) },
  { key: "email", label: "E-mail da empresa", test: (company: Record<string, unknown>) => hasValue(company.email) || hasValue(company.companyEmail) },
  {
    key: "telefone",
    label: "Telefone da empresa",
    test: (company: Record<string, unknown>) =>
      hasValue(company.telefoneCelular) || hasValue(company.telefoneFixo) || hasValue(company.phone) || hasValue(company.companyPhone),
  },
  { key: "cep", label: "CEP", test: (company: Record<string, unknown>) => hasValue(company.cep) || hasValue(company.zipCode) },
  { key: "logradouro", label: "Logradouro", test: (company: Record<string, unknown>) => hasValue(company.logradouro) || hasValue(company.street) },
  { key: "numero", label: "Número", test: (company: Record<string, unknown>) => hasValue(company.numero) || hasValue(company.number) },
  { key: "bairro", label: "Bairro", test: (company: Record<string, unknown>) => hasValue(company.bairro) || hasValue(company.neighborhood) },
  { key: "municipio", label: "Município", test: (company: Record<string, unknown>) => hasValue(company.municipio) || hasValue(company.city) },
  { key: "uf", label: "UF", test: (company: Record<string, unknown>) => hasValue(company.uf) || hasValue(company.state) },
] as const;

const hasValue = (value: unknown) => String(value ?? "").trim().length > 0;

export type BillingCheckoutProfileStatus = {
  company: Company | null;
  missingFields: string[];
  isReady: boolean;
};

export const getBillingCheckoutProfileStatus = async (): Promise<BillingCheckoutProfileStatus> => {
  const companies = await companySettingsService.getAll().catch(() => []);
  const companyId = currentBillingCompanyId();
  const company = (companyId ? companies.find((item) => item.id === companyId) : null) || companies[0] || null;
  if (!company) {
    return { company: null, missingFields: ["Empresa"], isReady: false };
  }

  const companyRecord = company as Record<string, unknown>;
  const missingFields = requiredBillingFields
    .filter(({ test }) => !test(companyRecord))
    .map(({ label }) => label);

  return {
    company,
    missingFields,
    isReady: missingFields.length === 0,
  };
};

export type BillingPlanView = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  priceInCents: number;
  billingInterval: string;
  intervalCount?: number;
  trialDays: number;
  billingType?: 'prepaid' | 'postpaid' | 'exact_day';
  cycles?: number | null;
  startAt?: string | null;
  paymentMethods?: Array<'credit_card' | 'boleto' | 'debit_card'>;
  installments?: number[];
  limits: Record<string, number | null>;
  displayOrder?: number;
};

export type BillingCheckoutPaymentData = {
  orderId: string;
  orderNsu: string;
  paymentMethod: "credit_card" | "boleto" | "debit_card";
  status: string;
  transactionNsu?: string;
  receiptUrl?: string;
  boleto?: {
    url?: string;
    pdf?: string;
    line?: string;
    barcode?: string;
    dueAt?: string;
  };
  creditCard?: {
    tokenized: boolean;
    installments: number;
  };
  raw?: unknown;
};

export type BillingCheckoutResult = {
  orderId: string;
  orderNsu: string;
  amountInCents: number;
  planName: string;
  paymentMethod: "credit_card" | "boleto" | "debit_card";
  orderStatus?: string;
  requiresCardToken?: boolean;
  paymentData?: BillingCheckoutPaymentData;
  raw?: unknown;
};

export type BillingSummary = {
  subscription: any | null;
  plan: BillingPlanView | null;
  usage: any | null;
  orders: any[];
  payments: any[];
  remaining: Record<string, number | null> | null;
  graceDays: number;
  serverTime: string;
};

export const billingClient = {
  publicPlans: () => withFirestoreFallback(request<{ plans: BillingPlanView[] }>("/api/billing/plans"), firestorePublicPlans),
  publicGateway: () => request<{ providerId: string; publicKey: string; enabled: boolean; environment: string }>("/api/billing/gateway-public"),
  summary: async () => {
    const currentUser = await waitForAuthUser();
    if (!currentUser) return firestoreSummary();
    return withFirestoreFallback(request<BillingSummary>("/api/billing/summary"), firestoreSummary);
  },
  createCheckout: (
    planId: string,
    billingOrderType = "UPGRADE",
    paymentMethod: "credit_card" | "boleto" | "debit_card" = "credit_card",
    extra: { cardToken?: string; orderNsu?: string } = {},
  ) => request<BillingCheckoutResult>("/api/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ planId, billingOrderType, paymentMethod, ...extra }),
  }),
  checkPayment: (input: { order_nsu: string; transaction_nsu?: string; slug?: string }) => request<{ status: string; orderId: string; subscriptionId: string }>("/api/billing/payment-check", {
    method: "POST",
    body: JSON.stringify(input),
  }),
};

export const formatCents = (value?: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((value || 0) / 100);

export const normalizeBillingStatus = (value?: unknown) => String(value || "").toUpperCase();
