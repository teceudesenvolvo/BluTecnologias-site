"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completePublicSale = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const membership = async (uid) => {
    const result = await admin.firestore().collection('companyUsers').where('userId', '==', uid).limit(1).get();
    return result.empty ? { companyId: `company-${uid}` } : result.docs[0].data();
};
const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
exports.completePublicSale = functions.https.onCall(async (payload, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Faça login para continuar.');
    const member = await membership(context.auth.uid);
    const items = Array.isArray(payload?.items) ? payload.items.slice(0, 100) : [];
    const clientId = String(payload?.clientId || '');
    const key = String(payload?.idempotencyKey || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
    if (!clientId || !key || !items.length)
        throw new functions.https.HttpsError('invalid-argument', 'Cliente, itens e chave da operação são obrigatórios.');
    const firestore = admin.firestore();
    const saleRef = firestore.collection('pointOfSaleSales').doc();
    const marker = firestore.collection('idempotencyKeys').doc(`${member.companyId}_pdv_${key}`);
    const clientRef = firestore.collection('clients').doc(clientId);
    const productRefs = items.map((item) => firestore.collection('products').doc(String(item.productId || '')));
    const completedSaleId = await firestore.runTransaction(async (tx) => {
        const markerSnap = await tx.get(marker);
        if (markerSnap.exists)
            return String(markerSnap.data()?.entityId || '');
        const [clientSnap, ...productSnaps] = await Promise.all([tx.get(clientRef), ...productRefs.map(ref => tx.get(ref))]);
        if (!clientSnap.exists || clientSnap.data()?.companyId !== member.companyId)
            throw new functions.https.HttpsError('not-found', 'Cliente ou órgão não encontrado.');
        let gross = 0, taxes = 0;
        const now = new Date().toISOString();
        const normalized = items.map((item, index) => {
            const snap = productSnaps[index], product = snap.data();
            if (!snap.exists || product?.companyId !== member.companyId)
                throw new functions.https.HttpsError('not-found', 'Um produto não foi encontrado.');
            const quantityMilli = Number(item.quantityMilli), unitPriceCents = Number(item.unitPriceCents);
            if (!Number.isSafeInteger(quantityMilli) || quantityMilli <= 0 || !Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0)
                throw new functions.https.HttpsError('invalid-argument', 'Quantidade ou preço inválido.');
            const totalCents = Math.round(unitPriceCents * quantityMilli / 1000), taxCents = Math.round(totalCents * Number(product.taxPercent || 0) / 100);
            gross += totalCents;
            taxes += taxCents;
            if ((product.type || 'product') === 'product') {
                const current = Math.round(Number(product.stockQuantity || 0) * 1000);
                if (current < quantityMilli && !payload?.allowNegativeStock)
                    throw new functions.https.HttpsError('failed-precondition', `Estoque insuficiente para ${product.name}.`);
                tx.update(productRefs[index], { stockQuantity: (current - quantityMilli) / 1000, lastStockUpdateAt: now, updatedAt: now, updatedBy: context.auth.uid });
            }
            return { productId: snap.id, name: String(product.name || ''), barcode: String(product.barcode || ''), sku: String(product.sku || ''), quantityMilli, unit: String(product.unit || 'un'), unitPriceCents, totalCents, taxPercent: Number(product.taxPercent || 0), taxCents, ncm: String(product.ncm || ''), cfop: String(product.cfop || '') };
        });
        const discount = Number(payload?.discountCents || 0);
        if (!Number.isSafeInteger(discount) || discount < 0 || discount > gross)
            throw new functions.https.HttpsError('invalid-argument', 'O desconto informado é inválido.');
        const net = gross - discount, paid = Boolean(payload?.paid), client = clientSnap.data();
        const paymentMethod = String(payload?.paymentMethod || 'invoice');
        const cardType = paymentMethod === 'card' ? String(payload?.cardType || 'credit') : '';
        const installments = paymentMethod === 'card' && cardType === 'credit' ? Number(payload?.installments || 1) : 1;
        if (paymentMethod === 'card' && !['credit', 'debit'].includes(cardType))
            throw new functions.https.HttpsError('invalid-argument', 'Selecione crédito ou débito.');
        if (!Number.isSafeInteger(installments) || installments < 1 || installments > 12)
            throw new functions.https.HttpsError('invalid-argument', 'Quantidade de parcelas inválida.');
        const saleNumber = String(payload?.number || `PDV-${Date.now()}`), issueDate = String(payload?.issueDate || now.slice(0, 10));
        const common = { companyId: member.companyId, saleId: saleRef.id, saleNumber, clientId, clientName: String(client.razaoSocial || client.name || ''), clientDocument: String(client.cnpj || client.organizationCnpj || ''), contractId: String(payload?.contractId || ''), contractName: String(payload?.contractName || ''), grossAmountCents: gross, discountCents: discount, taxAmountCents: taxes, netAmountCents: net, paymentMethod, cardType, installments, paymentCapture: paymentMethod === 'card' ? 'pinpad_pending' : 'manual', issueDate, items: normalized, createdAt: now, updatedAt: now, createdBy: context.auth.uid, updatedBy: context.auth.uid };
        tx.set(saleRef, { ...common, status: paid ? 'completed' : 'pending', notes: String(payload?.notes || ''), fiscalRequested: Boolean(payload?.fiscalRequested), emailRequested: Boolean(payload?.sendEmail) });
        const movement = firestore.collection('financialTransactions').doc();
        tx.set(movement, { ...common, kind: 'income', description: `Venda ${saleNumber} - ${common.clientName}`, date: issueDate, dueDate: String(payload?.dueDate || issueDate), competence: issueDate.slice(0, 7), status: paid ? 'received' : 'pending', settledAmountCents: paid ? net : 0, balanceAmountCents: paid ? 0 : net, originType: 'pointOfSale', originId: saleRef.id, dreImpact: true, reconciled: false, version: 1 });
        let fiscalDocumentId = '';
        if (payload?.fiscalRequested) {
            const fiscal = firestore.collection('fiscalDocuments').doc();
            fiscalDocumentId = fiscal.id;
            tx.set(fiscal, { ...common, number: '', series: '', accessKey: '', type: normalized.every((item) => String(item.ncm || '') === '') ? 'nfse' : 'nfe', status: 'draft', issuerName: String(payload?.issuerName || ''), recipientName: common.clientName, recipientDocument: common.clientDocument, organizationId: clientId, organizationName: common.clientName, description: `Venda ${saleNumber}`, withholdingAmountCents: 0, receiptUrls: [], version: 1, fiscalProvider: 'tecnospeed_plugnotas', providerStatus: 'awaiting_configuration', providerDocumentId: '', providerProtocol: '', integrationId: `blu-pdv-${saleRef.id}`, pdfUrl: '', xmlUrl: '', notes: 'Documento preparado pelo PDV. A autorização fiscal depende da contratação e configuração do PlugNotas/TecnoSpeed.' });
            tx.update(saleRef, { fiscalDocumentId: fiscal.id });
        }
        if (payload?.sendEmail && String(client.email || client.financialContact || '')) {
            const lines = normalized.map((x) => `<tr><td>${escapeHtml(x.name)}</td><td>${x.quantityMilli / 1000} ${escapeHtml(x.unit)}</td><td>R$ ${(x.totalCents / 100).toFixed(2)}</td></tr>`).join('');
            tx.set(firestore.collection('mail_queue').doc(), { companyId: member.companyId, userId: context.auth.uid, to: String(client.financialContact || client.email), message: { subject: `Venda ${saleNumber} - Blu`, html: `<h2>Comprovante da venda ${escapeHtml(saleNumber)}</h2><p>Órgão/cliente: ${escapeHtml(common.clientName)}</p><table>${lines}</table><p><b>Total: R$ ${(net / 100).toFixed(2)}</b></p><p>Este comprovante não substitui documento fiscal.</p>`, text: `Venda ${saleNumber} - ${common.clientName} - Total R$ ${(net / 100).toFixed(2)}` }, createdAt: now });
        }
        tx.set(marker, { companyId: member.companyId, type: 'pointOfSale', entityId: saleRef.id, createdAt: now });
        tx.set(firestore.collection('financialAuditLogs').doc(), { companyId: member.companyId, action: 'completeSale', entityType: 'pointOfSale', entityId: saleRef.id, userId: context.auth.uid, createdAt: now, before: null, after: { saleNumber, gross, discount, net, fiscalDocumentId, itemCount: normalized.length } });
        return saleRef.id;
    });
    return { id: completedSaleId || saleRef.id };
});
//# sourceMappingURL=pdv.js.map