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

const usefulScore = (overview: any) => {
  const metrics = overview?.metrics || {};
  return [
    'availableCents',
    'consolidatedCents',
    'receivableCents',
    'payableCents',
    'overdueCents',
    'incomeCents',
    'expenseCents',
    'projectedCashCents',
    'estimatedTaxesCents',
    'billingCents',
    'receivedCents',
    'contractBalanceCents',
    'activeContracts',
  ].reduce((sum, key) => sum + Math.abs(Number(metrics[key] || 0)), 0);
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
  'financialSettings',
] as const;

const cents = (item: any, ...keys: string[]) => {
  for (const key of keys) {
    const value = Number(item?.[key]);
    if (Number.isSafeInteger(value)) return Math.abs(value);
  }
  return Math.round(Math.abs(Number(item?.amount || item?.value || 0)) * 100);
};

const signedCents = (item: any, ...keys: string[]) => {
  for (const key of keys) {
    const value = Number(item?.[key]);
    if (Number.isSafeInteger(value)) return value;
  }
  return Math.round(Number(item?.amount || item?.value || 0) * 100);
};

const dateOf = (item: any) =>
  String(item.settlementDate || item.paymentDate || item.receivedAt || item.date || item.issueDate || item.dueDate || '').slice(0, 10);

const valueOf = (item: any) => cents(item, 'valueCents', 'balanceAmountCents', 'netAmountCents', 'grossAmountCents', 'originalAmountCents', 'amountCents', 'balance');

