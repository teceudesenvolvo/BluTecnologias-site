import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

export type HqCompany = {
  id: string;
  name?: string;
  legalName?: string;
  tradeName?: string;
  document?: string;
  ownerUserId?: string;
  subscriptionId?: string;
  accessStatus?: string;
  createdAt?: string;
};

export type HqPlan = {
  id: string;
  name?: string;
  slug?: string;
  priceInCents?: number;
  billingInterval?: string;
};

export type HqSubscription = {
  id: string;
  customerCompanyId?: string;
  planId?: string;
  status?: string;
  trialEndsAt?: string;
  currentPeriodEndsAt?: string;
  nextBillingDate?: string;
};

export type HqPayment = {
  id: string;
  companyId?: string;
  amountInCents?: number;
  paidAmountInCents?: number;
  status?: string;
  paidAt?: string;
};

export type HqOrder = {
  id: string;
  companyId?: string;
  planId?: string;
  status?: string;
  type?: string;
  amountInCents?: number;
  createdAt?: string;
};

export type HqTicket = {
  id: string;
  companyId?: string;
  subject?: string;
  status?: string;
  category?: string;
  priority?: string;
  updatedAt?: string;
};

export type HqProspect = {
  id: string;
  companyId?: string;
  name?: string;
  razaoSocial?: string;
  municipio?: string;
  estado?: string;
  solution?: string;
  source?: string;
  status?: string;
  date?: string;
};

