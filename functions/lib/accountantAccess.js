"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountantWorkspace = exports.acceptCompanyInvitation = exports.manageCompanyMembership = exports.linkAccountantToCompanies = exports.findGlobalProfessional = exports.listManagedCompanies = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const crypto_1 = require("crypto");
const accountantPolicy_1 = require("./accountantPolicy");
const accountingSyncPolicy_1 = require("./accountingSyncPolicy");
const db = () => admin.firestore();
const emailOf = (value) => String(value || '').trim().toLowerCase();
const emailKey = (email) => (0, crypto_1.createHash)('sha256').update(email).digest('hex').slice(0, 24);
async function authorizeCompanyAction(userId, companyId, module, action) {
    if (!companyId)
        throw new functions.https.HttpsError('invalid-argument', 'Empresa não informada.');
    const [company, membership, legacy] = await Promise.all([
        db().collection('companies').doc(companyId).get(),
        db().collection('companyMemberships').doc(`${companyId}_${userId}`).get(),
        db().collection('companyUsers').doc(`${companyId}_${userId}`).get(),
    ]);
    const companyData = company.data() || {};
    const legacyOwner = companyId === userId || companyId === `company-${userId}`;
    if (!company.exists && !legacyOwner)
        throw new functions.https.HttpsError('not-found', 'Empresa não encontrada.');
    const owner = legacyOwner || companyData.ownerUserId === userId || companyData.createdBy === userId;
    if (owner)
        return { company: companyData, membership: { role: 'Proprietário' } };
    const access = membership.exists ? membership.data() || {} : legacy.data() || {};
    if (!membership.exists && !legacy.exists || access.status && access.status !== 'active') {
        throw new functions.https.HttpsError('permission-denied', 'Você não possui vínculo ativo com esta empresa.');
    }
    if (!(0, accountantPolicy_1.isCompanyActionAllowed)(access, module, action)) {
        throw new functions.https.HttpsError('permission-denied', `A permissão ${module}.${action} não foi concedida nesta empresa.`);
    }
    return { company: companyData, membership: access };
}
const serializable = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
const cents = (value) => Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;
async function assertCompanyAdmin(userId, companyId) {
    const [company, membership, legacy] = await Promise.all([
        db().collection('companies').doc(companyId).get(),
        db().collection('companyMemberships').doc(`${companyId}_${userId}`).get(),
        db().collection('companyUsers').doc(`${companyId}_${userId}`).get(),
    ]);
    const companyData = company.data() || {};
    const access = membership.data() || legacy.data() || {};
    const role = String(access.role || '').toLowerCase();
    if (!company.exists || !(companyData.ownerUserId === userId || companyData.createdBy === userId || role.includes('administr') || role.includes('propriet') || access.permissions?.team?.manage === true)) {
        throw new functions.https.HttpsError('permission-denied', 'Você não administra esta empresa.');
    }
    return companyData;
}
exports.listManagedCompanies = functions.https.onCall(async (_payload, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Faça login para continuar.');
    const uid = context.auth.uid;
    const [owned, memberships, legacy] = await Promise.all([
        db().collection('companies').where('ownerUserId', '==', uid).get(),
        db().collection('companyMemberships').where('userId', '==', uid).get(),
        db().collection('companyUsers').where('userId', '==', uid).get(),
    ]);
    const ids = new Set(owned.docs.map((item) => item.id));
    [...memberships.docs.filter((item) => item.data().status === 'active'), ...legacy.docs].forEach((item) => {
        const value = item.data();
        const role = String(value.role || '').toLowerCase();
        if (role.includes('administr') || role.includes('propriet') || value.permissions?.team?.manage === true)
            ids.add(String(value.companyId));
    });
    const companies = await Promise.all([...ids].map((id) => db().collection('companies').doc(id).get()));
    return { companies: companies.filter((item) => item.exists).map((item) => { const value = item.data() || {}; return { id: item.id, name: String(value.tradeName || value.name || value.legalName || 'Empresa'), document: String(value.document || value.cnpj || ''), accountId: String(value.accountId || value.ownerCompanyId || '') }; }) };
});
exports.findGlobalProfessional = functions.https.onCall(async (payload, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Faça login para continuar.');
    const email = emailOf(payload?.email);
    if (!email)
        throw new functions.https.HttpsError('invalid-argument', 'Informe o e-mail.');
    try {
        const user = await admin.auth().getUserByEmail(email);
        const profile = await db().collection('users').doc(user.uid).get();
        const value = profile.data() || {};
        return { exists: true, identity: { userId: user.uid, name: user.displayName || value.name || '', email, phone: value.phone || user.phoneNumber || '', cpf: value.cpf || '', crc: value.crc || '', crcState: value.crcState || '', crcNumber: value.crcNumber || '' } };
    }
    catch (error) {
        if (error?.code === 'auth/user-not-found')
            return { exists: false };
        throw error;
    }
});
exports.linkAccountantToCompanies = functions.https.onCall(async (payload, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Faça login para continuar.');
    const identity = payload?.identity || {};
    const email = emailOf(identity.email);
    const links = Array.isArray(payload?.links) ? payload.links : [];
    if (!email || !identity.name || !links.length)
        throw new functions.https.HttpsError('invalid-argument', 'Identificação e ao menos uma empresa são obrigatórias.');
    for (const link of links)
        await assertCompanyAdmin(context.auth.uid, String(link.companyId || ''));
    let authUser = null;
    try {
        authUser = await admin.auth().getUserByEmail(email);
    }
    catch (error) {
        if (error?.code !== 'auth/user-not-found')
            throw error;
    }
    const now = new Date().toISOString();
    const batch = db().batch();
    if (authUser)
        batch.set(db().collection('users').doc(authUser.uid), { ...identity, email, userType: 'accountant', updatedAt: now }, { merge: true });
    for (const link of links) {
        const companyId = String(link.companyId);
        const company = await db().collection('companies').doc(companyId).get();
        const companyValue = company.data() || {};
        const memberKey = authUser?.uid || `pending_${emailKey(email)}`;
        const membershipId = `${companyId}_${memberKey}`;
        const value = { id: membershipId, userId: authUser?.uid || null, inviteeEmail: email, companyId, companyName: String(companyValue.tradeName || companyValue.name || companyValue.legalName || 'Empresa'), companyDocument: String(companyValue.document || companyValue.cnpj || ''), accountId: String(companyValue.accountId || companyValue.ownerCompanyId || ''), role: 'Contador', status: authUser ? 'active' : 'pending', permissions: link.permissions || {}, externalProfessional: true, createdBy: context.auth.uid, createdAt: now, updatedAt: now };
        batch.set(db().collection('companyMemberships').doc(membershipId), value, { merge: true });
        batch.set(db().collection('teamMembers').doc(`${companyId}_${emailKey(email)}`), { ...value, name: identity.name, email, phone: identity.phone || '' }, { merge: true });
        if (authUser)
            batch.set(db().collection('companyUsers').doc(`${companyId}_${authUser.uid}`), { companyId, userId: authUser.uid, role: 'Contador', status: 'active', permissions: link.permissions || {}, updatedAt: now, createdAt: now }, { merge: true });
        batch.set(db().collection('auditLogs').doc(), { companyId, userId: authUser?.uid || null, action: 'accountant_access_granted', actorId: context.auth.uid, after: value, createdAt: now });
    }
    if (!authUser) {
        const invitationId = `accountant_${emailKey(email)}`;
        batch.set(db().collection('teamInvitations').doc(invitationId), { email, name: identity.name, role: 'Contador', userType: 'accountant', companyIds: links.map((item) => String(item.companyId)), status: 'pending', createdBy: context.auth.uid, createdAt: now, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() }, { merge: true });
        const origin = String(context.rawRequest.headers.origin || 'https://blutecnologias.com.br');
        const inviteUrl = `${origin}/#/admin/cadastro-membro?token=${invitationId}&email=${encodeURIComponent(email)}`;
        batch.set(db().collection('mail_queue').doc(), { to: [email], userId: context.auth.uid, companyIds: links.map((item) => String(item.companyId)), notifyCompanyAdmin: true, message: { subject: 'Acesso contábil à Blu', text: `Olá ${identity.name}, você recebeu acesso contábil a ${links.length} empresa(s). Crie sua conta única em ${inviteUrl}`, html: `<p>Olá <strong>${identity.name}</strong>,</p><p>Você recebeu acesso contábil a ${links.length} empresa(s) na Blu.</p><p><a href="${inviteUrl}">Criar minha conta única</a></p>` }, createdAt: now });
    }
    await batch.commit();
    return { existingUser: Boolean(authUser), memberships: links.length };
});
exports.manageCompanyMembership = functions.https.onCall(async (payload, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Faça login para continuar.');
    const membershipId = String(payload?.membershipId || '');
    const ref = db().collection('companyMemberships').doc(membershipId);
    const snapshot = await ref.get();
    if (!snapshot.exists)
        throw new functions.https.HttpsError('not-found', 'Vínculo não encontrado.');
    const before = snapshot.data() || {};
    await assertCompanyAdmin(context.auth.uid, String(before.companyId));
    const status = String(payload?.status || before.status);
    if (!['active', 'suspended', 'revoked'].includes(status))
        throw new functions.https.HttpsError('invalid-argument', 'Status inválido.');
    const updatedAt = new Date().toISOString();
    const after = { ...before, status, ...(payload?.permissions ? { permissions: payload.permissions } : {}), updatedAt, updatedBy: context.auth.uid };
    const batch = db().batch();
    batch.set(ref, after, { merge: false });
    if (before.userId)
        batch.set(db().collection('companyUsers').doc(`${before.companyId}_${before.userId}`), { status, ...(payload?.permissions ? { permissions: payload.permissions } : {}), updatedAt }, { merge: true });
    batch.set(db().collection('auditLogs').doc(), { companyId: before.companyId, userId: before.userId || null, action: 'membership_changed', actorId: context.auth.uid, before, after, createdAt: updatedAt });
    await batch.commit();
    return { id: membershipId, status };
});
exports.acceptCompanyInvitation = functions.https.onCall(async (payload, context) => {
    if (!context.auth?.token.email)
        throw new functions.https.HttpsError('unauthenticated', 'Faça login com o e-mail convidado.');
    const email = emailOf(context.auth.token.email);
    const invitationId = String(payload?.invitationId || '');
    const invitation = await db().collection('teamInvitations').doc(invitationId).get();
    if (!invitation.exists || emailOf(invitation.data()?.email) !== email || invitation.data()?.status !== 'pending')
        throw new functions.https.HttpsError('permission-denied', 'Convite inválido para este e-mail.');
    const pending = await db().collection('companyMemberships').where('inviteeEmail', '==', email).get();
    const now = new Date().toISOString();
    const batch = db().batch();
    const pendingMemberships = pending.docs.filter((item) => item.data().status === 'pending');
    pendingMemberships.forEach((item) => {
        const value = item.data();
        const newId = `${value.companyId}_${context.auth.uid}`;
        const active = { ...value, id: newId, userId: context.auth.uid, status: 'active', acceptedAt: now, updatedAt: now };
        batch.set(db().collection('companyMemberships').doc(newId), active, { merge: true });
        batch.delete(item.ref);
        batch.set(db().collection('companyUsers').doc(newId), { companyId: value.companyId, userId: context.auth.uid, role: value.role || 'Contador', status: 'active', permissions: value.permissions || {}, invitationId, createdAt: value.createdAt || now, updatedAt: now }, { merge: true });
    });
    batch.set(invitation.ref, { status: 'accepted', acceptedBy: context.auth.uid, acceptedAt: now }, { merge: true });
    await batch.commit();
    return { memberships: pendingMemberships.length };
});
/**
 * Fachada segura do módulo contábil. Nenhuma operação aceita um companyId sem
 * validar o vínculo contextual e a permissão da ação no backend.
 */
