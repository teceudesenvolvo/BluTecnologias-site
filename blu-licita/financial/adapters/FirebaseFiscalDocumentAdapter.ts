import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../services/firebase';
import type { FiscalAuxiliary, FiscalDocument, FiscalDocumentInput } from '../domain/fiscalDocumentTypes';
import type { FiscalContext, FiscalDocumentRepository } from '../repositories/fiscalDocumentRepository';

const docs = async <T,>(name: string, companyId: string) => {
  const snapshot = await getDocs(query(collection(db, name), where('companyId', '==', companyId)));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as T));
};

const legacy = (clients: any[], companyId: string): FiscalDocument[] => clients.flatMap(client =>
  (client.invoices || []).filter(Boolean).map((invoice: any, index: number) => {
    const gross = Math.round(Number(invoice.amount || invoice.value || 0) * 100);
    const rawDate = typeof invoice.date === 'string' ? invoice.date : invoice.month ? `${invoice.month}-01` : new Date().toISOString();
    const issueDate = rawDate.slice(0, 10);
    return {
      id: `legacy:${client.id}:${invoice.id || index}`, companyId, number: String(invoice.number || invoice.id || `LEG-${index + 1}`),
      series: String(invoice.series || ''), accessKey: String(invoice.accessKey || ''), type: 'issued',
      status: invoice.status === 'cancelled' ? 'cancelled' : invoice.status === 'received' ? 'received' : 'issued',
      issuerName: invoice.issuerName || '', recipientName: client.razaoSocial || client.name || '', recipientDocument: client.cnpj || '',
      organizationId: client.id, organizationName: client.razaoSocial || client.name || '', issueDate, competence: issueDate.slice(0, 7),
      grossAmountCents: gross, discountCents: 0, taxAmountCents: 0, withholdingAmountCents: 0, netAmountCents: gross,
      description: invoice.description || 'Nota fiscal', pdfUrl: invoice.fileUrl || '', receiptUrls: [], createdAt: issueDate, updatedAt: issueDate,
      createdBy: '', updatedBy: '', version: 1, legacyClientId: client.id,
    } as FiscalDocument;
  })
);

export class FirebaseFiscalDocumentAdapter implements FiscalDocumentRepository {
  async list(context: FiscalContext) {
    const [current, clients] = await Promise.all([docs<FiscalDocument>('fiscalDocuments', context.companyId), docs<any>('clients', context.companyId)]);
    return [...current, ...legacy(clients, context.companyId)].sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  }
  async auxiliary(context: FiscalContext): Promise<FiscalAuxiliary> {
    const [clients, contracts, collections, projects, centers] = await Promise.all(['clients', 'contracts', 'collections', 'projects', 'costCenters'].map(name => docs<any>(name, context.companyId)));
    return { clients, contracts, collections, projects, centers };
  }
  async save(_context: FiscalContext, value: FiscalDocumentInput, id?: string) {
    const result = await httpsCallable(functions, 'mutateFiscalDocument')({ action: id ? 'update' : 'create', id, value, idempotencyKey: crypto.randomUUID() });
    return String((result.data as any).id);
  }
  async command(_context: FiscalContext, id: string, action: 'cancel' | 'replace' | 'send', value?: Record<string, unknown>) {
    await httpsCallable(functions, 'commandFiscalDocument')({ id, action, ...value, idempotencyKey: crypto.randomUUID() });
  }
}
