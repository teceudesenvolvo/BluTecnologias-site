import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Bell, BriefcaseBusiness, CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardCheck, CreditCard, Database, FileText, Headphones, HelpCircle, LayoutDashboard, ListTodo, Megaphone, Menu, Moon, Package, Search, Settings, ShieldCheck, ShoppingCart, Sun, Target, UserRoundCog, Users, WalletCards, X } from 'lucide-react';
import { auth, certificateService, onAuthStateChanged, type Certificate } from '../../services/firebase';
import { BluLogo } from '../components/BluLogo';
import { useBluAuth } from '../contexts/BluAuthContext';
import type { ExternalOpportunity } from '../integrations/core/integrationTypes';
import { integrationOpportunityService } from '../services/integrationOpportunityService';
import { interestSettingsService } from '../services/interestSettingsService';
import { accessControlService, defaultAccessRoles, type AccessRole } from '../services/accessControlService';
import { billingClient, normalizeBillingStatus, type BillingSummary } from '../billing/services/billingClient';
import { listCompanyDocs } from '../services/firestoreCompany';
import { AccountantCompanySwitcher } from '../components/AccountantCompanySwitcher';

type StockAlert = { id: string; name: string; stockQuantity?: number; minStock?: number; sku?: string; barcode?: string; type?: string; active?: boolean };

const nav = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Oportunidades', to: '/admin/oportunidades', icon: Target },
  { label: 'CRM', to: '/admin/crm', icon: Users },
  { label: 'Equipe', to: '/admin/equipe', icon: UserRoundCog },
  { label: 'Licitações', to: '/admin/licitacoes', icon: ClipboardCheck },
  { label: 'Clientes', to: '/admin/clientes', icon: Users },
  { label: 'Contratos', to: '/admin/contratos', icon: BriefcaseBusiness },
  { label: 'Orçamentos', to: '/admin/orcamentos', icon: CircleDollarSign },
  { label: 'Ordens', to: '/admin/ordens', icon: ListTodo },
  { label: 'Produtos', to: '/admin/produtos', icon: Package },
  { label: 'Serviços', to: '/admin/servicos', icon: CalendarDays },
  { label: 'E-commerce', to: '/admin/ecommerce', icon: ShoppingCart },
  { label: 'PDV Público', to: '/admin/pdv', icon: ShoppingCart },
  { label: 'Financeiro', to: '/admin/financeiro', icon: WalletCards },
  { label: 'Documentos', to: '/admin/documentos', icon: FileText },
  { label: 'Calendário', to: '/admin/calendario', icon: CalendarDays },
  { label: 'Relatórios', to: '/admin/relatorios', icon: BarChart3 },
  { label: 'Integrações', to: '/admin/integracoes', icon: CircleDollarSign },
  { label: 'Planos', to: '/admin/planos', icon: ShieldCheck },
  { label: 'Assinatura', to: '/admin/assinatura', icon: CreditCard },
  { label: 'Suporte', to: '/admin/suporte', icon: Headphones },
  { label: 'Configurações', to: '/admin/configuracoes', icon: Settings },
];

const platformAdminNav = [
  { label: 'Novidades', to: '/admin/novidades', icon: Megaphone },
  { label: 'Blu HQ', to: '/admin/hq', icon: ShieldCheck },
  { label: 'Migração', to: '/admin/migracao', icon: Database },
];

const planModuleByPath: Record<string, string> = {
  '/admin/dashboard': 'dashboard', '/admin/oportunidades': 'opportunities', '/admin/crm': 'crm', '/admin/equipe': 'team',
  '/admin/licitacoes': 'bids', '/admin/clientes': 'clients', '/admin/contratos': 'contracts', '/admin/orcamentos': 'budgets',
  '/admin/ordens': 'orders', '/admin/produtos': 'products', '/admin/servicos': 'services', '/admin/ecommerce': 'ecommerce',
  '/admin/pdv': 'pos', '/admin/financeiro': 'finance', '/admin/documentos': 'documents', '/admin/calendario': 'calendar',
  '/admin/relatorios': 'reports', '/admin/integracoes': 'integrations',
};

