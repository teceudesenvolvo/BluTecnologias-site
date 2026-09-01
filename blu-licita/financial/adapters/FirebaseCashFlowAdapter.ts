import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../services/firebase';
import type { CashFlowAuxiliary, CashFlowInput, CashFlowTransaction } from '../domain/cashFlowTypes';
import type { CashFlowContext, CashFlowRepository } from '../repositories/cashFlowRepository';

const docs = async <T,>(name: string, companyId: string) => {
  const snapshot = await getDocs(query(collection(db, name), where('companyId', '==', companyId)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as T));
};

const normalize = (value: any): CashFlowTransaction => {
  const gross = value.grossAmountCents ?? Math.round(Number(value.amount || 0) * 100);
  const net = value.netAmountCents ?? gross;
  const completed = ['paid', 'received'].includes(value.status);
  const settled = completed ? net : (value.settledAmountCents ?? 0);
  const balance = completed ? 0 : (value.balanceAmountCents ?? Math.max(0, net - settled));
  const due = value.dueDate || value.date || '';
  const status = balance > 0 && due && due < new Date().toISOString().slice(0, 10) && ['forecast', 'pending'].includes(value.status)
    ? 'overdue'
    : (value.status || (value.type === 'income' ? 'received' : 'paid'));
  return { ...value, kind: value.kind || (value.type === 'income' ? 'income' : 'expense'), issueDate: value.issueDate || value.date || '', dueDate: due, competence: value.competence || String(value.date || '').slice(0, 7), grossAmountCents: gross, interestCents: value.interestCents || 0, fineCents: value.fineCents || 0, discountCents: value.discountCents || 0, netAmountCents: net, settledAmountCents: settled, balanceAmountCents: balance, status, attachmentUrls: value.attachmentUrls || [], createdAt: value.createdAt || value.date || '', updatedAt: value.updatedAt || value.date || '', createdBy: value.createdBy || value.userId || '', updatedBy: value.updatedBy || value.userId || '', version: value.version || 1 } as CashFlowTransaction;
};

export class FirebaseCashFlowAdapter implements CashFlowRepository {
  async list(context: CashFlowContext) { return (await docs<any>('financialTransactions', context.companyId)).map(normalize).sort((a, b) => b.dueDate.localeCompare(a.dueDate)); }
  async auxiliary(context: CashFlowContext): Promise<CashFlowAuxiliary> {
    const [accounts, projects, centers, categories, clients, allocations, collections] = await Promise.all([
      docs<any>('bankAccounts', context.companyId), docs<any>('projects', context.companyId), docs<any>('costCenters', context.companyId), docs<any>('financialCategories', context.companyId), docs<any>('clients', context.companyId), docs<any>('financialAllocations', context.companyId), docs<any>('collections', context.companyId),
    ]);
    return { accounts, projects, centers, categories, clients, allocations, collections } as CashFlowAuxiliary;
  }
  async create(_context: CashFlowContext, value: CashFlowInput) { const result = await httpsCallable(functions, 'createCashFlowTransaction')(value); return String((result.data as any).id); }
  async settle(_context: CashFlowContext, id: string, amountCents: number, date: string, bankAccountId: string) { await httpsCallable(functions, 'settleCashFlowTransaction')({ id, amountCents, date, bankAccountId, idempotencyKey: crypto.randomUUID() }); }
  async command(_context: CashFlowContext, id: string, action: 'cancel' | 'reverse' | 'renegotiate' | 'duplicate', reason: string) { await httpsCallable(functions, 'commandCashFlowTransaction')({ id, action, reason, idempotencyKey: crypto.randomUUID() }); }
  async importRows(_context: CashFlowContext, rows: CashFlowInput[]) { await httpsCallable(functions, 'importCashFlowTransactions')({ rows }); }
  async allocate(_context: CashFlowContext, transactionId: string, parts: Array<{ costCenterId: string; percentageBasisPoints: number }>) { await httpsCallable(functions, 'allocateFinancialTransaction')({ transactionId, allocations: parts }); }
}
