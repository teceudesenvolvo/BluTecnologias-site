import { auth } from "../../../services/firebase";

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Não foi possível processar a solicitação.");
  return data as T;
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
  publicPlans: () => request<{ plans: BillingPlanView[] }>("/api/billing/plans"),
  summary: () => request<BillingSummary>("/api/billing/summary"),
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