const accountantNav = (companyId: string) => [
  { label: 'Dashboard Contábil', to: '/admin/contador', icon: LayoutDashboard },
  { label: 'Meus Clientes', to: '/admin/empresas', icon: BriefcaseBusiness },
  { label: 'Visão Geral', to: `/admin/contador/empresas/${companyId}/visao-geral`, icon: LayoutDashboard },
  { label: 'Fiscal', to: `/admin/contador/empresas/${companyId}/fiscal`, icon: ClipboardCheck },
  { label: 'Financeiro', to: `/admin/contador/empresas/${companyId}/financeiro`, icon: WalletCards },
  { label: 'Documentos', to: `/admin/contador/empresas/${companyId}/documentos`, icon: FileText },
  { label: 'Obrigações', to: `/admin/contador/empresas/${companyId}/obrigacoes`, icon: CalendarDays },
  { label: 'Contas a Pagar', to: `/admin/contador/empresas/${companyId}/contas-a-pagar`, icon: CreditCard },
  { label: 'Pessoal', to: `/admin/contador/empresas/${companyId}/pessoal`, icon: Users },
  { label: 'Fechamento', to: `/admin/contador/empresas/${companyId}/fechamento`, icon: ClipboardCheck },
  { label: 'Pendências', to: `/admin/contador/empresas/${companyId}/pendencias`, icon: ListTodo },
  { label: 'Solicitações', to: `/admin/contador/empresas/${companyId}/solicitacoes`, icon: Headphones },
  { label: 'Relatórios', to: `/admin/contador/empresas/${companyId}/relatorios`, icon: BarChart3 },
  { label: 'Exportações', to: `/admin/contador/empresas/${companyId}/exportacoes`, icon: Database },
  { label: 'Configurações', to: '/admin/configuracoes', icon: Settings },
];

const quickFeatures = [
  { label: 'Nova oportunidade', to: '/admin/oportunidades', description: 'Buscar processos, editais, PNCP e integrações', keywords: 'licitação licitacao edital pncp comprasgov tce oportunidade participar arquivos ia' },
  { label: 'Áreas de interesse', to: '/admin/oportunidades', description: 'Configurar filtros de objetos e estados de interesse', keywords: 'areas interesse filtros estados oportunidades notificações notificacoes' },
  { label: 'Gerar proposta', to: '/admin/licitacoes', description: 'Gerar propostas, impugnações, esclarecimentos e parecer com IA', keywords: 'proposta impugnação impugnacao esclarecimento parecer ia edital saved licitacoes' },
  { label: 'Novo orçamento', to: '/admin/orcamentos', description: 'Criar orçamento e PDF timbrado da proposta', keywords: 'orcamento orçamento pdf proposta itens produto serviço servico impostos' },
  { label: 'Novo serviço', to: '/admin/servicos/catalog', description: 'Cadastrar serviço, duração, preço e capacidade', keywords: 'serviço servico agenda agendamento duração capacidade atendimento' },
  { label: 'Nova venda no PDV', to: '/admin/pdv', description: 'Venda para órgão público com estoque, financeiro e documento fiscal', keywords: 'pdv venda balcão cupom fiscal estoque órgão cliente nota email' },
  { label: 'Nova cobrança', to: '/admin/financeiro', description: 'Enviar cobrança oficial com nota fiscal, certidões e relatório', keywords: 'cobranca cobrança receber financeiro nota fiscal certidao relatório contrato cliente email pagarme checkout pix cartão' },
  { label: 'Contas bancárias', to: '/admin/financeiro/contas-bancarias', description: 'Gerenciar bancos, caixas, recebimentos e pagamentos', keywords: 'banco conta bancaria bancária pix saldo transferência transferencia' },
  { label: 'Fluxo de caixa', to: '/admin/financeiro/fluxo-de-caixa', description: 'Entradas, saídas, previsto, realizado e vencimentos', keywords: 'fluxo caixa entrada saida saída receita despesa vencido previsto realizado' },
  { label: 'Notas fiscais', to: '/admin/financeiro/notas-fiscais', description: 'Notas emitidas, recebidas, XML, PDF e vínculos financeiros', keywords: 'nfse nfe nota fiscal xml pdf retenção retencao tributo' },
  { label: 'Gestão tributária', to: '/admin/financeiro/gestao-tributaria', description: 'Tributos, retenções, guias e estimativas gerenciais', keywords: 'tributo imposto iss inss irrf pis cofins csll icms ipi retenção' },
  { label: 'DRE Gerencial', to: '/admin/financeiro/dre-gerencial', description: 'Resultado gerencial, margem e orçado x realizado', keywords: 'dre resultado lucro margem gerencial competência caixa' },
  { label: 'Upload de documentos', to: '/admin/documentos', description: 'Cadastrar documentos, certidões e baixar ZIP', keywords: 'documento certidão certidao upload validade vencimento zip download' },
  { label: 'Abrir chamado', to: '/admin/suporte', description: 'Chat com suporte, SAC e acompanhamento de chamados', keywords: 'suporte chamado chat sac atendimento ajuda problema ticket' },
  { label: 'Níveis de acesso', to: '/admin/configuracoes/niveis-acesso', description: 'Configurar permissões por tipo de usuário', keywords: 'permissão permissao acesso perfil usuário usuario tipo equipe admin' },
  { label: 'Minha assinatura', to: '/admin/assinatura', description: 'Plano atual, uso, cobranças e pagamentos', keywords: 'assinatura plano pagamento cobrança pagarme upgrade uso limite checkout pix cartão' },
  { label: 'Migração de dados', to: '/admin/migracao', description: 'Migrar dados do Firebase para o backend Blu', keywords: 'migração migracao firebase backend banco dados render postgres' },
];

