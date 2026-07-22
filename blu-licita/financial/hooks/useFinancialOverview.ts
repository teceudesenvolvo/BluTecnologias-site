import React from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../services/firebase';
import { useBluAuth } from '../../contexts/BluAuthContext';

const initial = {
  from: new Date().toISOString().slice(0, 8) + '01',
  to: new Date().toISOString().slice(0, 10),
  projectId: '',
  contractId: '',
  organizationId: '',
  costCenterId: '',
  bankAccountId: '',
};

const empty = {
  metrics: { activeContracts: 0 },
  charts: {
    monthly: [],
    receivablesByDue: [],
    payablesByDue: [],
    billingByOrganization: [],
    billingByContract: [],
    expensesByCategory: [],
    projectProfitability: [],
  },
  alerts: [],
  options: { projects: [], contracts: [], organizations: [], costCenters: [], accounts: [] },
};

const collections = [
  'bankAccounts',
  'financialTransactions',
  'accountsReceivable',
  'accountsPayable',
  'collections',
  'taxRecords',
  'fiscalDocuments',
  'projects',
  'clients',
  'budgets',
  'costCenters',
  'bankStatementItems',
] as const;

const cents = (item: any, ...keys: string[]) => {
  for (const key of keys) {
    const value = Number(item?.[key]);
    if (Number.isSafeInteger(value)) return Math.abs(value);
  }
  return Math.round(Math.abs(Number(item?.amount || item?.value || 0)) * 100);
};

const dateOf = (item: any) =>
  String(item.settlementDate || item.paymentDate || item.receivedAt || item.date || item.issueDate || item.dueDate || '').slice(0, 10);

const isRealized = (item: any) => ['paid', 'received', 'completed'].includes(String(item.status));

const list = async (name: string, companyId: string) => {
  try {
    const snapshot = await getDocs(query(collection(db, name), where('companyId', '==', companyId)));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  } catch {
    return [];
  }
};

