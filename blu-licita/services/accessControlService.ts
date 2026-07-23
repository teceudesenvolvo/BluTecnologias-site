import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase";

export type AccessPageKey =
  | "dashboard"
  | "opportunities"
  | "crm"
  | "team"
  | "biddings"
  | "clients"
  | "contracts"
  | "budgets"
  | "orders"
  | "products"
  | "financial"
  | "documents"
  | "calendar"
  | "reports"
  | "integrations"
  | "settings"
  | "profile";

export type AccessRole = {
  id: string;
  name: string;
  description?: string;
  pages: AccessPageKey[];
  system?: boolean;
};

export type AccessControlSettings = {
  roles: AccessRole[];
  updatedAt?: string;
  updatedBy?: string;
};

export const accessPages: Array<{ key: AccessPageKey; label: string; path: string }> = [
  { key: "dashboard", label: "Dashboard", path: "/admin/dashboard" },
  { key: "opportunities", label: "Oportunidades", path: "/admin/oportunidades" },
  { key: "crm", label: "CRM", path: "/admin/crm" },
  { key: "team", label: "Equipe", path: "/admin/equipe" },
  { key: "biddings", label: "Licitações", path: "/admin/licitacoes" },
  { key: "clients", label: "Clientes", path: "/admin/clientes" },
  { key: "contracts", label: "Contratos", path: "/admin/contratos" },
  { key: "budgets", label: "Orçamentos", path: "/admin/orcamentos" },
  { key: "orders", label: "Ordens", path: "/admin/ordens" },
  { key: "products", label: "Produtos", path: "/admin/produtos" },
  { key: "financial", label: "Financeiro", path: "/admin/financeiro" },
  { key: "documents", label: "Documentos", path: "/admin/documentos" },
  { key: "calendar", label: "Calendário", path: "/admin/calendario" },
  { key: "reports", label: "Relatórios", path: "/admin/relatorios" },
  { key: "integrations", label: "Integrações", path: "/admin/integracoes" },
  { key: "settings", label: "Configurações", path: "/admin/configuracoes" },
  { key: "profile", label: "Perfil", path: "/admin/perfil" },
];

const allPages = accessPages.map((page) => page.key);

export const defaultAccessRoles: AccessRole[] = [
  { id: "owner", name: "Proprietário", description: "Acesso completo ao ambiente.", pages: allPages, system: true },
  { id: "admin", name: "Administrador", description: "Gerencia operação, equipe e configurações.", pages: allPages, system: true },
  { id: "financial", name: "Financeiro", description: "Acesso aos módulos financeiros, documentos, clientes e contratos.", pages: ["dashboard", "clients", "contracts", "financial", "documents", "reports", "profile"], system: true },
  { id: "analyst", name: "Analista", description: "Acompanha oportunidades, licitações, CRM e documentos.", pages: ["dashboard", "opportunities", "crm", "biddings", "clients", "documents", "calendar", "profile"], system: true },
  { id: "viewer", name: "Visualizador", description: "Acesso somente leitura aos principais painéis.", pages: ["dashboard", "opportunities", "clients", "contracts", "documents", "reports", "profile"], system: true },
];

const storageKey = (companyId: string) => `blu:access-control:${companyId}`;

const normalizeRoleId = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `role-${Date.now()}`;

export const accessControlService = {
  normalizeRoleId,
  async get(companyId: string): Promise<AccessControlSettings> {
    const fallback = (): AccessControlSettings => {
      try {
        return JSON.parse(localStorage.getItem(storageKey(companyId)) || "null") || { roles: defaultAccessRoles };
      } catch {
        return { roles: defaultAccessRoles };
      }
    };
    try {
      const snapshot = await getDoc(doc(db, "companies", companyId, "settings", "accessControl"));
      if (snapshot.exists()) {
        const data = snapshot.data() as AccessControlSettings;
        const settings = { roles: data.roles?.length ? data.roles : defaultAccessRoles, updatedAt: data.updatedAt, updatedBy: data.updatedBy };
        localStorage.setItem(storageKey(companyId), JSON.stringify(settings));
        return settings;
      }
    } catch {
      return fallback();
    }
    return fallback();
  },
  async save(companyId: string, userId: string, settings: AccessControlSettings) {
    const clean: AccessControlSettings = {
      ...settings,
      roles: settings.roles.map((role) => ({ ...role, pages: [...new Set(role.pages)] })),
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };
    localStorage.setItem(storageKey(companyId), JSON.stringify(clean));
    await setDoc(doc(db, "companies", companyId, "settings", "accessControl"), clean, { merge: true }).catch(() => undefined);
  },
  roleFor(userRole?: string, roles: AccessRole[] = defaultAccessRoles) {
    const normalized = String(userRole || "").toLowerCase();
    return roles.find((role) => role.id === normalized || role.name.toLowerCase() === normalized) || roles[0] || defaultAccessRoles[0];
  },
  pageKeyFromPath(pathname: string): AccessPageKey | null {
    const match = accessPages
      .filter((page) => pathname === page.path || pathname.startsWith(`${page.path}/`))
      .sort((a, b) => b.path.length - a.path.length)[0];
    return match?.key || null;
  },
};
