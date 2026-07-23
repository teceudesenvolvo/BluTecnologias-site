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

export type HqCustomerRow = {
  id: string;
  company: string;
  owner: string;
  plan: string;
  status: string;
  mrr: number;
  health: string;
};

export type HqOverview = {
  tenants: HqCustomerRow[];
  prospects: Array<{ id: string; name: string; source: string; stage: string; value: string }>;
  supportQueue: Array<{ id: string; company: string; subject: string; status: string }>;
  metrics: {
    customers: number;
    prospects: number;
    mrr: number;
    criticalCharges: number;
  };
};

const platformAdminEmail = 'admin@blutecnologias.com.br';
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

export const hqService = {
  async overview(): Promise<HqOverview> {
    const email = auth.currentUser?.email?.toLowerCase();
    if (email !== platformAdminEmail) throw new Error('Acesso restrito ao administrador da Blu.');

    const [companies, subscriptions, plans, payments, orders, tickets, prospects, clients, memberships] = await Promise.all([
      asList<HqCompany>('companies'),
      asList<HqSubscription>('subscriptions'),
      asList<HqPlan>('plans'),
      asList<HqPayment>('payments'),
      asList<HqOrder>('billingOrders'),
      asList<HqTicket>('supportTickets'),
      asList<HqProspect>('prospects').catch(() => []),
      asList<HqProspect>('clients').catch(() => []),
      asList<any>('companyUsers').catch(() => []),
    ]);

    const plansById = new Map(plans.map((plan) => [plan.id, plan]));
    const subscriptionsByCompany = new Map(subscriptions.map((subscription) => [subscription.customerCompanyId, subscription]));
    const ownersByCompany = new Map<string, string>();
    memberships.forEach((membership) => {
      if (!membership.companyId || ownersByCompany.has(membership.companyId)) return;
      ownersByCompany.set(membership.companyId, membership.name || membership.email || 'Responsável não informado');
    });

    const paidByCompany = new Map<string, number>();
    payments
      .filter((payment) => String(payment.status || '').toUpperCase() === 'PAID')
      .forEach((payment) => paidByCompany.set(String(payment.companyId || ''), (paidByCompany.get(String(payment.companyId || '')) || 0) + Number(payment.paidAmountInCents || payment.amountInCents || 0)));

    const tenants = companies
      .map((company) => {
        const subscription = subscriptionsByCompany.get(company.id);
        const plan = subscription?.planId ? plansById.get(subscription.planId) : undefined;
        const mrr = subscription?.status === 'ACTIVE' || subscription?.status === 'TRIALING'
          ? Number(plan?.priceInCents || 0)
          : 0;
        return {
          id: company.id,
          company: company.tradeName || company.name || company.legalName || company.document || company.id,
          owner: ownersByCompany.get(company.id) || company.ownerUserId || 'Responsável não informado',
          plan: plan?.name || subscription?.planId || 'Sem plano',
          status: normalizeStatus(subscription?.status || company.accessStatus),
          mrr,
          health: healthFromStatus(subscription?.status || company.accessStatus),
        };
      })
      .sort((a, b) => a.company.localeCompare(b.company));

    const realProspects = [...prospects, ...clients.filter((client) => client.status === 'lead')]
      .map((item) => ({
        id: item.id,
        name: item.razaoSocial || item.name || [item.municipio, item.estado].filter(Boolean).join(' / ') || 'Prospect sem nome',
        source: item.source || (item.companyId ? 'Base comercial' : 'Entrada manual'),
        stage: item.status === 'lead' ? 'Lead' : 'Prospect',
        value: item.solution || 'Plano a definir',
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
      prospects: realProspects,
      supportQueue,
      metrics: {
        customers: tenants.length,
        prospects: realProspects.length,
        mrr: tenants.reduce((sum, tenant) => sum + tenant.mrr, 0),
        criticalCharges,
      },
    };
  },
};