export type HqPlatformCustomer = {
  id: string;
  companyId?: string;
  userId?: string;
  user?: { id?: string; name?: string; email?: string; phone?: string };
  company?: Record<string, any>;
  subscriptionId?: string;
  planId?: string;
  status?: string;
  source?: string;
  trialDays?: number;
  trialStartedAt?: string;
  trialEndsAt?: string;
  accessStatus?: string;
  companyDocument?: string;
  companyName?: string;
  companyLegalName?: string;
  companyTradeName?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  goals?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type HqPartner = {
  id: string;
  type?: string;
  referralCode?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  legalName?: string;
  tradeName?: string;
  bankName?: string;
  agency?: string;
  accountNumber?: string;
  pixKey?: string;
  pixType?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type HqCustomerRow = {
  id: string;
  company: string;
  owner: string;
  plan: string;
  status: string;
  mrr: number;
  health: string;
  logoUrl?: string;
  companyDocument?: string;
  companyLegalName?: string;
  companyName?: string;
  companyTradeName?: string;
  companyFantasyName?: string;
  companySize?: string;
  companyLegalNature?: string;
  companyStateRegistration?: string;
  companyMunicipalRegistration?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyMobile?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  billingDiscountPercent?: number;
  billingDiscountCents?: number;
  partners?: any[];
  representatives?: any[];
  activities?: any[];
  statements?: any[];
  subscriptionId?: string;
  planId?: string;
  planSlug?: string;
  planLimits?: Record<string, number | null>;
  companyUsersCount?: number;
  trialEndsAt?: string;
  currentPeriodEndsAt?: string;
  nextBillingDate?: string;
  accessStatus?: string;
};

export type HqIncompleteCustomer = {
  id: string;
  company: string;
  owner: string;
  email: string;
  phone: string;
  plan: string;
  status: string;
  reason: string;
  companyDocument?: string;
  subscriptionId?: string;
};

export type HqOverview = {
  tenants: HqCustomerRow[];
  incompleteCustomers: HqIncompleteCustomer[];
  partners: HqPartner[];
  members: Array<{ id: string; companyId: string; userId?: string; name: string; email: string; company: string; role: string; status: string }>;
  prospects: Array<{ id: string; name: string; source: string; stage: string; value: string }>;
  supportQueue: Array<{ id: string; company: string; subject: string; status: string }>;
  metrics: {
    customers: number;
    prospects: number;
    mrr: number;
    criticalCharges: number;
    users: number;
    trialCompanies: number;
    upgrades: number;
    downgrades: number;
    leads: number;
    incompleteCustomers: number;
    partners: number;
  };
};

const platformAdminEmail = 'admin@blutecnologias.com.br';
const readCachedUser = () => {
  try {
    return JSON.parse(localStorage.getItem('blu-licita:user') || 'null') as { email?: string } | null;
  } catch {
    return null;
  }
};
const currentAdminEmail = () => String(auth.currentUser?.email || readCachedUser()?.email || '').toLowerCase();
const asList = async <T,>(name: string): Promise<T[]> => {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T);
};

const normalizeStatus = (status?: string) => {
  const value = String(status || '').toUpperCase();
  if (value === 'TRIALING') return 'Teste';
  if (value === 'ACTIVE') return 'Ativo';
  if (['PAST_DUE', 'GRACE_PERIOD', 'PAYMENT_PENDING'].includes(value)) return 'Atenção';
  if (['SUSPENDED', 'EXPIRED', 'CANCELED'].includes(value)) return 'Bloqueado';
  return status || 'Não informado';
};

const healthFromStatus = (status?: string) => {
  const value = String(status || '').toUpperCase();
  if (value === 'ACTIVE' || value === 'TRIALING') return 'Alta';
  if (value === 'GRACE_PERIOD' || value === 'PAYMENT_PENDING' || value === 'PAST_DUE') return 'Atenção';
  if (value === 'SUSPENDED' || value === 'EXPIRED') return 'Crítica';
  return 'Sem histórico';
};

const isDeletedRecord = (value: Record<string, any> | null | undefined) => {
  if (!value) return false;
  const normalizedStatus = String(value.status || value.accessStatus || '').toUpperCase();
  return Boolean(value.deletedAt || value.deletedBy || normalizedStatus === 'DELETED');
};

export const hqService = {
  async overview(): Promise<HqOverview> {
    const email = currentAdminEmail();
    if (!email) throw new Error('Aguardando autenticação do administrador da Blu.');
    if (email !== platformAdminEmail) throw new Error('Acesso restrito ao administrador da Blu.');

    const [companies, subscriptions, plans, payments, orders, tickets, prospects, clients, memberships, platformCustomers, partners] = await Promise.all([
      asList<HqCompany>('companies'),
      asList<HqSubscription>('subscriptions'),
      asList<HqPlan>('plans'),
      asList<HqPayment>('payments'),
      asList<HqOrder>('billingOrders'),
      asList<HqTicket>('supportTickets'),
      asList<HqProspect>('prospects').catch(() => []),
      asList<HqProspect>('clients').catch(() => []),
      asList<any>('companyUsers').catch(() => []),
      asList<HqPlatformCustomer>('platformCustomers').catch(() => []),
      asList<HqPartner>('partners').catch(() => []),
    ]);

    const activeMemberships = memberships.filter((membership) => !isDeletedRecord(membership) && String(membership.status || '').toLowerCase() !== 'inactive');
    const activePlatformCustomers = platformCustomers.filter((customer) => !isDeletedRecord(customer as any));
    const plansById = new Map(plans.map((plan) => [plan.id, plan]));
    const subscriptionsByCompany = new Map(subscriptions.map((subscription) => [subscription.customerCompanyId, subscription]));
    const ownersByCompany = new Map<string, string>();
    activeMemberships.forEach((membership) => {
      if (!membership.companyId || ownersByCompany.has(membership.companyId)) return;
      ownersByCompany.set(membership.companyId, membership.name || membership.email || 'Responsável não informado');
    });

    const paidByCompany = new Map<string, number>();
    payments
      .filter((payment) => String(payment.status || '').toUpperCase() === 'PAID')
      .forEach((payment) => paidByCompany.set(String(payment.companyId || ''), (paidByCompany.get(String(payment.companyId || '')) || 0) + Number(payment.paidAmountInCents || payment.amountInCents || 0)));

    const trialCompanies = subscriptions.filter((subscription) => String(subscription.status || '').toUpperCase() === 'TRIALING').length;
    const upgrades = orders.filter((order) => String(order.type || '').toUpperCase() === 'UPGRADE').length;
    const downgrades = orders.filter((order) => String(order.type || '').toUpperCase() === 'DOWNGRADE').length;
    const leads = clients.filter((client) => client.status === 'lead').length;

    const platformCustomersByCompany = new Map(activePlatformCustomers.map((customer) => [customer.companyId || customer.id, customer]));
    const companyIds = new Set<string>([
      ...subscriptions.map((item) => String(item.customerCompanyId || '')),
      ...activeMemberships.map((item) => String(item.companyId || '')),
      ...activePlatformCustomers.map((item) => String(item.companyId || item.id || '')),
    ].filter(Boolean));
    const tenants = [...companyIds]
      .map((company) => {
        const platformCustomer = platformCustomersByCompany.get(company);
        const companyDocRaw = companies.find((item) => item.id === company) || null;
        const companyDoc = {
          ...(platformCustomer?.company || {}),
          ...(companyDocRaw || {}),
        } as Record<string, any>;
        const subscription = subscriptionsByCompany.get(company);
        const plan = subscription?.planId ? plansById.get(subscription.planId) : undefined;
        const companyMembers = activeMemberships.filter((item) => String(item.companyId || '') === company);
        const ownerMember = companyMembers.find((item) => String(item.role || '').toLowerCase().includes('propriet')) || companyMembers[0];
        const mrr = subscription?.status === 'ACTIVE' || subscription?.status === 'TRIALING'
          ? Number(plan?.priceInCents || 0)
          : 0;
        const hasLiveSource = Boolean(platformCustomer || companyMembers.length || subscription);
        if (!hasLiveSource || isDeletedRecord(companyDocRaw as any) || isDeletedRecord(platformCustomer as any)) {
          return null;
        }
        return {
          id: company,
          company: companyDoc?.nomeFantasia || companyDoc?.razaoSocial || companyDoc?.tradeName || companyDoc?.name || companyDoc?.legalName || companyDoc?.document || platformCustomer?.companyName || platformCustomer?.companyTradeName || platformCustomer?.companyLegalName || company,
          owner: ownersByCompany.get(company) || ownerMember?.name || ownerMember?.email || companyDoc?.ownerUserId || 'Responsável não informado',
          plan: plan?.name || subscription?.planId || 'Sem plano',
          status: normalizeStatus(subscription?.status || companyDoc?.accessStatus || ownerMember?.status),
          mrr,
          health: healthFromStatus(subscription?.status || companyDoc?.accessStatus || ownerMember?.status),
          logoUrl: (companyDoc as any)?.logoUrl,
          companyDocument: (companyDoc as any)?.document || platformCustomer?.companyDocument,
          companyLegalName: (companyDoc as any)?.razaoSocial || (companyDoc as any)?.legalName || (companyDoc as any)?.name || platformCustomer?.companyLegalName,
          companyName: (companyDoc as any)?.name || (companyDoc as any)?.razaoSocial || platformCustomer?.companyName,
          companyTradeName: (companyDoc as any)?.tradeName || (companyDoc as any)?.razaoSocial || platformCustomer?.companyTradeName,
          companyFantasyName: (companyDoc as any)?.nomeFantasia || platformCustomer?.companyTradeName,
          companySize: (companyDoc as any)?.porte,
          companyLegalNature: (companyDoc as any)?.naturezaJuridica,
          companyStateRegistration: (companyDoc as any)?.inscricaoEstadual,
          companyMunicipalRegistration: (companyDoc as any)?.inscricaoMunicipal,
          companyEmail: (companyDoc as any)?.email || platformCustomer?.ownerEmail,
          companyPhone: (companyDoc as any)?.phone || platformCustomer?.ownerPhone,
          companyMobile: (companyDoc as any)?.telefoneCelular || platformCustomer?.ownerPhone,
          zipCode: (companyDoc as any)?.cep,
          street: (companyDoc as any)?.logradouro,
          number: (companyDoc as any)?.numero,
          complement: (companyDoc as any)?.complemento,
          neighborhood: (companyDoc as any)?.bairro,
          city: (companyDoc as any)?.municipio,
          state: (companyDoc as any)?.uf,
          billingDiscountPercent: Number((companyDoc as any)?.billingDiscountPercent || 0),
          billingDiscountCents: Number((companyDoc as any)?.billingDiscountCents || 0),
          partners: Array.isArray((companyDoc as any)?.socios) ? (companyDoc as any).socios : Array.isArray(platformCustomer?.company?.socios) ? platformCustomer?.company?.socios : [],
          representatives: Array.isArray((companyDoc as any)?.representantes) ? (companyDoc as any).representantes : Array.isArray(platformCustomer?.company?.representantes) ? platformCustomer?.company?.representantes : [],
          activities: Array.isArray((companyDoc as any)?.atividades) ? (companyDoc as any).atividades : Array.isArray(platformCustomer?.company?.atividades) ? platformCustomer?.company?.atividades : [],
          statements: Array.isArray((companyDoc as any)?.demonstrativos) ? (companyDoc as any).demonstrativos : Array.isArray(platformCustomer?.company?.demonstrativos) ? platformCustomer?.company?.demonstrativos : [],
          subscriptionId: subscription?.id,
          planId: subscription?.planId,
          planSlug: plan?.slug,
          planLimits: plan?.limits || undefined,
          companyUsersCount: companyMembers.length,
          trialEndsAt: subscription?.trialEndsAt || platformCustomer?.trialEndsAt,
          currentPeriodEndsAt: subscription?.currentPeriodEndsAt || platformCustomer?.trialEndsAt,
          nextBillingDate: subscription?.nextBillingDate || platformCustomer?.trialEndsAt,
          accessStatus: (companyDoc as any)?.accessStatus || platformCustomer?.accessStatus,
        };
      })
      .filter((item): item is HqCustomerRow => Boolean(item))
      .sort((a, b) => a.company.localeCompare(b.company));
    const incompleteCustomers = tenants
      .filter((item) => !item.companyDocument || !item.subscriptionId || !item.companyEmail || !item.owner || item.owner === 'Responsável não informado')
      .map((item) => {
        const reasons = [
          !item.companyDocument ? 'CNPJ ausente' : '',
          !item.subscriptionId ? 'Assinatura ausente' : '',
          !item.companyEmail ? 'E-mail ausente' : '',
          !item.companyPhone && !item.companyMobile ? 'Telefone ausente' : '',
          !item.owner || item.owner === 'Responsável não informado' ? 'Responsável não informado' : '',
        ].filter(Boolean);
        return {
          id: item.id,
          company: item.company,
          owner: item.owner,
          email: item.companyEmail || '',
          phone: item.companyMobile || item.companyPhone || '',
          plan: item.plan,
          status: item.status,
          reason: reasons.join(' · '),
          companyDocument: item.companyDocument,
          subscriptionId: item.subscriptionId,
        };
      });

    const members = activeMemberships
      .map((membership) => ({
        id: membership.id,
        companyId: String(membership.companyId || ''),
        userId: String(membership.userId || ''),
        name: membership.name || membership.email || 'Usuário sem nome',
        email: membership.email || '',
        company: tenants.find((tenant) => tenant.id === membership.companyId)?.company || membership.companyId || 'Empresa não identificada',
        role: membership.role || 'Não informado',
        status: membership.status || 'active',
      }))
      .sort((a, b) => a.company.localeCompare(b.company) || a.name.localeCompare(b.name));

    const realProspects = [...prospects, ...clients.filter((client) => client.status === 'lead')]
      .map((item) => ({
        id: item.id,
        name: item.razaoSocial || item.name || [item.municipio, item.estado].filter(Boolean).join(' / ') || 'Prospect sem nome',
        source: item.source || (item.companyId ? 'Base comercial' : 'Entrada manual'),
        stage: item.status === 'lead' ? 'Lead' : 'Prospect',
        value: item.solution || 'Plano a definir',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const partnerList = partners
      .map((item) => ({
        id: item.id,
        type: item.type || 'revendedor',
        referralCode: item.referralCode || '',
        name: item.name || item.tradeName || item.companyName || 'Parceiro sem nome',
        email: item.email || '',
        phone: item.phone || '',
        companyName: item.companyName || item.tradeName || item.legalName || '',
        legalName: item.legalName || '',
        tradeName: item.tradeName || '',
        bankName: item.bankName || '',
        agency: item.agency || '',
        accountNumber: item.accountNumber || '',
        pixKey: item.pixKey || '',
        pixType: item.pixType || '',
        status: item.status || 'pending',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const companyName = new Map(tenants.map((tenant) => [tenant.id, tenant.company]));
    const supportQueue = tickets
      .filter((ticket) => ticket.status !== 'resolved')
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
      .slice(0, 10)
      .map((ticket) => ({
        id: ticket.id,
        company: companyName.get(String(ticket.companyId || '')) || ticket.companyId || 'Empresa não identificada',
        subject: ticket.subject || 'Chamado sem assunto',
        status: ticket.status || 'Aberto',
      }));

    const criticalCharges = orders.filter((order) => ['FAILED', 'EXPIRED', 'PENDING'].includes(String(order.status || '').toUpperCase())).length;

    return {
      tenants,
      members,
      prospects: realProspects,
      partners: partnerList,
      supportQueue,
      metrics: {
        customers: tenants.length,
        prospects: realProspects.length,
        mrr: tenants.reduce((sum, tenant) => sum + tenant.mrr, 0),
        criticalCharges,
        users: members.length,
        trialCompanies,
        upgrades,
        downgrades,
        leads,
        incompleteCustomers: incompleteCustomers.length,
        partners: partnerList.length,
      },
    };
  },
};
