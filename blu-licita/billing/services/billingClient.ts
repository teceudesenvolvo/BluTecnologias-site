import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { auth, db } from "../../../services/firebase";

const TEST_PLAN: BillingPlanView = {
  id: "test-1-real",
  name: "Plano Teste Blu",
  slug: "test-1-real",
  description: "Plano de validação para testar a jornada de compra com cobrança simbólica de R$ 1,00.",
  priceInCents: 100,
  billingInterval: "month",
  trialDays: 7,
  limits: {
    companies: 1,
    activeContracts: 1,
    storageBytes: 1024 * 1024 * 1024,
    users: 1,
    aiCredits: 0,
    savedSearches: 0,
    activeAutomations: 0,
    customAlerts: 0,
    apiRequests: 0,
    certificates: 0,
    bankAccounts: 1,
  },
  displayOrder: 0,
};

// provider-agnostic billing client (Asaas / future gateways)
const apiBaseUrl = () => (import.meta.env.VITE_BLU_API_BASE_URL as string | undefined || "").replace(/\/$/, "");

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${apiBaseUrl()}${path}`, {
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

const byDateDesc = (a: any, b: any) => String(b.createdAt || b.paidAt || "").localeCompare(String(a.createdAt || a.paidAt || ""));

const firestorePublicPlans = async (): Promise<{ plans: BillingPlanView[] }> => {
  const snapshot = await getDocs(query(collection(db, "plans"), where("active", "==", true), where("public", "==", true)));
  const plans = snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() } as BillingPlanView))
    .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
  return { plans: plans.length ? plans : [TEST_PLAN] };
};

const firestoreSummary = async (): Promise<BillingSummary> => {
  const companyId = currentCompanyId();
  if (!companyId) throw new Error("Faça login para carregar a assinatura.");

  const subscriptionSnapshot = await getDocs(query(collection(db, "subscriptions"), where("customerCompanyId", "==", companyId), limit(1)));
  const subscription = subscriptionSnapshot.docs[0]
    ? { id: subscriptionSnapshot.docs[0].id, ...subscriptionSnapshot.docs[0].data() }
    : null;

  const plan = subscription?.planId
    ? await getDoc(doc(db, "plans", String(subscription.planId))).then((snapshot) => snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as BillingPlanView) : null)
    : null;

  const usage = subscription?.id
    ? await getDoc(doc(db, "subscriptionUsage", String(subscription.id))).then((snapshot) => snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() }) : null).catch(() => null)
    : null;

  const [ordersSnapshot, paymentsSnapshot] = await Promise.all([
    getDocs(query(collection(db, "billingOrders"), where("companyId", "==", companyId), limit(50))),
    getDocs(query(collection(db, "payments"), where("companyId", "==", companyId), limit(50))),
  ]);

  return {
    subscription,
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

export type BillingPlanView = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  priceInCents: number;
  billingInterval: string;
  trialDays: number;
  limits: Record<string, number | null>;
  displayOrder?: number;
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
  summary: () => withFirestoreFallback(request<BillingSummary>("/api/billing/summary"), firestoreSummary),
  createCheckout: (planId: string, billingOrderType = "UPGRADE") => request<{ checkoutUrl: string; orderNsu: string; orderId: string; amountInCents: number; planName: string }>("/api/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ planId, billingOrderType }),
  }),
  checkPayment: (input: { order_nsu: string; transaction_nsu: string; slug: string }) => request<{ status: string; orderId: string; subscriptionId: string }>("/api/billing/payment-check", {
    method: "POST",
    body: JSON.stringify(input),
  }),
};

export const formatCents = (value?: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((value || 0) / 100);
