import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { opportunityFavoritesService } from '../services/opportunityFavoritesService';
import type { DashboardData, Deadline, RecommendedOpportunity } from '../types';
import type { DashboardRepository } from './DashboardRepository';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const pct = (value: number) => `${Number.isFinite(value) ? value.toFixed(0) : '0'}%`;
const today = () => new Date().toISOString().slice(0, 10);
const monthKey = (offset = 0) => {
  const date = new Date();
  date.setMonth(date.getMonth() + offset);
  return date.toISOString().slice(0, 7);
};
const monthLabel = (key: string) => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
};
const toDate = (value?: string) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`) : null;
const daysBetween = (value?: string) => {
  const date = toDate(value);
  if (!date) return 9999;
  const base = toDate(today())!;
  return Math.ceil((date.getTime() - base.getTime()) / 86400000);
};
const toCurrency = (value: number) => brl.format(value || 0);
const fromCents = (value: unknown) => Math.round(Number(value || 0)) / 100;
const moneyValue = (item: any, ...keys: string[]) => {
  for (const key of keys) {
    const raw = item?.[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    if (key.toLowerCase().includes('cents')) return value / 100;
    return value;
  }
  return 0;
};
const compact = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `${brl.format(value / 1_000_000).replace('R$', 'R$ ')} mi`;
  if (Math.abs(value) >= 1_000) return `${brl.format(value / 1_000).replace('R$', 'R$ ')} mil`;
  return toCurrency(value);
};
const list = async <T,>(name: string, companyId: string): Promise<T[]> => {
  const snap = await getDocs(query(collection(db, name), where('companyId', '==', companyId)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() } as T));
};
const safeList = async <T,>(name: string, companyId: string): Promise<T[]> => {
  try {
    return await list<T>(name, companyId);
  } catch {
    return [];
  }
};
const latestDocuments = (documents: any[]) => {
  const byReference = new Map<string, any>();
  documents.filter(Boolean).forEach((item) => {
    const key = `${String(item.company || item.companyName || '').toLowerCase()}::${String(item.type || item.name || '').toLowerCase()}`;
    const current = byReference.get(key);
    if (!current || String(item.issueDate || item.createdAt || '') > String(current.issueDate || current.createdAt || '')) byReference.set(key, item);
  });
  return [...byReference.values()];
};

export class FirebaseDashboardRepository implements DashboardRepository {
  async getSummary(companyId: string): Promise<DashboardData> {
    if (!companyId) throw new Error('Empresa não identificada.');
    const [
      clients,
      transactions,
      documents,
      collections,
      fiscalDocuments,
      projects,
      externalOpportunities,
      favoriteOpportunities,
    ] = await Promise.all([
      safeList<any>('clients', companyId),
      safeList<any>('financialTransactions', companyId),
      safeList<any>('companyDocuments', companyId),
      safeList<any>('collections', companyId),
      safeList<any>('fiscalDocuments', companyId),
      safeList<any>('projects', companyId),
      safeList<any>('externalOpportunities', companyId),
      opportunityFavoritesService.listItems(companyId).catch(() => []),
    ]);

    const currentMonth = monthKey();
    const currentYear = today().slice(0, 4);
    const allContracts = clients.flatMap((client) => (client.contracts || []).filter(Boolean).map((contract: any, index: number) => ({
      ...contract,
      id: contract.id || `${client.id}-${index}`,
      organizationName: client.razaoSocial || client.name || 'Cliente',
      organizationState: client.state || client.uf || '',
    })));
    const activeContracts = allContracts.filter((item) => !['closed', 'cancelled', 'completed'].includes(String(item.status || 'active')));
    const contractTotal = activeContracts.reduce((sum, item) => sum + moneyValue(item, 'value', 'amount'), 0);
    const largestContract = activeContracts.reduce((largest, item) => Math.max(largest, moneyValue(item, 'value', 'amount')), 0);
    const expiringThisMonth = activeContracts.filter((item) => String(item.endDate || '').slice(0, 7) === currentMonth);

    const legacyCollections = clients.flatMap((client) => (client.cobrancas || []).filter(Boolean).map((billing: any, index: number) => {
      const amount = moneyValue(billing, 'value', 'amount');
      const dueDate = String(billing.dueDate || billing.date || today()).slice(0, 10);
      const received = billing.status === 'received';
      return {
        id: `legacy:${client.id}:${billing.id || index}`,
        organizationName: client.razaoSocial || client.name || 'Cliente',
        description: billing.title || 'Cobrança',
        invoiceNumber: billing.invoiceNumber || billing.title || billing.id || `COB-${index + 1}`,
        dueDate,
        issueDate: String(billing.date || dueDate).slice(0, 10),
        original: amount,
        received: received ? amount : moneyValue(billing, 'receivedAmount'),
        balance: received ? 0 : amount,
        status: received ? 'received' : dueDate < today() ? 'overdue' : 'sent',
      };
    }));
    const modernCollections = collections.filter(Boolean).map((item: any) => ({
      id: item.id,
      organizationName: item.organizationName || 'Cliente',
      description: item.description || item.number || 'Cobrança',
      invoiceNumber: item.invoiceNumber || item.number || item.id,
      dueDate: String(item.dueDate || item.issueDate || today()).slice(0, 10),
      issueDate: String(item.issueDate || item.dueDate || today()).slice(0, 10),
      original: moneyValue(item, 'originalAmountCents', 'netAmountCents', 'value'),
      received: moneyValue(item, 'receivedAmountCents', 'receivedAmount'),
      balance: moneyValue(item, 'balanceAmountCents', 'balance'),
      status: item.status || 'sent',
    }));
    const receivables = [...legacyCollections, ...modernCollections];
    const openReceivables = receivables.filter((item) => !['received', 'cancelled'].includes(String(item.status)));
    const overdueReceivables = openReceivables.filter((item) => item.dueDate < today());
    const receivableThisMonth = openReceivables.filter((item) => item.dueDate.slice(0, 7) === currentMonth);
    const receivedThisMonth = receivables.filter((item) => item.status === 'received' && String(item.issueDate || item.dueDate).slice(0, 7) === currentMonth);

    const incomeTransactions = transactions.filter((item) => item.type === 'income' || item.kind === 'income');
    const expenseTransactions = transactions.filter((item) => item.type === 'expense' || item.kind === 'expense');
    const yearIncome = incomeTransactions.filter((item) => String(item.date || item.paymentDate || '').slice(0, 4) === currentYear).reduce((sum, item) => sum + moneyValue(item, 'amountCents', 'netAmountCents', 'amount'), 0);
    const monthIncome = incomeTransactions.filter((item) => String(item.date || item.paymentDate || '').slice(0, 7) === currentMonth).reduce((sum, item) => sum + moneyValue(item, 'amountCents', 'netAmountCents', 'amount'), 0) + receivedThisMonth.reduce((sum, item) => sum + item.received, 0);
    const monthExpenses = expenseTransactions.filter((item) => String(item.date || item.paymentDate || '').slice(0, 7) === currentMonth).reduce((sum, item) => sum + moneyValue(item, 'amountCents', 'netAmountCents', 'amount'), 0);
    const margin = monthIncome ? ((monthIncome - monthExpenses) / monthIncome) * 100 : 0;

    const opportunityMap = new Map<string, any>();
    [...favoriteOpportunities, ...externalOpportunities].filter(Boolean).forEach((item: any) => {
      const key = `${item.source || 'source'}:${item.externalId || item.id}`;
      opportunityMap.set(key, item);
    });
    const opportunities = [...opportunityMap.values()];
    const opportunityPipeline = opportunities.reduce((sum, item) => sum + Number(item.estimatedValue || item.valorEstimado || item.value || 0), 0);

    const currentDocuments = latestDocuments(documents);
    const expiringDocs = currentDocuments.filter((item) => {
      const days = daysBetween(item.expiryDate);
      return days >= 0 && days <= 15;
    });
    const expiredDocs = currentDocuments.filter((item) => daysBetween(item.expiryDate) < 0);

    const months = Array.from({ length: 6 }, (_, index) => monthKey(index - 5));
    const cashFlow = months.map((month) => {
      const expected = openReceivables.filter((item) => item.dueDate.slice(0, 7) === month).reduce((sum, item) => sum + item.balance, 0);
      const received = receivables.filter((item) => item.status === 'received' && String(item.issueDate || item.dueDate).slice(0, 7) === month).reduce((sum, item) => sum + item.received, 0) +
        incomeTransactions.filter((item) => String(item.date || '').slice(0, 7) === month).reduce((sum, item) => sum + moneyValue(item, 'amountCents', 'netAmountCents', 'amount'), 0);
      const overdue = openReceivables.filter((item) => item.dueDate.slice(0, 7) === month && item.dueDate < today()).reduce((sum, item) => sum + item.balance, 0);
      return { month: monthLabel(month), expected: Math.round(expected / 1000), received: Math.round(received / 1000), overdue: Math.round(overdue / 1000) };
    });

    const receivableCards = openReceivables
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5)
      .map((item) => {
        const diff = daysBetween(item.dueDate);
        return {
          agency: item.organizationName,
          invoice: item.invoiceNumber || item.description,
          amount: toCurrency(item.balance),
          due: diff < 0 ? `${Math.abs(diff)} dias em atraso` : diff === 0 ? 'Hoje' : dateLabel(item.dueDate),
          status: diff < 0 ? 'Vencido' as const : diff <= 7 ? 'Previsto' as const : 'Em dia' as const,
        };
      });

    const stateCounts = clients.reduce((map, client) => {
      const state = String(client.state || client.uf || '').toUpperCase();
      if (state) map.set(state, (map.get(state) || 0) + 1);
      return map;
    }, new Map<string, number>());
    const topState = [...stateCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const wins = allContracts.length;
    const winRate = opportunities.length ? (wins / Math.max(wins + opportunities.length, 1)) * 100 : (wins ? 100 : 0);

    const deadlines: Deadline[] = [
      ...openReceivables.slice(0, 4).map((item) => ({ id: item.id, type: 'Cobrança', title: `${item.organizationName} · ${item.invoiceNumber || item.description}`, date: relativeDate(item.dueDate), urgency: deadlineUrgency(item.dueDate) })),
      ...expiringDocs.slice(0, 3).map((item) => ({ id: item.id, type: 'Vencimento de certidão', title: item.name, date: relativeDate(item.expiryDate), urgency: deadlineUrgency(item.expiryDate) })),
      ...opportunities.filter((item) => item.openingDate).slice(0, 3).map((item) => ({ id: item.externalId || item.id, type: 'Sessão de disputa', title: item.organizationName || item.object, date: relativeDate(item.openingDate), urgency: deadlineUrgency(item.openingDate) })),
    ].slice(0, 6) as Deadline[];

    const recommended: RecommendedOpportunity[] = opportunities.slice(0, 4).map((item, index) => ({
      id: item.externalId || item.id || String(index),
      agency: item.organizationName || 'Órgão público',
      object: item.object || 'Objeto não informado',
      location: [item.city || item.municipio, item.state || item.uf].filter(Boolean).join(', ') || 'Brasil',
      value: item.estimatedValue ? toCurrency(Number(item.estimatedValue)) : 'Valor não informado',
      sessionDate: item.openingDate ? dateLabel(item.openingDate) : 'Sem data',
      compatibility: Number(item.compatibility || item.score || Math.max(65, 96 - index * 6)),
    }));

    const alerts = [
      overdueReceivables.length ? { title: 'Cobranças em atraso', detail: `${overdueReceivables.length} cobrança(s) somam ${toCurrency(overdueReceivables.reduce((sum, item) => sum + item.balance, 0))}.`, tone: 'rose' as const } : null,
      expiredDocs.length ? { title: 'Certidões vencidas', detail: `${expiredDocs.length} certidão(ões) precisam de atualização antes de novas participações.`, tone: 'amber' as const } : null,
      expiringThisMonth.length ? { title: 'Contratos vencendo este mês', detail: `${expiringThisMonth.length} contrato(s) exigem atenção da equipe comercial.`, tone: 'amber' as const } : null,
      opportunities.length ? { title: 'Oportunidades no radar', detail: `${opportunities.length} processo(s) salvos ou capturados para análise.`, tone: 'blue' as const } : null,
    ].filter(Boolean) as DashboardData['alerts'];

    return {
      metrics: [
        { label: 'Receber este mês', value: toCurrency(receivableThisMonth.reduce((sum, item) => sum + item.balance, 0)), change: `${toCurrency(overdueReceivables.reduce((sum, item) => sum + item.balance, 0))} em atraso`, tone: overdueReceivables.length ? 'rose' : 'blue' },
        { label: 'Contratos ativos', value: String(activeContracts.length), change: `${compact(contractTotal)} contratados`, tone: 'emerald' },
        { label: 'Oportunidades compatíveis', value: String(opportunities.length), change: `${opportunities.filter((item) => Number(item.compatibility || item.score || 0) >= 80).length} com alta prioridade`, tone: 'blue' },
        { label: 'Cobranças pendentes', value: String(openReceivables.length), change: `${overdueReceivables.length} vencida(s)`, tone: overdueReceivables.length ? 'rose' : 'emerald' },
        { label: 'Fluxo de caixa projetado', value: toCurrency(openReceivables.reduce((sum, item) => sum + item.balance, 0) - monthExpenses), change: 'Recebíveis abertos menos despesas do mês', tone: 'emerald' },
        { label: 'Margem média', value: pct(margin), change: `${toCurrency(monthIncome - monthExpenses)} no mês`, tone: margin < 0 ? 'rose' : 'emerald' },
        { label: 'Ordens pendentes', value: String(projects.filter((item: any) => !['completed', 'cancelled'].includes(String(item.status))).length), change: 'Projetos/ordens em aberto', tone: 'amber' },
        { label: 'Certidões vencendo', value: String(expiringDocs.length), change: 'Próximos 15 dias', tone: expiringDocs.length ? 'amber' : 'emerald' },
      ],
      deadlines,
      opportunities: recommended,
      cashFlow,
      receivables: receivableCards,
      contractSummary: {
        active: activeContracts.length,
        expiring: expiringThisMonth.length,
        total: compact(contractTotal),
        balance: compact(Math.max(contractTotal - yearIncome, 0)),
        largest: compact(largestContract),
      },
      commercial: {
        winRate: pct(winRate),
        activePipeline: compact(opportunityPipeline),
        annualSales: compact(yearIncome),
        topState: topState ? `${topState[0]} · ${Math.round((topState[1] / Math.max(clients.length, 1)) * 100)}%` : 'Sem dados',
      },
      alerts: alerts.length ? alerts : [{ title: 'Operação sem alertas críticos', detail: 'Nenhuma cobrança vencida, contrato crítico ou certidão próxima do vencimento foi encontrada.', tone: 'blue' }],
    };
  }
}

const dateLabel = (value?: string) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') : '—';
const relativeDate = (value?: string) => {
  const days = daysBetween(value);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  if (days < 0) return `${Math.abs(days)} dias atrás`;
  return dateLabel(value);
};
const deadlineUrgency = (value?: string): Deadline['urgency'] => {
  const days = daysBetween(value);
  if (days <= 0) return 'today';
  if (days <= 7) return 'soon';
  return 'normal';
};
