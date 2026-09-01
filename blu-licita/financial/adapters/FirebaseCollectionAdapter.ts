import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../../../services/firebase';
import type { CollectionAuxiliary, CollectionEvent, CollectionInput, FinancialCollection } from '../domain/collectionTypes';
import type { CollectionContext, CollectionRepository } from '../repositories/collectionRepository';

// Adapter único para cobranças atuais e registros legados dos clientes.

const list = async <T,>(name: string, companyId: string) => {
  const snapshot = await getDocs(query(collection(db, name), where('companyId', '==', companyId)));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as T));
};

const safeList = async <T,>(name: string, companyId: string) => {
  try {
    return await list<T>(name, companyId);
  } catch {
    return [] as T[];
  }
};

const candidateCompanyIds = (companyId: string) => {
  const uid = auth.currentUser?.uid || '';
  return [...new Set([companyId, uid && `company-${uid}`, uid].filter(Boolean))];
};

const legacyBankAccounts = async (companyId: string) => {
  const settingsDocs = await Promise.all(candidateCompanyIds(companyId).map(async candidateId => {
    try {
      const direct = await getDoc(doc(db, 'financialSettings', candidateId));
      if (direct.exists()) return direct.data();
      return (await getDocs(query(collection(db, 'financialSettings'), where('companyId', '==', candidateId)))).docs[0]?.data() || null;
    } catch {
      return null;
    }
  }));
  return settingsDocs.flatMap(settings =>
    (settings?.bankAccounts || []).filter(Boolean).map((account: any) => {
      const label = account.name || account.bankName || account.institution || 'Conta bancária';
      const suffix = [account.agency && `Ag ${account.agency}`, account.accountNumber && `CC ${account.accountNumber}`].filter(Boolean).join(' · ');
      return {
        ...account,
        id: account.id || `${label}-${account.agency || ''}-${account.accountNumber || ''}`,
        name: suffix ? `${label} · ${suffix}` : label,
        status: account.status || 'active',
        legacyFinancialSettings: true,
      };
    })
  );
};

const legacy = (clients: any[], companyId: string): FinancialCollection[] => clients.flatMap(client =>
  (client.cobrancas || []).filter(Boolean).map((billing: any, index: number) => {
    const original = Math.round(Number(billing.value || 0) * 100);
    const received = billing.status === 'received' ? original : 0;
    const due = String(billing.dueDate || billing.date || new Date().toISOString()).slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    return {
      id: `legacy:${client.id}:${billing.id || index}`, companyId,
      issuerCompanyId: billing.senderCompanyId || billing.issuerCompanyId || '',
      issuerCompanyName: billing.senderCompany || billing.issuerCompanyName || '',
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

const firstValue = (...values: any[]) => values.find(value => value !== undefined && value !== null && value !== '') ?? '';

// Contratos do fluxo atual são mantidos dentro do documento do cliente.
// O financeiro também aceita a coleção `contracts`, então consolidamos as duas
// origens em um formato único antes de entregar os dados aos formulários.
const embeddedClientContracts = (clients: any[]) => clients.flatMap(client =>
  (client.contracts || []).filter(Boolean).map((contract: any, index: number) => ({
    ...contract,
    id: String(firstValue(contract.id, `${client.id}-${index}`)),
    title: String(firstValue(contract.title, contract.name, contract.description, contract.object, contract.numeroContrato, contract.number, 'Contrato')),
    number: String(firstValue(contract.number, contract.numeroContrato, contract.procurementNumber, contract.numeroLicitacao)),
    clientId: client.id,
    organizationId: client.id,
    legacyClientId: client.id,
    clientName: String(firstValue(client.razaoSocial, client.name, client.nomeFantasia, 'Cliente')),
    organizationName: String(firstValue(client.razaoSocial, client.name, client.nomeFantasia, 'Cliente')),
    clientDocument: String(firstValue(client.cnpj, client.cpfCnpj, client.document)),
    organizationCnpj: String(firstValue(client.cnpj, client.cpfCnpj, client.document)),
    embeddedInClient: true,
  }))
);

const mergeContracts = (standalone: any[], embedded: any[]) => {
  const merged = new Map<string, any>();
  [...standalone, ...embedded].forEach(contract => {
    const key = String(firstValue(contract.id, contract.number, contract.title));
    const clientKey = String(firstValue(contract.clientId, contract.organizationId, contract.legacyClientId));
    const compositeKey = `${clientKey}::${key}`;
    merged.set(compositeKey, { ...(merged.get(compositeKey) || {}), ...contract });
  });
  return [...merged.values()];
};

const normalizeCollectionNumber = (value?: string) => String(value || '').replace(/^COB-/i, '').trim();

const duplicateKey = (item: FinancialCollection) =>
  [
    item.originId || item.organizationId || '',
    normalizeCollectionNumber(item.number),
    item.dueDate || '',
    item.originalAmountCents || 0,
  ].join('::');

export class FirebaseCollectionAdapter implements CollectionRepository {
  async list(context: CollectionContext) {
    const [current, clients] = await Promise.all([list<FinancialCollection>('collections', context.companyId), list<any>('clients', context.companyId)]);
    const combined = [...current, ...legacy(clients, context.companyId)];
    const groups = new Map<string, FinancialCollection[]>();
    combined.forEach((item) => {
      const key = duplicateKey(item);
      groups.set(key, [...(groups.get(key) || []), item]);
    });

    return Array.from(groups.values())
      .flatMap((group) => {
        const hasCancelledSibling = group.some((item) => item.deletedAt || item.status === 'cancelled');
        if (hasCancelledSibling) return [];

        const active = group.filter((item) => !item.deletedAt && item.status !== 'cancelled');
        if (active.length <= 1) return active;

        const currentOfficial = active.find((item) => !item.id.startsWith('legacy:') && item.originType === 'officialBilling');
        if (currentOfficial) return [currentOfficial];

        const currentRecord = active.find((item) => !item.id.startsWith('legacy:'));
        if (currentRecord) return [currentRecord];

        return [active[0]];
      })
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  }
  events(context: CollectionContext) { return list<CollectionEvent>('collectionEvents', context.companyId); }
  async auxiliary(context: CollectionContext): Promise<CollectionAuxiliary> {
    const companyIds = candidateCompanyIds(context.companyId);
    const [clients, standaloneContracts, projects, centers, accountGroups, legacyAccounts, methods] = await Promise.all([
      safeList<any>('clients', context.companyId),
      safeList<any>('contracts', context.companyId),
      safeList<any>('projects', context.companyId),
      safeList<any>('costCenters', context.companyId),
      Promise.all(companyIds.map(candidateId => safeList<any>('bankAccounts', candidateId))),
      legacyBankAccounts(context.companyId),
      safeList<any>('financialConfigurationItems', context.companyId),
    ]);
    const accounts = accountGroups.flat().map((account: any) => ({
      ...account,
      legacyFinancialSettings: false,
    }));
    const byId = new Map([...accounts, ...legacyAccounts].map((account: any) => [account.id, { status: 'active', ...account }]));
    const contracts = mergeContracts(standaloneContracts, embeddedClientContracts(clients));
    return { clients, contracts, projects, centers, accounts: [...byId.values()], paymentMethods: methods.filter(item => item.section === 'paymentMethods') };
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
  async command(_context: CollectionContext, id: string, action: 'send' | 'renegotiate' | 'cancel' | 'secondCopy' | 'delete', reason?: string) { await httpsCallable(functions, 'commandCollection')({ id, action, reason, idempotencyKey: crypto.randomUUID() }); }
}
