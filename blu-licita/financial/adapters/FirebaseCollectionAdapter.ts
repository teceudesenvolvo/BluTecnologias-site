import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../services/firebase';
import type { CollectionAuxiliary, CollectionEvent, CollectionInput, FinancialCollection } from '../domain/collectionTypes';
import type { CollectionContext, CollectionRepository } from '../repositories/collectionRepository';

// Adapter único para cobranças atuais e registros legados dos clientes.

const list = async <T,>(name: string, companyId: string) => {
  const snapshot = await getDocs(query(collection(db, name), where('companyId', '==', companyId)));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as T));
};

const legacy = (clients: any[], companyId: string): FinancialCollection[] => clients.flatMap(client =>
  (client.cobrancas || []).filter(Boolean).map((billing: any, index: number) => {
    const original = Math.round(Number(billing.value || 0) * 100);
    const received = billing.status === 'received' ? original : 0;
    const due = String(billing.dueDate || billing.date || new Date().toISOString()).slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    return {
      id: `legacy:${client.id}:${billing.id || index}`, companyId,
      number: String(billing.number || billing.id || `LEG-${index + 1}`),
      description: billing.title || 'Cobrança enviada', organizationId: client.id,
      organizationName: client.razaoSocial || client.name || 'Cliente', contractName: billing.solutionSelect || '',
      invoiceNumber: billing.invoiceNumber || '', issueDate: String(billing.date || due).slice(0, 10), dueDate: due,
      originalAmountCents: original, discountCents: 0, interestCents: 0, fineCents: 0,
      receivedAmountCents: received, balanceAmountCents: original - received, paymentMethodName: billing.paymentMethod || '',
      responsibleName: billing.userName || '', notes: billing.notes || '', attachmentUrls: billing.attachmentUrl ? [billing.attachmentUrl] : [],
      status: billing.status === 'received' ? 'received' : due < today ? 'overdue' : 'sent', originType: 'legacyClient', originId: client.id,
      createdAt: billing.date || new Date().toISOString(), updatedAt: billing.receivedAt || billing.date || new Date().toISOString(),
      createdBy: billing.userId || '', updatedBy: billing.userId || '', version: 1, legacyClientId: client.id, legacyBillingId: String(billing.id || index),
    } as FinancialCollection;
  })
);

export class FirebaseCollectionAdapter implements CollectionRepository {
  async list(context: CollectionContext) {
    const [current, clients] = await Promise.all([list<FinancialCollection>('collections', context.companyId), list<any>('clients', context.companyId)]);
    return [...current, ...legacy(clients, context.companyId)].sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  }
  events(context: CollectionContext) { return list<CollectionEvent>('collectionEvents', context.companyId); }
  async auxiliary(context: CollectionContext): Promise<CollectionAuxiliary> {
    const [clients, contracts, projects, centers, accounts, methods] = await Promise.all(['clients', 'contracts', 'projects', 'costCenters', 'bankAccounts', 'financialConfigurationItems'].map(name => list<any>(name, context.companyId)));
    return { clients, contracts, projects, centers, accounts, paymentMethods: methods.filter(item => item.section === 'paymentMethods') };
  }
  async save(_context: CollectionContext, value: CollectionInput, id?: string) { const result = await httpsCallable(functions, 'mutateCollection')({ action: id ? 'update' : 'create', id, value, idempotencyKey: crypto.randomUUID() }); return String((result.data as any).id); }
  async receive(_context: CollectionContext, id: string, amountCents: number, date: string, bankAccountId: string, authorizationReason?: string) {
    if (id.startsWith('legacy:')) {
      const [, clientId, billingId] = id.split(':');
      const reference = doc(db, 'clients', clientId);
      const snapshot = await getDoc(reference);
      if (!snapshot.exists()) throw new Error('Cliente da cobrança não encontrado.');
      const now = new Date().toISOString();
      const billings = (snapshot.data().cobrancas || []).filter(Boolean).map((billing: any, index: number) =>
        String(billing.id || index) === billingId
          ? { ...billing, status: 'received', receivedAt: date || now, receivedAmountCents: amountCents, bankAccountId, authorizationReason, updatedAt: now }
          : billing,
      );
      await updateDoc(reference, { cobrancas: billings, updatedAt: now });
      return;
    }
    await httpsCallable(functions, 'receiveCollection')({ id, amountCents, date, bankAccountId, authorizationReason, idempotencyKey: crypto.randomUUID() });
  }
  async event(_context: CollectionContext, id: string, type: CollectionEvent['type'], description: string, extra?: Record<string, unknown>) { await httpsCallable(functions, 'addCollectionEvent')({ id, type, description, ...extra }); }
  async command(_context: CollectionContext, id: string, action: 'send' | 'renegotiate' | 'cancel' | 'secondCopy', reason?: string) { await httpsCallable(functions, 'commandCollection')({ id, action, reason, idempotencyKey: crypto.randomUUID() }); }
}
