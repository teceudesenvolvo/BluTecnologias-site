import { httpsCallable } from 'firebase/functions';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db, functions } from '../../services/firebase';

export type AccountingRequest = { id: string; companyId: string; subject?: string; documentName?: string; competence: string; dueDate: string; notes?: string; status: 'open' | 'analysis' | 'waiting_company' | 'waiting_accountant' | 'answered' | 'completed' | 'cancelled'; priority?: string; createdAt: string };
export type AccountingObligation = { id: string; companyId: string; type: string; description: string; competence: string; amountCents: number; dueDate: string; status: string; createdAt: string };
export type AccountingPendingItem = { id: string; companyId: string; title: string; description?: string; competence: string; priority: string; dueDate?: string; status: string; createdAt: string };
export type AccountingClosing = { id: string; companyId: string; competence: string; status: string; checklist?: Array<{ description: string; status: string }>; updatedAt: string };
export type AccountingPayable = { id: string; companyId: string; description: string; supplierName?: string; category?: string; origin?: string; grossAmountCents?: number; netAmountCents?: number; dueDate: string; competence: string; status: string; accountingObligationId?: string };
export type AccountingOverview = { company: { id: string; name: string; document: string }; competence: string; metrics: { revenueCents: number; expenseCents: number; resultCents: number; issuedInvoices: number; receivedInvoices: number; pending: number; requests: number; upcomingObligations: number }; closing: AccountingClosing | null };

const execute = <T>(payload: Record<string, unknown>) => httpsCallable<Record<string, unknown>, T>(functions, 'accountantWorkspace')(payload).then((result) => result.data);
const unavailable = (reason: any) => ['functions/internal', 'functions/not-found', 'functions/unavailable', 'internal', 'not-found', 'unavailable'].some((code) => String(reason?.code || reason?.message || '').toLowerCase().includes(code));
const compatible = async <T>(remote: () => Promise<T>, fallback: () => Promise<T>) => {
  try { return await remote(); } catch (reason) { if (!unavailable(reason)) throw reason; return fallback(); }
};
const fallbackOverview = (companyId: string, competence: string): AccountingOverview => ({ company: { id: companyId, name: 'Empresa atual', document: '' }, competence, metrics: { revenueCents: 0, expenseCents: 0, resultCents: 0, issuedInvoices: 0, receivedInvoices: 0, pending: 0, requests: 0, upcomingObligations: 0 }, closing: null });
const fallbackList = async <T>(collectionName: string, companyId: string) => {
  const snapshot = await getDocs(query(collection(db, collectionName), where('companyId', '==', companyId))).catch(() => ({ docs: [] as any[] }));
  return snapshot.docs.map((item: any) => ({ id: item.id, ...item.data() } as T));
};

export const accountingWorkspaceService = {
  overview: (companyId: string, competence: string) => compatible(() => execute<AccountingOverview>({ action: 'overview', companyId, competence }), async () => fallbackOverview(companyId, competence)),
  listRequests: (companyId: string) => compatible(() => execute<{items: AccountingRequest[]}>({ action: 'list_requests', companyId }).then((result) => result.items), () => fallbackList<AccountingRequest>('accountingDocumentRequests', companyId)),
  listObligations: (companyId: string) => compatible(() => execute<{items: AccountingObligation[]}>({ action: 'list_obligations', companyId }).then((result) => result.items), () => Promise.resolve([])),
  listPending: (companyId: string) => compatible(() => execute<{items: AccountingPendingItem[]}>({ action: 'list_pending', companyId }).then((result) => result.items), () => Promise.resolve([])),
  listClosings: (companyId: string) => compatible(() => execute<{items: AccountingClosing[]}>({ action: 'list_closings', companyId }).then((result) => result.items), () => Promise.resolve([])),
  requestDocument: (companyId: string, value: { documentName: string; competence: string; dueDate: string; notes: string }) =>
    compatible(() => execute<{item: AccountingRequest}>({ action: 'create_request', companyId, data: { ...value, subject: value.documentName, status: 'open', priority: 'normal' } }), async () => { const createdAt = new Date().toISOString(); const payload = { ...value, companyId, status: 'open' as const, priority: 'normal', createdBy: auth.currentUser?.uid || '', createdAt, updatedAt: createdAt }; const ref = await addDoc(collection(db, 'accountingDocumentRequests'), payload); return { item: { id: ref.id, ...payload } }; }),
  saveClosing: (companyId: string, value: Partial<AccountingClosing> & { competence: string }) => execute<{item: AccountingClosing}>({ action: 'save_closing', companyId, data: value }),
  listPayables: (companyId: string) => execute<{items: AccountingPayable[]}>({action: 'list_payables', companyId}).then((result) => result.items),
  createTaxObligation: (companyId: string, value: {taxType:string;description:string;competence:string;amountCents:number;dueDate:string;beneficiary?:string;documentId?:string;barcode?:string;pixCode?:string;addToPayables:boolean}) => execute<{obligation:AccountingObligation;payable:AccountingPayable|null}>({action:'create_tax_obligation',companyId,data:value,idempotencyKey:crypto.randomUUID()}),
  syncTaxPayable: (companyId: string, payableId: string, value: {status?:string;dueDate?:string}) => execute({action:'sync_tax_payable',companyId,payableId,...value}),
};
