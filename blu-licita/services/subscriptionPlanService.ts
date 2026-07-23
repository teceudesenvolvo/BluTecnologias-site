import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase";

export type PlanKey = "essential" | "professional" | "performance" | "enterprise";

export type PlanLimits = {
  companies: number | null;
  activeContracts: number | null;
  users: number | null;
  storageGb: number | null;
  favoriteOpportunities: number | null;
  documents: number | null;
  historyEvents: number | null;
  digitalCertificates: number | null;
  bankAccounts: number | null;
  documentTemplates: number | null;
  api: "none" | "included" | "unlimited";
  webhooks: boolean;
  backup: "daily" | "continuous";
  support: "email" | "priority" | "premium" | "enterprise";
  advancedAudit: boolean;
};

export type SubscriptionPlan = {
  key: PlanKey;
  name: string;
  subtitle: string;
  limits: PlanLimits;
};

export type CompanySubscription = {
  plan: PlanKey;
  customLimits?: Partial<PlanLimits>;
  status: "active" | "trial" | "suspended" | "cancelled";
  updatedAt?: string;
  updatedBy?: string;
};

const unlimited = null;

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    key: "essential",
    name: "Plano Essencial",
    subtitle: "Ideal para empresas iniciando no mercado público.",
    limits: {
      companies: 1,
      activeContracts: 10,
      users: 1,
      storageGb: 1,
      favoriteOpportunities: 500,
      documents: 500,
      historyEvents: 5000,
      digitalCertificates: 1,
      bankAccounts: 1,
      documentTemplates: 3,
      api: "none",
      webhooks: false,
      backup: "daily",
      support: "email",
      advancedAudit: false,
    },
  },
  {
    key: "professional",
    name: "Plano Profissional",
    subtitle: "Ideal para empresas em crescimento.",
    limits: {
      companies: 3,
      activeContracts: 30,
      users: 5,
      storageGb: 5,
      favoriteOpportunities: 2000,
      documents: 5000,
      historyEvents: unlimited,
      digitalCertificates: 5,
      bankAccounts: 10,
      documentTemplates: unlimited,
      api: "included",
      webhooks: true,
      backup: "daily",
      support: "priority",
      advancedAudit: false,
    },
  },
  {
    key: "performance",
    name: "Plano Performance",
    subtitle: "Ideal para empresas com grande volume de contratos.",
    limits: {
      companies: 5,
      activeContracts: 90,
      users: 10,
      storageGb: 10,
      favoriteOpportunities: unlimited,
      documents: unlimited,
      historyEvents: unlimited,
      digitalCertificates: 20,
      bankAccounts: unlimited,
      documentTemplates: unlimited,
      api: "unlimited",
      webhooks: true,
      backup: "continuous",
      support: "premium",
      advancedAudit: true,
    },
  },
  {
    key: "enterprise",
    name: "Plano Enterprise",
    subtitle: "Sob consulta. Sem limitações.",
    limits: {
      companies: unlimited,
      activeContracts: unlimited,
      users: unlimited,
      storageGb: unlimited,
      favoriteOpportunities: unlimited,
      documents: unlimited,
      historyEvents: unlimited,
      digitalCertificates: unlimited,
      bankAccounts: unlimited,
      documentTemplates: unlimited,
      api: "unlimited",
      webhooks: true,
      backup: "continuous",
      support: "enterprise",
      advancedAudit: true,
    },
  },
];

const storageKey = (companyId: string) => `blu:subscription:${companyId}`;

export const subscriptionPlanService = {
  getDefinition(plan: PlanKey) {
    return subscriptionPlans.find((item) => item.key === plan) || subscriptionPlans[0];
  },
  effectiveLimits(subscription: CompanySubscription) {
    return { ...this.getDefinition(subscription.plan).limits, ...(subscription.customLimits || {}) } as PlanLimits;
  },
  async get(companyId: string): Promise<CompanySubscription> {
    const fallback = (): CompanySubscription => {
      try {
        return JSON.parse(localStorage.getItem(storageKey(companyId)) || "null") || { plan: "essential", status: "active" };
      } catch {
        return { plan: "essential", status: "active" };
      }
    };
    try {
      const snapshot = await getDoc(doc(db, "companies", companyId, "settings", "subscription"));
      if (snapshot.exists()) {
        const value = snapshot.data() as CompanySubscription;
        localStorage.setItem(storageKey(companyId), JSON.stringify(value));
        return value;
      }
    } catch {
      return fallback();
    }
    return fallback();
  },
  async save(companyId: string, userId: string, subscription: CompanySubscription) {
    const payload = { ...subscription, updatedAt: new Date().toISOString(), updatedBy: userId };
    localStorage.setItem(storageKey(companyId), JSON.stringify(payload));
    await setDoc(doc(db, "companies", companyId, "settings", "subscription"), payload, { merge: true }).catch(() => undefined);
  },
  isAllowed(current: number, limit: number | null) {
    return limit === null || current < limit;
  },
  usagePercent(current: number, limit: number | null) {
    if (limit === null) return 0;
    return Math.min(100, Math.round((current / Math.max(1, limit)) * 100));
  },
};