exports.accountantWorkspace = functions.https.onCall(async (payload, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Faça login para continuar.');
    const userId = context.auth.uid;
    const companyId = String(payload?.companyId || '');
    const action = String(payload?.action || 'overview');
    const now = new Date().toISOString();
    if (action === 'overview') {
        const { company } = await authorizeCompanyAction(userId, companyId, 'accounting', 'view');
        const [transactions, documents, obligations, closings, pending, requests] = await Promise.all([
            db().collection('financialTransactions').where('companyId', '==', companyId).get(),
            db().collection('fiscalDocuments').where('companyId', '==', companyId).get(),
            db().collection('accountingObligations').where('companyId', '==', companyId).get(),
            db().collection('accountingClosings').where('companyId', '==', companyId).get(),
            db().collection('accountingPendingItems').where('companyId', '==', companyId).get(),
            db().collection('accountingRequests').where('companyId', '==', companyId).get(),
        ]);
        const competence = String(payload?.competence || now.slice(0, 7));
        const inCompetence = (value) => String(value.competence || value.dueDate || value.issueDate || value.date || '').startsWith(competence);
        const tx = transactions.docs.map((item) => item.data()).filter(inCompetence);
        const revenueCents = tx.filter((item) => ['income', 'revenue', 'receivable'].includes(String(item.type || item.direction))).reduce((sum, item) => sum + cents(item.amountCents || item.amount), 0);
        const expenseCents = tx.filter((item) => ['expense', 'payable'].includes(String(item.type || item.direction))).reduce((sum, item) => sum + cents(item.amountCents || item.amount), 0);
        const closing = closings.docs.map((item) => ({ id: item.id, ...item.data() })).find((item) => item.competence === competence) || null;
        return {
            company: { id: companyId, name: company.tradeName || company.name || company.legalName || 'Empresa', document: company.document || company.cnpj || '' },
            competence,
            metrics: { revenueCents, expenseCents, resultCents: revenueCents - expenseCents, issuedInvoices: documents.docs.filter((item) => inCompetence(item.data()) && String(item.data().direction || '').toLowerCase() !== 'input').length, receivedInvoices: documents.docs.filter((item) => inCompetence(item.data()) && String(item.data().direction || '').toLowerCase() === 'input').length, pending: pending.docs.filter((item) => !['resolved', 'cancelled'].includes(String(item.data().status))).length, requests: requests.docs.filter((item) => !['completed', 'cancelled'].includes(String(item.data().status))).length, upcomingObligations: obligations.docs.filter((item) => !['paid', 'cancelled'].includes(String(item.data().status))).length },
            closing,
        };
    }
    const listMap = {
        list_obligations: { collection: 'accountingObligations', module: 'accountingObligations' },
        list_closings: { collection: 'accountingClosings', module: 'accountingClosing' },
        list_pending: { collection: 'accountingPendingItems', module: 'accountingPending' },
        list_requests: { collection: 'accountingRequests', module: 'accountingRequests' },
    };
    if (listMap[action]) {
        await authorizeCompanyAction(userId, companyId, listMap[action].module, 'view');
        const snapshot = await db().collection(listMap[action].collection).where('companyId', '==', companyId).get();
        return { items: serializable(snapshot).sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))) };
    }
    const createMap = {
        create_obligation: { collection: 'accountingObligations', module: 'accountingObligations', auditAction: 'accounting_obligation_created' },
        create_pending: { collection: 'accountingPendingItems', module: 'accountingPending', auditAction: 'accounting_pending_created' },
        create_request: { collection: 'accountingRequests', module: 'accountingRequests', auditAction: 'accounting_request_created' },
    };
    if (createMap[action]) {
        const config = createMap[action];
        await authorizeCompanyAction(userId, companyId, config.module, 'create');
        const ref = db().collection(config.collection).doc();
        const value = { ...(payload?.data || {}), id: ref.id, companyId, createdBy: userId, createdAt: now, updatedAt: now };
        const batch = db().batch();
        batch.set(ref, value);
        batch.set(db().collection('auditLogs').doc(), { companyId, userId, action: config.auditAction, entity: config.collection, entityId: ref.id, metadata: { source: 'accountant_workspace' }, createdAt: now });
        await batch.commit();
        return { item: value };
    }
    if (action === 'save_closing') {
        await authorizeCompanyAction(userId, companyId, 'accountingClosing', 'edit');
        const competence = String(payload?.data?.competence || '');
        if (!/^\d{4}-\d{2}$/.test(competence))
            throw new functions.https.HttpsError('invalid-argument', 'Competência inválida.');
        const ref = db().collection('accountingClosings').doc(`${companyId}_${competence}`);
        const before = await ref.get();
        const value = { ...(before.data() || {}), ...(payload?.data || {}), companyId, competence, updatedBy: userId, updatedAt: now, ...(!before.exists ? { createdBy: userId, createdAt: now } : {}) };
        const batch = db().batch();
        batch.set(ref, value, { merge: true });
        batch.set(db().collection('auditLogs').doc(), { companyId, userId, action: value.status === 'closed' ? 'accounting_competence_closed' : 'accounting_closing_updated', entity: 'accountingClosings', entityId: ref.id, metadata: { competence, before: before.data() || null, after: value }, createdAt: now });
        await batch.commit();
        return { item: { id: ref.id, ...value } };
    }
    if (action === 'create_tax_obligation') {
        await authorizeCompanyAction(userId, companyId, 'accountingObligations', 'create');
        const data = payload?.data || {};
        const amountCents = cents(data.amountCents);
        const competence = String(data.competence || '');
        const dueDate = String(data.dueDate || '');
        if (!String(data.taxType || '').trim() || !/^\d{4}-\d{2}$/.test(competence) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || amountCents <= 0)
            throw new functions.https.HttpsError('invalid-argument', 'Tributo, competência, valor e vencimento são obrigatórios.');
        const idempotencyKey = String(payload?.idempotencyKey || '');
        if (!idempotencyKey)
            throw new functions.https.HttpsError('invalid-argument', 'Chave de idempotência obrigatória.');
        const guardRef = db().collection('idempotencyKeys').doc(`accounting_${companyId}_${idempotencyKey}`);
        const obligationRef = db().collection('accountingObligations').doc();
        const payableRef = data.addToPayables === false ? null : db().collection('accountsPayable').doc();
        const result = await db().runTransaction(async (transaction) => {
            const existingGuard = await transaction.get(guardRef);
            if (existingGuard.exists)
                return existingGuard.data()?.result;
            const obligation = { id: obligationRef.id, companyId, organizationId: String(data.organizationId || ''), type: 'tax', taxType: String(data.taxType), description: String(data.description || `${data.taxType} · ${competence}`), competence, amountCents, dueDate, status: payableRef ? 'awaiting_payment' : 'guide_available', guideDocumentId: String(data.documentId || ''), barcode: String(data.barcode || ''), pixCode: String(data.pixCode || ''), accountsPayableId: payableRef?.id || null, createdAt: now, updatedAt: now, createdBy: userId, updatedBy: userId };
            transaction.set(obligationRef, obligation);
            let payable = null;
            if (payableRef) {
                payable = { id: payableRef.id, companyId, organizationId: String(data.organizationId || ''), description: obligation.description, supplierName: String(data.beneficiary || 'Fisco'), supplierDocument: '', issueDate: now.slice(0, 10), dueDate, expectedDate: dueDate, competence, grossAmount: amountCents / 100, grossAmountCents: amountCents, discounts: 0, interest: 0, fine: 0, withholdings: 0, netAmount: amountCents / 100, netAmountCents: amountCents, paidAmount: 0, paidAmountCents: 0, balance: amountCents / 100, balanceAmountCents: amountCents, status: 'pending', category: 'Tributos', origin: 'Tributário', originType: 'accountingObligation', originId: obligationRef.id, accountingObligationId: obligationRef.id, documentId: String(data.documentId || ''), barcode: obligation.barcode, pixCode: obligation.pixCode, createdAt: now, updatedAt: now, createdBy: userId, updatedBy: userId };
                transaction.set(payableRef, payable);
            }
            const alertRef = db().collection('accountingAlerts').doc(`obligation_${obligationRef.id}`);
            transaction.set(alertRef, { companyId, organizationId: obligation.organizationId, type: 'tax_due', entityType: 'accountingObligation', entityId: obligationRef.id, title: `${obligation.taxType} de ${competence} vence em ${dueDate}`, dueDate, status: 'active', createdAt: now });
            transaction.set(db().collection('auditLogs').doc(), { companyId, userId, action: 'accounting_obligation_created', entity: 'accountingObligations', entityId: obligationRef.id, metadata: { accountsPayableId: payableRef?.id || null, amountCents, competence, dueDate }, createdAt: now });
            const response = { obligation, payable };
            transaction.set(guardRef, { companyId, action, idempotencyKey, result: response, createdAt: now });
            return response;
        });
        return result;
    }
    if (action === 'sync_tax_payable') {
        await authorizeCompanyAction(userId, companyId, 'financial', 'edit');
        const payableId = String(payload?.payableId || '');
        const status = String(payload?.status || '');
        const dueDate = payload?.dueDate ? String(payload.dueDate) : '';
        const payableRef = db().collection('accountsPayable').doc(payableId);
        const payableSnapshot = await payableRef.get();
        if (!payableSnapshot.exists || payableSnapshot.data()?.companyId !== companyId)
            throw new functions.https.HttpsError('not-found', 'Conta a pagar não encontrada nesta empresa.');
        const payable = payableSnapshot.data() || {};
        const obligationId = String(payable.accountingObligationId || payable.originType === 'accountingObligation' && payable.originId || '');
        if (!obligationId)
            throw new functions.https.HttpsError('failed-precondition', 'Esta conta não possui obrigação tributária vinculada.');
        const obligationRef = db().collection('accountingObligations').doc(obligationId);
        const obligationSnapshot = await obligationRef.get();
        if (!obligationSnapshot.exists || obligationSnapshot.data()?.companyId !== companyId)
            throw new functions.https.HttpsError('not-found', 'Obrigação vinculada não encontrada.');
        const obligationStatus = (0, accountingSyncPolicy_1.obligationStatusFromPayable)(status, String(obligationSnapshot.data()?.status || 'awaiting_payment'));
        const batch = db().batch();
        batch.set(payableRef, { ...(dueDate ? { dueDate, expectedDate: dueDate } : {}), ...(status ? { status } : {}), updatedAt: now, updatedBy: userId }, { merge: true });
        batch.set(obligationRef, { status: obligationStatus, ...(dueDate ? { dueDate } : {}), updatedAt: now, updatedBy: userId }, { merge: true });
        batch.set(db().collection('accountingAlerts').doc(`obligation_${obligationId}`), { status: obligationStatus === 'paid' ? 'resolved' : 'active', updatedAt: now }, { merge: true });
        batch.set(db().collection('auditLogs').doc(), { companyId, userId, action: 'tax_payable_synchronized', entity: 'accountsPayable', entityId: payableId, metadata: { obligationId, status, obligationStatus, dueDate }, createdAt: now });
        await batch.commit();
        return { payableId, obligationId, status, obligationStatus, dueDate };
    }
    if (action === 'list_payables') {
        await authorizeCompanyAction(userId, companyId, 'financial', 'view');
        const snapshot = await db().collection('accountsPayable').where('companyId', '==', companyId).get();
        return { items: serializable(snapshot) };
    }
    throw new functions.https.HttpsError('invalid-argument', 'Ação contábil inválida.');
});
//# sourceMappingURL=accountantAccess.js.map