const normalizeCertificateText = (value?: string) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const inferCertificateType = (item: Certificate) => {
  const extended = item as Certificate & { type?: string };
  const explicit = normalizeCertificateText(extended.type);
  if (explicit) return explicit;
  const name = normalizeCertificateText(item.name);
  if (name.includes('fgts')) return 'cnd fgts';
  if (name.includes('federal')) return 'cnd federal';
  if (name.includes('estadual')) return 'cnd estadual';
  if (name.includes('municipal')) return 'cnd municipal';
  if (name.includes('trabalhista')) return 'cnd trabalhista';
  if (name.includes('falencia')) return 'cnd falencia';
  if (name.includes('alvara')) return 'alvara';
  if (name.includes('contrato social')) return 'contrato social';
  if (name.includes('cnpj')) return 'cnpj';
  return name;
};

const inferCertificateCompany = (item: Certificate) => {
  const name = normalizeCertificateText(item.name);
  const type = inferCertificateType(item);
  const nameReference = name
    .replace(type, '')
    .replace(/\b(certidao|negativa|positiva|cnd|debitos|debito|tributos|tributaria|fiscal|regularidade|validade|pdf)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Os documentos legados nem sempre têm company/legalEntityId. O sufixo do
  // nome (ex.: "Lavoro") é a referência comum entre a versão antiga e a nova.
  if (nameReference) return nameReference;
  return normalizeCertificateText(item.company || item.companyName);
};

const certificateReference = (item: Certificate) => {
  const type = inferCertificateType(item);
  const company = inferCertificateCompany(item);
  return `${company || normalizeCertificateText(item.legalEntityId) || 'sem-empresa'}|${type}`;
};

const certificateDateTime = (value: unknown) => {
  if (!value) return 0;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  const raw = String(value).slice(0, 10);
  const parsed = new Date(`${raw}T12:00:00`).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const certificateAlertItems = (items: Certificate[]) => {
  const grouped = new Map<string, Certificate[]>();
  items.forEach((item) => {
    const reference = certificateReference(item);
    const bucket = grouped.get(reference) || [];
    bucket.push(item);
    grouped.set(reference, bucket);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [...grouped.values()]
    .map((bucket) => {
      const sorted = [...bucket].sort((a, b) => {
        const issueDifference = certificateDateTime(b.issueDate) - certificateDateTime(a.issueDate);
        if (issueDifference) return issueDifference;
        const createdDifference = certificateDateTime(b.createdAt) - certificateDateTime(a.createdAt);
        if (createdDifference) return createdDifference;
        const updatedDifference = certificateDateTime(b.updatedAt) - certificateDateTime(a.updatedAt);
        if (updatedDifference) return updatedDifference;
        return certificateDateTime(b.expiryDate) - certificateDateTime(a.expiryDate);
      });
      const latest = sorted[0];
      return latest;
    })
    .filter((latest) => {
      if (!latest?.expiryDate) return false;
      const expiry = new Date(`${latest.expiryDate}T12:00:00`);
      if (!Number.isFinite(expiry.getTime())) return false;
      const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
      return days <= 7;
    });
};

const notificationStorageKey = "blu:notifications:read";
const opportunityNotificationId = (item: ExternalOpportunity) =>
  `opp:${item.source}:${item.externalId}`;
const certificateNotificationId = (item: Certificate) => `cert:${item.id}`;
const stockNotificationId = (item: StockAlert) => `stock:${item.id}`;
const readNotificationIds = () => {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = JSON.parse(
      window.localStorage.getItem(notificationStorageKey) || "[]",
    );
    return new Set<string>(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set<string>();
  }
};
const writeNotificationIds = (ids: Set<string>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(notificationStorageKey, JSON.stringify([...ids]));
};
const opportunitySourceLabel = (source?: string) => {
  switch (source) {
    case "pncp":
      return "PNCP";
    case "compras-gov":
      return "Compras.gov.br";
    case "tce-ce":
      return "TCE-CE";
    case "portal-compras-publicas":
      return "Portal de Compras Públicas";
    default:
      return "Fonte oficial";
  }
};

export const BluAppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem('blu-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
  });
  const [notificationOpen,setNotificationOpen]=useState(false);const [todayOpportunities,setTodayOpportunities]=useState<ExternalOpportunity[]>([]);const[certificateAlerts,setCertificateAlerts]=useState<Certificate[]>([]);const[stockAlerts,setStockAlerts]=useState<StockAlert[]>([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(
    () => readNotificationIds(),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [firebaseUid, setFirebaseUid] = useState(auth.currentUser?.uid || '');
  const [accessRoles, setAccessRoles] = useState<AccessRole[]>(defaultAccessRoles);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const { user, memberships, switchCompany } = useBluAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const readCachedUser = () => {
    try { return JSON.parse(window.localStorage.getItem('blu-licita:user') || 'null') as { email?: string } | null; }
    catch { return null; }
  };
  const authenticatedEmails = [
    user?.email,
    auth.currentUser?.email,
    readCachedUser()?.email,
  ]
    .map((email) => String(email || '').trim().toLowerCase())
    .filter(Boolean);
  const platformAdminEmail = authenticatedEmails[0] || '';
  const isBluRoot = authenticatedEmails.includes('admin@blutecnologias.com.br');
  const currentRole = accessControlService.roleFor(user?.role, accessRoles);
  const normalizedUserRole = String(user?.role || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const activeMembership = memberships.find((item) => item.companyId === user?.companyId && item.status === 'active');
  const normalizedMembershipRole = String(activeMembership?.role || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const isBluPlatformStaff = isBluRoot || String(user?.companyId || '').toLowerCase() === 'blu-platform' || /blu/i.test(String(user?.role || ''));
  const administrativeRoles = ['owner', 'admin', 'proprietario', 'administrador', 'gestor'];
  const hasFullAdminNavigation = isBluPlatformStaff || administrativeRoles.some((role) => normalizedUserRole.includes(role) || normalizedMembershipRole.includes(role));
  const canAccessPath = (pathname: string) => {
    if (hasFullAdminNavigation) return true;
    const key = accessControlService.pageKeyFromPath(pathname);
    if (!key) return true;
    return currentRole.pages.includes(key);
  };
  const isAccountant = !hasFullAdminNavigation && normalizedUserRole === 'contador';
  const accountantNavigation = accountantNav(user?.companyId || memberships.find((item) => item.status === 'active')?.companyId || 'selecionar');
  const accountantCanSee = (label: string) => {
    const permissions = user?.permissions || {};
    if (['Dashboard Contábil', 'Meus Clientes', 'Configurações'].includes(label)) return true;
    if (label === 'Visão Geral') return permissions.accounting?.view === true;
    if (label === 'Fiscal') return permissions.fiscal?.view === true || permissions.invoices?.view === true;
    if (label === 'Financeiro') return permissions.financial?.view === true;
    if (label === 'Documentos') return permissions.accountingDocuments?.view === true;
    if (label === 'Obrigações') return permissions.accountingObligations?.view === true;
    if (label === 'Contas a Pagar') return permissions.financial?.view === true;
    if (label === 'Pessoal') return permissions.payroll?.view === true;
    if (label === 'Fechamento') return permissions.accountingClosing?.view === true;
    if (label === 'Pendências') return permissions.accountingPending?.view === true;
    if (label === 'Solicitações') return permissions.accountingRequests?.view === true;
    if (label === 'Relatórios') return permissions.reports?.view === true;
    if (label === 'Exportações') return permissions.accountingExports?.view === true;
    return false;
  };
  const planAllowsPath = (pathname: string) => {
    if (isBluPlatformStaff) return true;
    const modules = billing?.plan?.modules;
    if (!Array.isArray(modules) || !modules.length || modules.includes('*')) return true;
    const matchedPath = Object.keys(planModuleByPath).sort((a,b)=>b.length-a.length).find((path)=>pathname === path || pathname.startsWith(`${path}/`));
    const module = matchedPath ? planModuleByPath[matchedPath] : undefined;
    return !module || modules.includes(module);
  };
  const visibleNav = isAccountant
    ? accountantNavigation.filter((item) => accountantCanSee(item.label))
    : [
        ...nav.filter((item) =>
          (isBluPlatformStaff || canAccessPath(item.to)) && planAllowsPath(item.to) &&
          (isBluRoot || item.label !== 'Integrações'),
        ),
        ...(isBluPlatformStaff ? platformAdminNav : []),
      ];
  const title = [...nav, ...platformAdminNav, ...accountantNavigation].sort((a,b) => b.to.length - a.to.length).find((item) => location.pathname.startsWith(item.to))?.label || 'Visão Geral';
  const currentPageAllowed = canAccessPath(location.pathname) && planAllowsPath(location.pathname);
  const subscriptionStatus = normalizeBillingStatus(billing?.subscription?.status || billing?.subscription?.accessStatus || '');
  const isFreeBillingPlan = Boolean(billing?.plan) && Number(billing?.plan?.priceInCents || 0) <= 0;
  const billingRestricted = !isFreeBillingPlan && ['PAYMENT_PENDING', 'SUSPENDED'].includes(subscriptionStatus) && !location.pathname.startsWith('/admin/assinatura') && !location.pathname.startsWith('/admin/planos') && !location.pathname.startsWith('/admin/assinatura/checkout') && !location.pathname.startsWith('/admin/assinatura/retorno');
  const searchableItems = React.useMemo(() => {
    const navItems = visibleNav.map((item) => ({ label: item.label, to: item.to, description: 'Abrir página do sistema', keywords: item.label }));
    const featureItems = quickFeatures.filter((item) => canAccessPath(item.to) && (isBluPlatformStaff || !item.to.startsWith('/admin/hq')) && visibleNav.some((navItem) => item.to.startsWith(navItem.to) || navItem.to.startsWith(item.to)));
    const unique = new Map<string, { label: string; to: string; description: string; keywords: string }>();
    [...navItems, ...featureItems].forEach((item) => unique.set(`${item.to}:${item.label}`, item));
    return [...unique.values()];
  }, [visibleNav, currentRole.pages.join('|'), isBluPlatformStaff]);
  const searchResults = React.useMemo(() => {
    const term = searchQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (!term) return searchableItems.slice(0, 8);
    return searchableItems
      .map((item) => {
        const haystack = `${item.label} ${item.description} ${item.keywords}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const score = item.label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().startsWith(term) ? 3 : haystack.includes(term) ? 1 : 0;
        return { ...item, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, 8);
  }, [searchQuery, searchableItems]);
  const openSearchResult = (to: string) => {
    setSearchQuery('');
    setSearchOpen(false);
    navigate(to);
  };
  const unreadOpportunities = todayOpportunities.filter(
    (item) => !readNotifications.has(opportunityNotificationId(item)),
  );
  const unreadCertificates = certificateAlerts.filter(
    (item) => !readNotifications.has(certificateNotificationId(item)),
  );
  const unreadStockAlerts = stockAlerts.filter(
    (item) => !readNotifications.has(stockNotificationId(item)),
  );
  const unreadNotificationsCount =
    unreadOpportunities.length +
    unreadCertificates.length +
    unreadStockAlerts.length;
  const markNotificationAsRead = (id: string) => {
    setReadNotifications((current) => {
      const next = new Set(current);
      next.add(id);
      writeNotificationIds(next);
      return next;
    });
  };
  const markAllNotificationsAsRead = () => {
    const next = new Set(readNotifications);
    todayOpportunities.forEach((item) => next.add(opportunityNotificationId(item)));
    certificateAlerts.forEach((item) => next.add(certificateNotificationId(item)));
    stockAlerts.forEach((item) => next.add(stockNotificationId(item)));
    writeNotificationIds(next);
    setReadNotifications(next);
  };
  const navGroups = isAccountant ? [
    { title: 'Portal do contador', labels: ['Dashboard Contábil', 'Meus Clientes'] },
    { title: 'Contabilidade', labels: ['Visão Geral', 'Fiscal', 'Financeiro', 'Documentos', 'Obrigações', 'Contas a Pagar', 'Pessoal', 'Fechamento', 'Pendências', 'Solicitações', 'Relatórios', 'Exportações'] },
    { title: 'Conta', labels: ['Configurações'] },
  ] : [
    { title: 'Essencial', labels: ['Dashboard', 'Oportunidades', 'CRM', 'Equipe', 'Licitações'] },
    { title: 'Operação', labels: ['Clientes', 'Contratos', 'Orçamentos', 'Ordens', 'Produtos', 'Serviços', 'E-commerce', 'PDV Público'] },
    { title: 'Gestão', labels: ['Financeiro', 'Documentos', 'Calendário', 'Relatórios'] },
    { title: 'Plataforma Blu', labels: ['Integrações', 'Planos', 'Assinatura', 'Suporte', 'Configurações', 'Novidades', 'Blu HQ', 'Migração'] },
  ];
  const navigationForCurrentProfile = isAccountant
    ? accountantNavigation
    : [...nav, ...platformAdminNav];
  const navByLabel = new Map(navigationForCurrentProfile.map((item) => [item.label, item] as const));
  const renderNavItem = ({ label, to, icon: Icon }: (typeof nav)[number]) => (
    <NavLink key={to} to={to} end={to === '/admin/contador'} onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined} className={({ isActive }) => `flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-[#0877ff] shadow-sm dark:border dark:border-blue-300/20 dark:bg-blue-500/[0.18] dark:text-blue-100 dark:shadow-blue-950/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-blue-500/10 dark:hover:text-blue-100'} ${collapsed ? 'justify-center' : ''}`}>
      <Icon size={18} strokeWidth={1.9} />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );

  useEffect(()=>{if(!user||!firebaseUid)return;const today=new Date().toISOString().slice(0,10);Promise.all([integrationOpportunityService.listModalities(),interestSettingsService.get(user.companyId)]).then(async([modalities,keywords])=>{const auction=modalities.find((item)=>item.nome.toLowerCase().includes('pregão')&&item.nome.toLowerCase().includes('eletr'));if(!auction)return;const result=await integrationOpportunityService.list('pncp',{startDate:today,endDate:today,modalityCode:auction.id,pageSize:50});setTodayOpportunities(result.data.filter((item)=>item.publicationDate?.slice(0,10)===today&&(keywords.length===0||interestSettingsService.matches(item.object,keywords))).slice(0,20))}).catch(()=>setTodayOpportunities([]))},[user,firebaseUid]);
  useEffect(()=>{if(!user||!firebaseUid)return;certificateService.getAll().then(items=>{setCertificateAlerts(certificateAlertItems(items))}).catch(()=>setCertificateAlerts([]))},[user,firebaseUid]);
  useEffect(()=>{if(!user||!firebaseUid)return;listCompanyDocs<StockAlert>('products',user.companyId).then(items=>setStockAlerts(items.filter(item=>item.active!==false&&item.type!=='service'&&Number(item.stockQuantity||0)<=Number(item.minStock||0)).sort((a,b)=>Number(a.stockQuantity||0)-Number(b.stockQuantity||0)).slice(0,20))).catch(()=>setStockAlerts([]))},[user,firebaseUid]);
  useEffect(()=>{if(!user||!firebaseUid)return;const refresh=()=>{listCompanyDocs<StockAlert>('products',user.companyId).then(items=>setStockAlerts(items.filter(item=>item.active!==false&&item.type!=='service'&&Number(item.stockQuantity||0)<=Number(item.minStock||0)).sort((a,b)=>Number(a.stockQuantity||0)-Number(b.stockQuantity||0)).slice(0,20))).catch(()=>setStockAlerts([]))};window.addEventListener('blu:stock-updated',refresh);return()=>window.removeEventListener('blu:stock-updated',refresh)},[user,firebaseUid]);
  useEffect(()=>{if(!user)return;accessControlService.get(user.companyId).then((settings)=>setAccessRoles(settings.roles)).catch(()=>setAccessRoles(defaultAccessRoles))},[user]);
  useEffect(()=>{if(!user||!firebaseUid)return;billingClient.summary().then(setBilling).catch(()=>setBilling(null))},[user,firebaseUid]);
  useEffect(()=>{const read=()=>{setAuthDisplayName(auth.currentUser?.displayName||'');setFirebaseUid(auth.currentUser?.uid||'')};read();const unsubscribe=onAuthStateChanged(auth,()=>read());window.addEventListener('blu:profile-updated',read);return()=>{unsubscribe();window.removeEventListener('blu:profile-updated',read)}},[]);
  useEffect(()=>{document.documentElement.classList.toggle('dark',darkMode);window.localStorage.setItem('blu-theme',darkMode?'dark':'light')},[darkMode]);
  useEffect(()=>{const listener=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();searchInputRef.current?.focus();setSearchOpen(true)}};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener)},[]);

  const rawUserName = String(authDisplayName || user?.name || '').trim();
  const companyName = String(user?.companyName || '').trim();
  const fallbackUserName = String(user?.email || 'Usuário Blu').split('@')[0] || 'Usuário Blu';
  const footerUserName = !rawUserName || rawUserName === companyName || /blu tecnologias/i.test(rawUserName) ? fallbackUserName : rawUserName;
  const initials = footerUserName.split(/\s+/).filter(Boolean).slice(0,2).map((item)=>item[0]?.toUpperCase()).join('') || 'U';
  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {mobileOpen && <button aria-label="Fechar menu" className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-200 dark:border-white/10 dark:bg-slate-950 ${collapsed ? 'w-[76px]' : 'w-[248px]'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex h-[72px] items-center justify-between border-b border-slate-100 px-5 dark:border-white/10">
          <BluLogo compact={collapsed} />
          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden dark:hover:bg-white/10" onClick={() => setMobileOpen(false)}><X size={19} /></button>
        </div>
        <nav className="flex-1 space-y-3 overflow-y-auto p-3">
          {navGroups.map((group) => {
            const items = group.labels.map((label) => navByLabel.get(label)).filter(Boolean) as typeof nav;
            const visibleItems = items.filter((item) => visibleNav.some((visible) => visible.to === item.to));
            if (!visibleItems.length) return null;
            return (
              <section key={group.title} className="space-y-1">
                {!collapsed && <p className="px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-[.18em] text-slate-400 dark:text-slate-500">{group.title}</p>}
                {visibleItems.map(renderNavItem)}
              </section>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 p-3 dark:border-white/10">
          <button onClick={() => navigate('/admin/perfil')} title="Meu perfil" className={`flex w-full items-center gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-white/8 ${collapsed ? 'justify-center' : ''}`}>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">{initials}</div>
            {!collapsed && <div className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-semibold">{footerUserName}</p><p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{companyName || 'Minha empresa'}</p></div>}
          </button>
        </div>
        <button onClick={() => setCollapsed((value) => !value)} className="absolute -right-3 top-[86px] hidden h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm lg:grid dark:border-white/10 dark:bg-slate-900 dark:text-slate-300" aria-label="Recolher menu">{collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}</button>
      </aside>
      <div className={`transition-all duration-200 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[248px]'}`}>
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-7 dark:border-white/10 dark:bg-slate-950/90">
          <button className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden dark:border-white/10 dark:text-slate-300" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="min-w-0"><h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1><p className="hidden text-xs text-slate-400 sm:block">{new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long'}).format(new Date())}</p></div>
          {isAccountant && !location.pathname.startsWith('/admin/contador/empresas/') ? <AccountantCompanySwitcher/> : !isAccountant && memberships.length > 1 && <select aria-label="Empresa atual" value={user?.companyId || ''} onChange={(event) => void switchCompany(event.target.value)} className="hidden max-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold lg:block dark:border-white/10 dark:bg-slate-900">{memberships.map((membership) => <option key={membership.id} value={membership.companyId}>{membership.companyName}</option>)}</select>}
          <div className="relative ml-auto hidden w-full max-w-[420px] md:block" onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/8">
              <Search size={17} className="text-slate-400"/>
              <input
                ref={searchInputRef}
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true); }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setSearchOpen(false);
                  if (event.key === 'Enter' && searchResults[0]) openSearchResult(searchResults[0].to);
                }}
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="Buscar páginas ou funcionalidades..."
              />
              <kbd className="rounded border bg-white px-1.5 text-[10px] text-slate-400 dark:border-white/10 dark:bg-slate-900">⌘K</kbd>
            </div>
            {searchOpen && (
              <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-4 py-3 dark:border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Busca rápida</p>
                </div>
                <div className="max-h-[360px] overflow-y-auto p-2">
                  {searchResults.map((item) => (
                    <button key={`${item.to}-${item.label}`} onMouseDown={(event) => event.preventDefault()} onClick={() => openSearchResult(item.to)} className="block w-full rounded-xl px-3 py-3 text-left transition hover:bg-blue-50 dark:hover:bg-white/8">
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">{item.label}</p>
                      <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-300">{item.description}</p>
                    </button>
                  ))}
                  {!searchResults.length && <p className="px-3 py-8 text-center text-sm text-slate-500">Nenhuma página ou funcionalidade encontrada.</p>}
                </div>
              </div>
            )}
          </div>
          <button onClick={()=>setDarkMode((value)=>!value)} className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10" aria-label={darkMode?'Mudar para tema claro':'Mudar para tema escuro'} title={darkMode?'Tema claro':'Tema escuro'}>{darkMode?<Sun size={19}/>:<Moon size={19}/>}</button>
          <button className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10" aria-label="Ajuda"><HelpCircle size={19}/></button>
          <div className="relative">
            <button onClick={()=>setNotificationOpen((value)=>!value)} className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10" aria-label="Notificações">
              <Bell size={19}/>{unreadNotificationsCount>0&&<span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unreadNotificationsCount}</span>}
            </button>
            {notificationOpen&&<div className="fixed right-4 top-16 z-50 w-[min(420px,92vw)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-950 dark:shadow-black/40">
                <div className="border-b border-slate-100 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">Notificações</h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Oportunidades, documentos e estoque que precisam da sua atenção.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadNotificationsCount > 0 && (
                        <button onClick={markAllNotificationsAsRead} className="rounded-xl px-3 py-2 text-xs font-bold text-blue-600 hover:bg-white/80 dark:text-blue-300 dark:hover:bg-white/10">
                          Ler tudo
                        </button>
                      )}
                      <button onClick={()=>setNotificationOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-white/10" aria-label="Fechar notificações"><X size={18}/></button>
                    </div>
                  </div>
                </div>
                <div className="max-h-[min(70vh,560px)] overflow-y-auto bg-white/95 dark:bg-slate-950/95">
                  {unreadCertificates.length>0&&<div><p className="bg-amber-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">Certidões</p>{unreadCertificates.map(item=>{const today=new Date();today.setHours(0,0,0,0);const days=Math.ceil((new Date(`${item.expiryDate}T12:00:00`).getTime()-today.getTime())/86400000);return <button key={item.id} onClick={()=>{markNotificationAsRead(certificateNotificationId(item));setNotificationOpen(false);navigate('/admin/documentos')}} className="block w-full border-b border-slate-100 p-4 text-left transition hover:bg-amber-50/80 dark:border-white/10 dark:hover:bg-white/8"><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.name}</p><p className={`mt-1 text-xs font-semibold ${days<=0?'text-rose-600 dark:text-rose-300':'text-amber-600 dark:text-amber-300'}`}>{days<0?'Certidão vencida':days===0?'Vence hoje':`Vence em ${days} dia${days===1?'':'s'}`}</p></button>})}</div>}
                  {unreadStockAlerts.length>0&&<div><p className="bg-rose-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-rose-700 dark:bg-rose-400/10 dark:text-rose-200">Alertas de estoque</p>{unreadStockAlerts.map(item=>{const balance=Number(item.stockQuantity||0);const minimum=Number(item.minStock||0);return <button key={item.id} onClick={()=>{markNotificationAsRead(stockNotificationId(item));setNotificationOpen(false);navigate('/admin/produtos?aba=estoque')}} className="block w-full border-b border-slate-100 p-4 text-left transition hover:bg-rose-50/70 dark:border-white/10 dark:hover:bg-white/8"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{item.name}</p><p className="mt-1 text-xs text-slate-400">{item.sku||item.barcode||'Produto sem código'}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${balance<=0?'bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-200':'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200'}`}>{balance<=0?'SEM ESTOQUE':'ESTOQUE BAIXO'}</span></div><p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-300">Saldo: {balance} · Mínimo: {minimum}</p></button>})}</div>}
                  {unreadOpportunities.length>0&&<div><p className="bg-blue-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-400/10 dark:text-blue-200">Oportunidades de hoje</p>{unreadOpportunities.map((item)=><button key={item.externalId} onClick={()=>{markNotificationAsRead(opportunityNotificationId(item));setNotificationOpen(false);navigate('/admin/oportunidades',{state:{openOpportunity:item}})}} className="block w-full border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/8"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase text-blue-600 dark:text-blue-300">{item.organizationName}</p><span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-white/10 dark:text-slate-300">{opportunitySourceLabel(item.source)}</span></div><p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{item.object}</p><p className="mt-2 text-xs text-slate-400 dark:text-slate-400">Publicado hoje · {item.processNumber||item.procurementNumber}</p></button>)}</div>}
                  {unreadOpportunities.length===0&&unreadCertificates.length===0&&unreadStockAlerts.length===0&&<p className="p-8 text-center text-sm text-slate-500 dark:text-slate-300">Nenhuma notificação nova.</p>}
                </div>
                <button onClick={()=>{setNotificationOpen(false);navigate('/admin/oportunidades')}} className="w-full border-t border-slate-100 bg-slate-50/80 p-3 text-xs font-semibold text-blue-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.03] dark:text-blue-300 dark:hover:bg-white/[0.06]">Configurar áreas de interesse</button>
              </div>}
          </div>
          <button
            onClick={() => navigate('/admin/perfil')}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-slate-950"
            aria-label="Meu perfil"
            title={footerUserName || 'Meu perfil'}
          >
            {initials}
          </button>
        </header>
        <main className="p-4 md:p-7">
          {!isFreeBillingPlan&&['PAST_DUE','GRACE_PERIOD','PAYMENT_PENDING','SUSPENDED'].includes(subscriptionStatus)&&<div className={`mb-4 rounded-2xl border p-4 text-sm font-semibold ${subscriptionStatus==='SUSPENDED'?'border-rose-200 bg-rose-50 text-rose-800':'border-amber-200 bg-amber-50 text-amber-800'}`}>
            {subscriptionStatus==='SUSPENDED'?'Assinatura suspensa por atraso. Regularize o pagamento para voltar a realizar alterações no sistema.':'Pagamento pendente. Regularize o plano para continuar usando a Blu.'}
            <button onClick={()=>navigate('/admin/assinatura')} className="ml-3 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">Atualizar pagamento</button>
          </div>}
          {billingRestricted ? <div className="mx-auto max-w-2xl rounded-3xl border border-rose-200 bg-white p-10 text-center shadow-sm"><h2 className="text-2xl font-bold">Acesso temporariamente bloqueado</h2><p className="mt-2 text-sm text-slate-500">O pagamento está em atraso acima do período de tolerância. Seus dados estão preservados; regularize a assinatura para continuar usando a Blu.</p><button onClick={()=>navigate('/admin/assinatura')} className="mt-5 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">Atualizar pagamento</button></div> : currentPageAllowed ? <Outlet /> : <div className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-white p-10 text-center shadow-sm"><h2 className="text-2xl font-bold">Recurso não disponível</h2><p className="mt-2 text-sm text-slate-500">Este módulo não está liberado no plano atual ou nas permissões do seu usuário.</p><div className="mt-5 flex justify-center gap-2"><button onClick={()=>navigate('/admin/dashboard')} className="rounded-xl border px-4 py-3 text-sm font-bold">Voltar ao dashboard</button><button onClick={()=>navigate('/admin/planos')} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">Ver planos</button></div></div>}
        </main>
      </div>
    </div>
  );
};
