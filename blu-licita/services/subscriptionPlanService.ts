import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase";

export type PlanKey = "essential" | "professional" | "performance" | "enterprise" | "test-1-real";

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
  modules: string[];
  featuresByBusinessType: { comercio: string[]; servicos: string[] };
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
    subtitle: "Para estruturar a rotina essencial de comércio ou serviços.",
    modules: ["dashboard", "crm", "clients", "products", "services", "finance", "documents", "calendar", "reports"],
    featuresByBusinessType: {
      comercio: ["Vendas e clientes", "Produtos e estoque", "Financeiro essencial", "PDV com 1 caixa"],
      servicos: ["Clientes e serviços", "Agenda e agendamentos", "Financeiro essencial", "1 profissional"],
    },
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
    subtitle: "Para empresas em crescimento que querem vender em mais canais.",
    modules: ["dashboard", "opportunities", "crm", "team", "bids", "clients", "contracts", "budgets", "orders", "products", "services", "ecommerce", "pos", "finance", "documents", "calendar", "reports"],
    featuresByBusinessType: {
      comercio: ["Tudo do Essencial", "E-commerce Blu", "Compras e fornecedores", "DRE e conciliação", "Equipe e permissões"],
      servicos: ["Tudo do Essencial", "Contratação online", "Pacotes e comissões", "Recursos e insumos", "Equipe e permissões"],
    },
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
    subtitle: "Para operações avançadas, multiempresa e orientadas por dados.",
    modules: ["dashboard", "opportunities", "crm", "team", "bids", "clients", "contracts", "budgets", "orders", "products", "services", "ecommerce", "pos", "finance", "documents", "calendar", "reports", "integrations", "accounting", "automations", "api"],
    featuresByBusinessType: {
      comercio: ["Tudo do Profissional", "Multiempresa", "Automações e API", "Contador integrado", "Auditoria avançada"],
      servicos: ["Tudo do Profissional", "Multiempresa", "Automações e API", "Contador integrado", "Auditoria avançada"],
    },
    limits: {
      companies: 10,
      activeContracts: 300,
      users: 20,
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
    modules: ["*"],
    featuresByBusinessType: { comercio: ["Todos os módulos", "Limites personalizados", "Implantação assistida"], servicos: ["Todos os módulos", "Limites personalizados", "Implantação assistida"] },
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
  {
    key: "test-1-real",
    name: "Plano Teste Blu",
    subtitle: "Validação da jornada com cobrança simbólica de R$ 1,00. Sem período grátis.",
    modules: ["dashboard", "crm", "clients", "products", "services", "finance", "documents", "calendar", "reports"],
    featuresByBusinessType: { comercio: ["Jornada comercial de teste"], servicos: ["Jornada de serviços de teste"] },
    limits: {
      companies: 1,
      activeContracts: 1,
      users: 1,
      storageGb: 1,
      favoriteOpportunities: 50,
      documents: 25,
      historyEvents: 250,
      digitalCertificates: 1,
      bankAccounts: 1,
      documentTemplates: 1,
      api: "none",
      webhooks: false,
      backup: "daily",
      support: "email",
      advancedAudit: false,
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