const buildOverview = async (filters: typeof initial, companyId: string) => {
  const entries = await Promise.all(collections.map(async (name) => [name, await list(name, companyId)] as const));
  const data = Object.fromEntries(entries) as Record<(typeof collections)[number], any[]>;
  const today = new Date().toISOString().slice(0, 10);
  const filterValues = {
    projectId: filters.projectId,
    contractId: filters.contractId,
    organizationId: filters.organizationId,
    costCenterId: filters.costCenterId,
    bankAccountId: filters.bankAccountId,
  };
  const matches = (item: any) => Object.entries(filterValues).every(([key, value]) => !value || String(item[key] || '') === value);
  const inPeriod = (item: any) => {
    const date = dateOf(item);
    return date >= filters.from && date <= filters.to;
  };
  const transactions = data.financialTransactions.filter(
    (item) => matches(item) && item.dreImpact !== false && !['transferIn', 'transferOut', 'balanceAdjustment'].includes(item.kind),
  );
  const periodTransactions = transactions.filter(inPeriod);
  const realized = periodTransactions.filter(isRealized);
  const forecast = periodTransactions.filter((item) => !['cancelled', 'paid', 'received', 'completed'].includes(String(item.status)));
  const income = realized.filter((item) => item.kind === 'income' || item.type === 'income');
  const expenses = realized.filter((item) => item.kind === 'expense' || item.type === 'expense');
  const incomeCents = income.reduce((sum, item) => sum + cents(item, 'netAmountCents', 'amountCents'), 0);
  const expenseCents = expenses.reduce((sum, item) => sum + cents(item, 'netAmountCents', 'amountCents'), 0);
  const accounts = data.bankAccounts.filter((item) => matches(item) && item.status !== 'inactive');
  const consolidatedCents = accounts.reduce((sum, item) => sum + Number(item.currentBalanceCents || 0), 0);
  const availableCents = accounts.reduce((sum, item) => sum + Number(item.currentBalanceCents || 0) - Number(item.blockedBalanceCents || 0), 0);
  const receivables = data.accountsReceivable.filter((item) => matches(item) && !['received', 'cancelled'].includes(item.status));
  const payables = data.accountsPayable.filter((item) => matches(item) && !['paid', 'cancelled'].includes(item.status));
  const collectionsData = data.collections.filter(matches);
  const taxes = data.taxRecords.filter(matches);
  const documents = data.fiscalDocuments.filter(matches);
  const projects = data.projects.filter(matches);
  const receivableCents = receivables.reduce((sum, item) => sum + cents(item, 'balanceAmountCents', 'balance', 'netAmountCents'), 0);
  const payableCents = payables.reduce((sum, item) => sum + cents(item, 'balanceAmountCents', 'balance', 'netAmountCents'), 0);
  const overdueReceivables = receivables.filter((item) => String(item.dueDate || '') < today);
  const overduePayables = payables.filter((item) => String(item.dueDate || '') < today);
  const forecastIncome = forecast.filter((item) => item.kind === 'income').reduce((sum, item) => sum + cents(item, 'balanceAmountCents', 'netAmountCents', 'amountCents'), 0) + receivableCents;
  const forecastExpense = forecast.filter((item) => item.kind === 'expense').reduce((sum, item) => sum + cents(item, 'balanceAmountCents', 'netAmountCents', 'amountCents'), 0) + payableCents;
  const estimatedTaxes = taxes.filter((item) => inPeriod(item) && !['paid', 'cancelled'].includes(item.status)).reduce((sum, item) => sum + cents(item, 'estimatedAmountCents', 'amountCents'), 0);
  const invoices = documents.filter((item) => inPeriod(item) && !['cancelled', 'rejected'].includes(item.status));
  const billingCents = invoices.reduce((sum, item) => sum + cents(item, 'grossAmountCents'), 0);
  const receivedCents = collectionsData.filter(inPeriod).reduce((sum, item) => sum + cents(item, 'receivedAmountCents'), 0);
  const contracts = data.clients
    .flatMap((client) => (client.contracts || []).map((contract: any) => ({ ...contract, clientId: client.id, organizationName: client.razaoSocial || client.name })))
    .filter(matches);
  const activeContracts = contracts.filter((item) => !['closed', 'cancelled', 'completed'].includes(String(item.status)));
  const contractedCents =
    activeContracts.reduce((sum, item) => sum + cents(item, 'valueCents'), 0) ||
    activeContracts.reduce((sum, item) => sum + Math.round(Number(item.value || 0) * 100), 0);
  const contractReceived = collectionsData.filter((item) => item.contractId).reduce((sum, item) => sum + cents(item, 'receivedAmountCents'), 0);
  const monthKeys = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(`${filters.to}T12:00:00`);
    date.setMonth(date.getMonth() - 5 + index);
    return date.toISOString().slice(0, 7);
  });
  const monthly = monthKeys.map((month) => {
    const items = transactions.filter((item) => dateOf(item).startsWith(month));
    const incomeValue = items
      .filter((item) => (item.kind === 'income' || item.type === 'income') && isRealized(item))
      .reduce((sum, item) => sum + cents(item, 'netAmountCents', 'amountCents'), 0);
    const expenseValue = items
      .filter((item) => (item.kind === 'expense' || item.type === 'expense') && isRealized(item))
      .reduce((sum, item) => sum + cents(item, 'netAmountCents', 'amountCents'), 0);
    const forecastValue = items
      .filter((item) => !isRealized(item) && item.status !== 'cancelled')
      .reduce((sum, item) => sum + (item.kind === 'income' ? 1 : -1) * cents(item, 'netAmountCents', 'amountCents'), 0);
    return { month, incomeCents: incomeValue, expenseCents: expenseValue, resultCents: incomeValue - expenseValue, forecastCents: forecastValue };
  });
  const group = (items: any[], key: string, nameKey: string, kind?: string) =>
    Object.values(
      items
        .filter((item) => !kind || item.kind === kind)
        .reduce((accumulator: any, item) => {
          const id = String(item[key] || 'unclassified');
          const name = String(item[nameKey] || 'Nao classificado');
          accumulator[id] ||= { id, name, valueCents: 0 };
          accumulator[id].valueCents += cents(item, 'netAmountCents', 'amountCents');
          return accumulator;
        }, {}),
    )
      .sort((a: any, b: any) => b.valueCents - a.valueCents)
      .slice(0, 8);
  const unreconciled = data.bankStatementItems.filter((item) => matches(item) && ['unreconciled', 'partiallyReconciled', 'divergent'].includes(item.status));
  const overBudget = projects.filter((item) => Number(item.budgetCents || 0) > 0 && Number(item.realizedCostCents || 0) > Number(item.budgetCents || 0));
  const taxSoon = taxes.filter((item) => !['paid', 'cancelled'].includes(item.status) && String(item.dueDate || '') >= today && String(item.dueDate || '') <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const notesWithoutCollection = invoices.filter((item) => !item.collectionId);
  const alerts = [
    { id: 'overdueCollections', label: 'Cobrancas vencidas', count: collectionsData.filter((item) => item.status === 'overdue' || (item.dueDate < today && !['received', 'cancelled'].includes(item.status))).length, valueCents: collectionsData.filter((item) => item.dueDate < today && !['received', 'cancelled'].includes(item.status)).reduce((sum, item) => sum + cents(item, 'balanceAmountCents'), 0), route: '/admin/financeiro/cobrancas', severity: 'danger' },
    { id: 'overduePayables', label: 'Contas a pagar vencidas', count: overduePayables.length, valueCents: overduePayables.reduce((sum, item) => sum + cents(item, 'balanceAmountCents', 'balance'), 0), route: '/admin/financeiro', severity: 'danger' },
    { id: 'insufficientBalance', label: 'Saldo disponivel insuficiente', count: availableCents < payableCents ? 1 : 0, valueCents: Math.max(0, payableCents - availableCents), route: '/admin/financeiro/contas-bancarias', severity: 'warning' },
    { id: 'taxSoon', label: 'Tributos proximos do vencimento', count: taxSoon.length, valueCents: taxSoon.reduce((sum, item) => sum + cents(item, 'estimatedAmountCents', 'amountCents'), 0), route: '/admin/financeiro/gestao-tributaria', severity: 'warning' },
    { id: 'invoiceWithoutCollection', label: 'Notas sem cobranca', count: notesWithoutCollection.length, valueCents: notesWithoutCollection.reduce((sum, item) => sum + cents(item, 'netAmountCents'), 0), route: '/admin/financeiro/notas-fiscais', severity: 'info' },
    { id: 'unreconciled', label: 'Lancamentos nao conciliados', count: unreconciled.length, valueCents: unreconciled.reduce((sum, item) => sum + Math.abs(Number(item.amountCents || 0) - Number(item.matchedAmountCents || 0)), 0), route: '/admin/financeiro/conciliacao', severity: 'warning' },
    { id: 'pendingContracts', label: 'Contratos com valores pendentes', count: activeContracts.length, valueCents: Math.max(0, contractedCents - contractReceived), route: '/admin/contratos', severity: 'info' },
    { id: 'overBudgetProjects', label: 'Projetos acima do orcamento', count: overBudget.length, valueCents: overBudget.reduce((sum, item) => sum + Number(item.realizedCostCents || 0) - Number(item.budgetCents || 0), 0), route: '/admin/financeiro/projetos', severity: 'danger' },
  ];
  return {
    period: { from: filters.from, to: filters.to },
    metrics: {
      availableCents,
      consolidatedCents,
      receivableCents,
      payableCents,
      overdueCents:
        overdueReceivables.reduce((sum, item) => sum + cents(item, 'balanceAmountCents', 'balance'), 0) +
        overduePayables.reduce((sum, item) => sum + cents(item, 'balanceAmountCents', 'balance'), 0),
      incomeCents,
      expenseCents,
      resultCents: incomeCents - expenseCents,
      projectedCashCents: consolidatedCents + forecastIncome - forecastExpense,
      estimatedTaxesCents: estimatedTaxes,
      billingCents,
      receivedCents,
      marginCents: incomeCents - expenseCents,
      activeContracts: activeContracts.length,
      contractBalanceCents: Math.max(0, contractedCents - contractReceived),
    },
    charts: {
      monthly,
      receivablesByDue: group(receivables, 'dueDate', 'dueDate'),
      payablesByDue: group(payables, 'dueDate', 'dueDate'),
      billingByOrganization: group(invoices, 'organizationId', 'organizationName'),
      billingByContract: group(invoices, 'contractId', 'contractName'),
      expensesByCategory: group(expenses, 'categoryId', 'categoryName', 'expense'),
      projectProfitability: projects.slice(0, 10).map((project) => ({ id: project.id, name: project.name, valueCents: Number(project.realizedRevenueCents || 0) - Number(project.realizedCostCents || 0) })),
    },
    alerts,
    options: {
      projects: data.projects.map((item) => ({ id: item.id, name: item.name })),
      costCenters: data.costCenters.map((item) => ({ id: item.id, name: item.name })),
      accounts: data.bankAccounts.map((item) => ({ id: item.id, name: item.name })),
      contracts: [...new Map(contracts.map((item) => [item.id, { id: item.id, name: item.title || item.name }])).values()],
      organizations: [...new Map(data.clients.map((item) => [item.id, { id: item.id, name: item.razaoSocial || item.name }])).values()],
    },
    updatedAt: new Date().toISOString(),
    source: 'firestore-fallback',
  };
};

export const useFinancialOverview = () => {
  const { user } = useBluAuth();
  const [filters, setFilters] = React.useState(initial);
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const reload = React.useCallback(async () => {
    if (!user?.companyId) {
      setData(empty);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await httpsCallable(functions, 'getFinancialOverview')(filters);
      setData(response.data);
      setError('');
    } catch (error: any) {
      try {
        setData(await buildOverview(filters, user.companyId));
        setError('');
      } catch (fallbackError: any) {
        setData((current: any) => current || empty);
        setError(fallbackError.message || error.message || 'Nao foi possivel carregar a visao financeira.');
      }
    } finally {
      setLoading(false);
    }
  }, [filters, user?.companyId]);
  React.useEffect(() => {
    const timer = setTimeout(reload, 250);
    return () => clearTimeout(timer);
  }, [reload]);
  return { data, filters, setFilters, loading, error, reload };
};