const isRealized = (item: any) => {
  const status = String(item.status || '');
  if (['paid', 'received', 'completed'].includes(status)) return true;
  return !status && Boolean(item.date) && Boolean(item.type || item.kind) && Number(item.amount || item.value || item.amountCents || item.netAmountCents || 0) !== 0;
};

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
  const legacyAccounts = data.financialSettings.flatMap((settings) =>
    (settings.bankAccounts || []).map((account: any) => ({
      ...account,
      id: account.id || `${settings.id}-${account.accountNumber || account.name || account.bankName}`,
      name: account.name || account.bankName || 'Conta bancária',
      currentBalanceCents: cents(account, 'currentBalanceCents', 'balanceCents', 'initialBalanceCents'),
      blockedBalanceCents: cents(account, 'blockedBalanceCents'),
      status: account.status || 'active',
    })),
  );
  const accounts = [...data.bankAccounts, ...legacyAccounts].filter((item) => matches(item) && item.status !== 'inactive');
  const consolidatedCents = accounts.reduce((sum, item) => sum + Number(item.currentBalanceCents || 0), 0);
  const availableCents = accounts.reduce((sum, item) => sum + Number(item.currentBalanceCents || 0) - Number(item.blockedBalanceCents || 0), 0);
  const receivables = data.accountsReceivable.filter((item) => matches(item) && !['received', 'cancelled'].includes(item.status));
  const payables = data.accountsPayable.filter((item) => matches(item) && !['paid', 'cancelled'].includes(item.status));
  const collectionsData = data.collections.filter(matches);
  const taxes = data.taxRecords.filter(matches);
  const documents = data.fiscalDocuments.filter(matches);
  const projects = data.projects.filter(matches);
  const legacyClientInvoices = data.clients.flatMap((client) =>
    (client.invoices || []).filter(Boolean).map((invoice: any, index: number) => ({
      ...invoice,
      id: `${client.id}:${invoice.id || invoice.number || invoice.date || invoice.month || index}`,
      organizationId: client.id,
      organizationName: client.razaoSocial || client.name || 'Cliente',
      contractId: invoice.contractId || '',
      contractName: invoice.contractName || invoice.solutionSelect || '',
      issueDate: invoice.date || (invoice.month ? `${invoice.month}-01` : ''),
      grossAmountCents: cents(invoice, 'grossAmountCents', 'amountCents'),
      netAmountCents: cents(invoice, 'netAmountCents', 'amountCents'),
      status: invoice.status || 'issued',
    })),
  ).filter(matches);
  const openCollections = collectionsData.filter((item) => !['received', 'cancelled'].includes(String(item.status)));
  const pendingExpenseTransactions = transactions.filter((item) => (item.kind === 'expense' || item.type === 'expense') && !isRealized(item) && !['cancelled'].includes(String(item.status)));
  const receivableCents =
    receivables.reduce((sum, item) => sum + cents(item, 'balanceAmountCents', 'balance', 'netAmountCents'), 0) +
    openCollections.reduce((sum, item) => sum + cents(item, 'balanceAmountCents', 'balance', 'originalAmountCents', 'value'), 0);
  const payableCents =
    payables.reduce((sum, item) => sum + cents(item, 'balanceAmountCents', 'balance', 'netAmountCents'), 0) +
    pendingExpenseTransactions.reduce((sum, item) => sum + cents(item, 'balanceAmountCents', 'netAmountCents', 'amountCents', 'amount'), 0);
  const overdueReceivables = receivables.filter((item) => String(item.dueDate || '') < today);
  const overduePayables = payables.filter((item) => String(item.dueDate || '') < today);
  const forecastIncome = forecast.filter((item) => item.kind === 'income').reduce((sum, item) => sum + cents(item, 'balanceAmountCents', 'netAmountCents', 'amountCents'), 0) + receivableCents;
  const forecastExpense = forecast.filter((item) => item.kind === 'expense').reduce((sum, item) => sum + cents(item, 'balanceAmountCents', 'netAmountCents', 'amountCents'), 0) + payableCents;
  const estimatedTaxes = taxes.filter((item) => inPeriod(item) && !['paid', 'cancelled'].includes(item.status)).reduce((sum, item) => sum + cents(item, 'estimatedAmountCents', 'amountCents'), 0);
  const invoices = documents.filter((item) => inPeriod(item) && !['cancelled', 'rejected'].includes(item.status));
  const billingSources = [
    ...invoices,
    ...legacyClientInvoices.filter((item) => inPeriod(item) && !['cancelled', 'rejected'].includes(String(item.status))),
    ...collectionsData.filter((item) => inPeriod(item) && !['cancelled'].includes(String(item.status))).map((item) => ({
      ...item,
      grossAmountCents: cents(item, 'originalAmountCents', 'balanceAmountCents', 'value'),
    })),
  ];
  const billingCents = billingSources.reduce((sum, item) => sum + cents(item, 'grossAmountCents', 'originalAmountCents', 'amountCents'), 0);
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
          const name = String(item[nameKey] || item.category || item.description || 'Nao classificado');
          accumulator[id] ||= { id, name, valueCents: 0 };
          accumulator[id].valueCents += valueOf(item);
          return accumulator;
        }, {}),
    )
      .sort((a: any, b: any) => b.valueCents - a.valueCents)
      .slice(0, 8);
  const receivableDueSources = [...receivables, ...openCollections].map((item) => ({
    ...item,
    valueCents: valueOf(item),
    dueDate: item.dueDate || item.expectedDate || item.date || '',
  }));
  const payableDueSources = [...payables, ...pendingExpenseTransactions].map((item) => ({
    ...item,
    valueCents: valueOf(item),
    dueDate: item.dueDate || item.expectedDate || item.date || '',
  }));
  const expenseCategorySources = expenses.map((item) => ({
    ...item,
    categoryId: item.categoryId || item.categoryName || item.category || item.description || 'unclassified',
    categoryName: item.categoryName || item.category || item.description || 'Sem categoria',
  }));
  const projectProfitability = projects.slice(0, 10).map((project) => {
    const linked = transactions.filter((item) => item.projectId === project.id || (project.contractId && item.contractId === project.contractId));
    const projectIncome = linked.filter((item) => item.kind === 'income' || item.type === 'income').reduce((sum, item) => sum + signedCents(item, 'settledAmountCents', 'netAmountCents', 'amountCents'), 0);
    const projectExpense = linked.filter((item) => item.kind === 'expense' || item.type === 'expense').reduce((sum, item) => sum + Math.abs(signedCents(item, 'settledAmountCents', 'netAmountCents', 'amountCents')), 0);
    const fallback = Number(project.realizedRevenueCents || 0) - Number(project.realizedCostCents || 0);
    return { id: project.id, name: project.name, valueCents: projectIncome || projectExpense ? projectIncome - projectExpense : fallback };
  }).filter((item) => item.valueCents !== 0);
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
      receivablesByDue: group(receivableDueSources, 'dueDate', 'dueDate'),
      payablesByDue: group(payableDueSources, 'dueDate', 'dueDate'),
      billingByOrganization: group(billingSources, 'organizationId', 'organizationName'),
      billingByContract: group(billingSources, 'contractId', 'contractName'),
      expensesByCategory: group(expenseCategorySources, 'categoryId', 'categoryName', 'expense'),
      projectProfitability,
    },
    alerts,
    options: {
      projects: data.projects.map((item) => ({ id: item.id, name: item.name })),
      costCenters: data.costCenters.map((item) => ({ id: item.id, name: item.name })),
      accounts: accounts.map((item) => ({ id: item.id, name: item.name })),
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
      const firestoreData = await buildOverview(filters, user.companyId);
      try {
        const response = await httpsCallable(functions, 'getFinancialOverview')(filters);
        const functionData = response.data;
        setData(usefulScore(functionData) > usefulScore(firestoreData) ? functionData : firestoreData);
      } catch {
        setData(firestoreData);
      }
      setError('');
    } catch (error: any) {
      setData((current: any) => current || empty);
      setError(error.message || 'Nao foi possivel carregar a visao financeira.');
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
